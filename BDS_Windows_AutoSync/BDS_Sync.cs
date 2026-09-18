// BDS Word -> Excel sync. Local-only, per-user Windows application.
// Build with the .NET Framework compiler using 1_SETUP.cmd.
// No network requests, Office macros, registry changes or admin rights.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using System.Xml.Linq;

namespace BdsOfficeSync {
    sealed class ComScope : IDisposable {
        readonly List<object> refs = new List<object>();
        public dynamic Keep(object o) { if (o != null && Marshal.IsComObject(o)) refs.Add(o); return o; }
        public void Dispose() {
            for (int i=refs.Count-1;i>=0;i--) try { Marshal.ReleaseComObject(refs[i]); } catch {}
            refs.Clear();
        }
    }
    sealed class TaskRow {
        public string Id, Status, Note; public int Row; public object Date;
    }
    sealed class Edit {
        public int Row, Column; public object Value;
        public Edit(int row,int column,object value) { Row=row;Column=column;Value=value; }
    }
    static class Logic {
        public const string Done="Готово", Open="Не е започнато", Prefix="[WORD]";
        public static readonly string[] Ids=Enumerable.Range(1,32).Select(i=>"T"+i.ToString("00")).ToArray();
        public static void Validate(IEnumerable<string> ids) {
            string[] a=ids.OrderBy(x=>x,StringComparer.Ordinal).ToArray();
            if (!a.SequenceEqual(Ids)) throw new InvalidOperationException("Липсващ или повторен ID. Нужни са точно T01–T32. Не е записана промяна.");
        }
        public static List<Edit> Plan(List<TaskRow> rows,Dictionary<string,bool> states,DateTime today) {
            Validate(rows.Select(r=>r.Id)); Validate(states.Keys);
            var edits=new List<Edit>();
            foreach(var r in rows) {
                bool done=states[r.Id];
                if (done) {
                    if(r.Status!=Done) edits.Add(new Edit(r.Row,5,Done));
                    if(r.Status!=Done || !(r.Date is double) || (double)r.Date<=0)
                        edits.Add(new Edit(r.Row,7,today.Date.ToOADate()));
                    if(String.IsNullOrWhiteSpace(r.Note))
                        edits.Add(new Edit(r.Row,8,Prefix+" Отметка в Word; заявено изпълнение, "+today.ToString("dd.MM.yyyy")));
                } else if(r.Status==Done) {
                    edits.Add(new Edit(r.Row,5,Open));
                    edits.Add(new Edit(r.Row,7,null));
                    if((r.Note??"").StartsWith(Prefix,StringComparison.Ordinal)) edits.Add(new Edit(r.Row,8,null));
                }
            }
            return edits;
        }
        public static string Signature(Dictionary<string,bool> states) {
            Validate(states.Keys); return String.Join("",Ids.Select(id=>states[id]?"1":"0"));
        }
        public static void UnitTest() {
            var rows=Ids.Select((id,i)=>new TaskRow{Id=id,Row=i+7,Status=Open,Note="",Date=null}).ToList();
            var s=Ids.ToDictionary(id=>id,id=>false);
            if(Plan(rows,s,DateTime.Today).Count!=0) throw new Exception("TEST empty state");
            s["T02"]=true;
            var e=Plan(rows,s,DateTime.Today);
            if(e.Count!=3 || e[0].Row!=8 || e[0].Column!=5 || (string)e[0].Value!=Done) throw new Exception("TEST checked");
            rows[1].Status=Done;rows[1].Date=DateTime.Today.AddDays(-2).ToOADate();rows[1].Note="Моя бележка";
            if(Plan(rows,s,DateTime.Today).Count!=0) throw new Exception("TEST idempotence");
            s["T02"]=false;e=Plan(rows,s,DateTime.Today);
            if(e.Count!=2 || e.Any(x=>x.Column==8)) throw new Exception("TEST preserve note on uncheck");
            rows[1].Note=Prefix+" test";
            if(Plan(rows,s,DateTime.Today).Count!=3) throw new Exception("TEST clear generated note");
            rows[1].Status="В работа";
            if(Plan(rows,s,DateTime.Today).Count!=0) throw new Exception("TEST preserve partial status");
            rows.Reverse();s["T01"]=true;
            if(!Plan(rows,s,DateTime.Today).Any(x=>x.Row==7 && x.Column==5)) throw new Exception("TEST ID mapping");
            rows[0].Id=rows[1].Id;bool rejected=false;
            try{Plan(rows,s,DateTime.Today);}catch(InvalidOperationException){rejected=true;}
            if(!rejected) throw new Exception("TEST reject duplicate IDs");
        }
    }
    static class Office {
        const string Tag="BDS_DONE_";
        static readonly Guid IDispatch=new Guid("00020400-0000-0000-C000-000000000046");
        delegate bool EnumProc(IntPtr hwnd,IntPtr arg);
        [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc p,IntPtr a);
        [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr h,EnumProc p,IntPtr a);
        [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr h,StringBuilder s,int n);
        [DllImport("oleacc.dll")] static extern int AccessibleObjectFromWindow(IntPtr h,uint id,ref Guid iid,[MarshalAs(UnmanagedType.Interface)] out object obj);
        [DllImport("ole32.dll")] static extern int GetRunningObjectTable(uint r,out IRunningObjectTable rot);
        [DllImport("ole32.dll")] static extern int CreateBindCtx(uint r,out IBindCtx bc);
        public static string Txt(object o){ return Convert.ToString(o,CultureInfo.InvariantCulture)??""; }
        public static bool SamePath(string a,string b) {
            try{return String.Equals(Path.GetFullPath(a),Path.GetFullPath(b),StringComparison.OrdinalIgnoreCase);}catch{return false;}
        }
        static string ClassName(IntPtr h){var s=new StringBuilder(128);GetClassName(h,s,s.Capacity);return s.ToString();}
        public static dynamic RunningFile(string path,bool word,ComScope scope) {
            // A document moniker identifies the exact file, even across Office instances.
            IRunningObjectTable rot=null;IEnumMoniker en=null;IBindCtx ctx=null;
            try {
                GetRunningObjectTable(0,out rot);CreateBindCtx(0,out ctx);rot.EnumRunning(out en);
                var items=new IMoniker[1];
                while(en.Next(1,items,IntPtr.Zero)==0) {
                    try {
                        string name;items[0].GetDisplayName(ctx,null,out name);
                        if(SamePath(name,path)) {
                            object o;rot.GetObject(items[0],out o);dynamic d=scope.Keep(o);
                            if(SamePath(Txt(d.FullName),path)) return d;
                        }
                    }catch{}finally{if(items[0]!=null)Marshal.ReleaseComObject(items[0]);}
                }
            }catch{}finally{
                if(en!=null)Marshal.ReleaseComObject(en);if(ctx!=null)Marshal.ReleaseComObject(ctx);if(rot!=null)Marshal.ReleaseComObject(rot);
            }
            // Native Office window access also works before the file is registered in ROT.
            object result=null;
            EnumWindows(delegate(IntPtr top,IntPtr arg){
                if(ClassName(top)!=(word?"OpusApp":"XLMAIN"))return true;
                EnumChildWindows(top,delegate(IntPtr child,IntPtr unused){
                    if(ClassName(child)!=(word?"_WwG":"EXCEL7"))return true;
                    try {
                        object native;Guid iid=IDispatch;
                        if(AccessibleObjectFromWindow(child,0xFFFFFFF0,ref iid,out native)!=0 || native==null)return true;
                        dynamic win=scope.Keep(native);
                        if(word) {
                            dynamic doc=scope.Keep(win.Document);
                            if(SamePath(Txt(doc.FullName),path))result=(object)doc;
                        } else {
                            dynamic app=scope.Keep(win.Application),books=scope.Keep(app.Workbooks);
                            for(int i=1;i<=books.Count;i++){
                                dynamic book=scope.Keep(books[i]);
                                if(SamePath(Txt(book.FullName),path)){result=(object)book;break;}
                            }
                        }
                    }catch{}
                    return result==null;
                },IntPtr.Zero);
                return result==null;
            },IntPtr.Zero);
            return result;
        }
        public static Dictionary<string,bool> ReadLive(dynamic doc,ComScope scope) {
            var result=new Dictionary<string,bool>(StringComparer.Ordinal);
            dynamic controls=scope.Keep(doc.ContentControls);
            for(int i=1;i<=controls.Count;i++) {
                dynamic c=scope.Keep(controls[i]);string tag=Txt(c.Tag);
                if(!tag.StartsWith(Tag,StringComparison.Ordinal))continue;
                string id=tag.Substring(Tag.Length);
                if((int)c.Type!=8 || result.ContainsKey(id))throw new InvalidOperationException("Повредена или повторена отметка "+id);
                result.Add(id,(bool)c.Checked);
            }
            Logic.Validate(result.Keys);return result;
        }
        public static Dictionary<string,bool> ReadSaved(string path) {
            var states=new Dictionary<string,bool>(StringComparer.Ordinal);
            using(var f=new FileStream(path,FileMode.Open,FileAccess.Read,FileShare.ReadWrite))
            using(var zip=new ZipArchive(f,ZipArchiveMode.Read))
            using(var xml=zip.GetEntry("word/document.xml").Open()) {
                XNamespace w="http://schemas.openxmlformats.org/wordprocessingml/2006/main";
                XNamespace w14="http://schemas.microsoft.com/office/word/2010/wordml";
                var doc=XDocument.Load(xml);
                foreach(var pr in doc.Descendants(w+"sdtPr")) {
                    string tag=(string)(pr.Element(w+"tag")??new XElement("none")).Attribute(w+"val")??"";
                    if(!tag.StartsWith(Tag,StringComparison.Ordinal))continue;
                    string id=tag.Substring(Tag.Length);var box=pr.Element(w14+"checkbox");
                    if(box==null || states.ContainsKey(id))throw new InvalidOperationException("Повредена или повторена отметка "+id);
                    string value=(string)(box.Element(w14+"checked")??new XElement("none")).Attribute(w14+"val")??"0";
                    states.Add(id,value=="1" || value=="true" || value=="on");
                }
            }
            Logic.Validate(states.Keys);return states;
        }
        public static bool HasLock(string path){
            string dir=Path.GetDirectoryName(path),name=Path.GetFileName(path);
            // Check both owner-file forms before falling back to the saved document.
            return File.Exists(Path.Combine(dir,"~$"+name)) ||
                (name.Length>2 && File.Exists(Path.Combine(dir,"~$"+name.Substring(2))));
        }
        public static dynamic Sheet(dynamic book,string name,ComScope scope) {
            dynamic sheets=scope.Keep(book.Worksheets);return scope.Keep(sheets[name]);
        }
        public static dynamic Cell(dynamic sheet,string addr,ComScope scope){return scope.Keep(sheet.Range[addr]);}
        public static int Apply(dynamic book,Dictionary<string,bool> states,ComScope scope) {
            if((bool)book.ReadOnly)throw new InvalidOperationException("Excel е само за четене. Затвори копието или разреши редактиране.");
            dynamic app=scope.Keep(book.Application);
            if(!(bool)app.Ready)throw new InvalidOperationException("Excel е зает с редакция. Синхронизацията ще опита отново.");
            dynamic sheet=Sheet(book,"Задачи",scope),range=Cell(sheet,"A7:H38",scope);
            object[,] data=(object[,])range.Value2;
            var rows=new List<TaskRow>();
            for(int i=1;i<=32;i++)rows.Add(new TaskRow{Id=Txt(data[i,1]),Row=i+6,Status=Txt(data[i,5]),Date=data[i,7],Note=Txt(data[i,8])});
            var edits=Logic.Plan(rows,states,DateTime.Today);
            var applied=new List<Edit>();
            try {
                foreach(var edit in edits) {
                    string addr=((char)('A'+edit.Column-1)).ToString()+edit.Row;
                    dynamic cell=Cell(sheet,addr,scope);cell.Value2=edit.Value;applied.Add(edit);
                }
                app.Calculate();
                dynamic dashboard=Sheet(book,"Табло",scope);
                Cell(dashboard,"B53",scope).Value2=DateTime.Now.ToString("dd.MM.yyyy HH:mm:ss")+"  Word към Excel";
                book.Save();
                return edits.Count;
            } catch {
                // Best-effort rollback in an attached workbook; next pass retries the Word state.
                foreach(var edit in applied) try {
                    string addr=((char)('A'+edit.Column-1)).ToString()+edit.Row;
                    Cell(sheet,addr,scope).Value2=data[edit.Row-6,edit.Column];
                }catch{}
                throw;
            }
        }
        public static void Backup(string path,string root) {
            string dir=Path.Combine(root,"Backups");Directory.CreateDirectory(dir);
            string dest=Path.Combine(dir,DateTime.Now.ToString("yyyy-MM-dd")+"_"+Path.GetFileName(path));
            if(!File.Exists(dest))File.Copy(path,dest,false);
        }
        public static void SyncWorkbook(string path,Dictionary<string,bool> states,string root) {
            using(var scope=new ComScope()) {
                dynamic book=RunningFile(path,false,scope);dynamic ownedApp=null;
                bool ownBook=false;
                try {
                    if(book==null) {
                        if(HasLock(path))throw new InvalidOperationException("Excel файлът е заключен. Изчаквам достъп до отворения файл.");
                        ownedApp=scope.Keep(Activator.CreateInstance(Type.GetTypeFromProgID("Excel.Application",true)));
                        ownedApp.Visible=false;ownedApp.DisplayAlerts=false;ownedApp.AutomationSecurity=3;
                        dynamic books=scope.Keep(ownedApp.Workbooks);
                        book=scope.Keep(books.Open(path,UpdateLinks:0,ReadOnly:false,IgnoreReadOnlyRecommended:true,AddToMru:false));
                        ownBook=true;
                    }
                    Backup(path,root);Apply(book,states,scope);
                } finally {
                    if(ownBook && book!=null)try{book.Close(false);}catch{}
                    if(ownedApp!=null)try{ownedApp.Quit();}catch{}
                }
            }
        }
        public static void SmokeTest(string root) {
            Logic.UnitTest();
            string tmp=Path.Combine(Path.GetTempPath(),"BDS_Office_Test_"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(tmp);
            string wp=Path.Combine(tmp,"BDS_Plan.docx"),xp=Path.Combine(tmp,"BDS_Progress.xlsx");
            File.Copy(Path.Combine(root,"BDS_Plan.docx"),wp);File.Copy(Path.Combine(root,"BDS_Progress.xlsx"),xp);
            using(var scope=new ComScope()) {
                dynamic word=null,excel=null,doc=null,book=null;
                try {
                    word=scope.Keep(Activator.CreateInstance(Type.GetTypeFromProgID("Word.Application",true)));
                    word.Visible=false;word.DisplayAlerts=0;word.AutomationSecurity=3;
                    dynamic docs=scope.Keep(word.Documents);doc=scope.Keep(docs.Open(wp,ReadOnly:false,AddToRecentFiles:false));
                    excel=scope.Keep(Activator.CreateInstance(Type.GetTypeFromProgID("Excel.Application",true)));
                    excel.Visible=false;excel.DisplayAlerts=false;excel.AutomationSecurity=3;
                    dynamic books=scope.Keep(excel.Workbooks);book=scope.Keep(books.Open(xp,UpdateLinks:0,ReadOnly:false,AddToMru:false));
                    dynamic controls=scope.Keep(doc.ContentControls);
                    for(int i=1;i<=controls.Count;i++){
                        dynamic c=scope.Keep(controls[i]);if(Txt(c.Tag).StartsWith(Tag,StringComparison.Ordinal))c.Checked=false;
                    }
                    Apply(book,ReadLive(doc,scope),scope);
                    dynamic sheet=Sheet(book,"Задачи",scope),dash=Sheet(book,"Табло",scope);
                    string financeBefore=Txt(Cell(dash,"J38",scope).Value2);
                    dynamic tagged=scope.Keep(doc.SelectContentControlsByTag(Tag+"T02")),test=scope.Keep(tagged[1]);
                    test.Checked=true;doc.Save();Apply(book,ReadLive(doc,scope),scope);
                    if(!ReadSaved(wp)["T02"] || Txt(Cell(sheet,"E8",scope).Value2)!=Logic.Done || Convert.ToDouble(Cell(sheet,"I8",scope).Value2)!=1 || Math.Abs(Convert.ToDouble(Cell(dash,"B16",scope).Value2)-1.0/32)>0.0000001)
                        throw new Exception("Office тестът за отметка не премина.");
                    if(Txt(Cell(dash,"J38",scope).Value2)!=financeBefore)throw new Exception("Office тестът промени финансовия статус.");
                    test.Checked=false;doc.Save();Apply(book,ReadLive(doc,scope),scope);
                    if(Txt(Cell(sheet,"E8",scope).Value2)!=Logic.Open || Cell(sheet,"G8",scope).Value2!=null || Convert.ToDouble(Cell(dash,"B16",scope).Value2)!=0)
                        throw new Exception("Office тестът за махане на отметка не премина.");
                    book.Close(false);book=null;excel.Quit();excel=null;
                    test.Checked=true;doc.Save();
                    SyncWorkbook(xp,ReadSaved(wp),tmp);
                    excel=scope.Keep(Activator.CreateInstance(Type.GetTypeFromProgID("Excel.Application",true)));
                    excel.Visible=false;excel.DisplayAlerts=false;excel.AutomationSecurity=3;
                    books=scope.Keep(excel.Workbooks);book=scope.Keep(books.Open(xp,UpdateLinks:0,ReadOnly:true,AddToMru:false));
                    sheet=Sheet(book,"Задачи",scope);
                    if(Txt(Cell(sheet,"E8",scope).Value2)!=Logic.Done)throw new Exception("Office тестът със затворен Excel не премина.");
                } finally {
                    if(book!=null)try{book.Close(false);}catch{}
                    if(doc!=null)try{doc.Close(false);}catch{}
                    if(excel!=null)try{excel.Quit();}catch{}
                    if(word!=null)try{word.Quit();}catch{}
                }
            }
            try{Directory.Delete(tmp,true);}catch{}
        }
    }
    sealed class SyncContext : ApplicationContext {
        readonly string root,wordPath,excelPath;
        readonly NotifyIcon icon;readonly System.Windows.Forms.Timer timer;
        readonly EventWaitHandle stop;
        string signature=null,lastError="";DateTime excelWrite=DateTime.MinValue;
        bool busy=false,paused=false;
        public SyncContext(string folder,EventWaitHandle signal) {
            root=folder;stop=signal;wordPath=Path.Combine(root,"BDS_Plan.docx");excelPath=Path.Combine(root,"BDS_Progress.xlsx");
            icon=new NotifyIcon{Icon=SystemIcons.Application,Visible=true,Text="BDS: стартиране"};
            var menu=new ContextMenuStrip();
            menu.Items.Add("Отвори плана в Word",null,delegate{Open(wordPath);});
            menu.Items.Add("Отвори прогреса в Excel",null,delegate{Open(excelPath);});
            menu.Items.Add("Статус на връзката",null,delegate{MessageBox.Show(File.Exists(Path.Combine(root,"sync-status.txt"))?File.ReadAllText(Path.Combine(root,"sync-status.txt")):"Стартиране…","BDS Sync");});
            var pause=menu.Items.Add("Пауза",null,delegate{paused=!paused;});
            menu.Items.Add("Изключи автоматичното стартиране",null,delegate{Program.RemoveStartup(root);ExitThread();});
            menu.Items.Add("Изход до следващия вход в Windows",null,delegate{ExitThread();});
            icon.ContextMenuStrip=menu;icon.DoubleClick+=delegate{Open(excelPath);};
            timer=new System.Windows.Forms.Timer{Interval=2000};timer.Tick+=delegate{pause.Text=paused?"Продължи":"Пауза";Tick();};timer.Start();Tick();
        }
        void Open(string path){try{Process.Start(new ProcessStartInfo(path){UseShellExecute=true});}catch(Exception e){MessageBox.Show(e.Message,"BDS Sync");}}
        void Status(string value,bool error){
            icon.Text=("BDS: "+value).Substring(0,Math.Min(63,("BDS: "+value).Length));icon.Icon=error?SystemIcons.Warning:SystemIcons.Application;
            string full=DateTime.Now.ToString("dd.MM.yyyy HH:mm:ss")+Environment.NewLine+value+Environment.NewLine+root;
            try{File.WriteAllText(Path.Combine(root,"sync-status.txt"),full,Encoding.UTF8);}catch{}
        }
        void Tick() {
            if(stop.WaitOne(0)){ExitThread();return;}
            if(busy)return;if(paused){Status("В пауза. Отметките чакат.",true);return;}
            busy=true;
            try {
                if(!File.Exists(wordPath)||!File.Exists(excelPath))throw new FileNotFoundException("Липсва Word или Excel файлът в папката.");
                Dictionary<string,bool> states;
                using(var scope=new ComScope()) {
                    dynamic doc=Office.RunningFile(wordPath,true,scope);
                    if(doc!=null) {
                        states=Office.ReadLive(doc,scope);
                        string current=Logic.Signature(states);
                        if(current!=signature) {
                            if((bool)doc.ReadOnly)throw new InvalidOperationException("Word е само за четене. Разреши редактиране.");
                            Office.Backup(wordPath,root);
                            if(!(bool)doc.Saved)doc.Save();
                        }
                    } else {
                        if(Office.HasLock(wordPath))throw new InvalidOperationException("Word е зает или недостъпен. Изчаквам отворения документ.");
                        states=Office.ReadSaved(wordPath);
                    }
                }
                string next=Logic.Signature(states);
                DateTime changed=File.GetLastWriteTimeUtc(excelPath);
                if(next!=signature || changed!=excelWrite) {
                    Office.SyncWorkbook(excelPath,states,root);
                    signature=next;excelWrite=File.GetLastWriteTimeUtc(excelPath);
                    Status("Синхронизирано. "+states.Values.Count(x=>x)+" от 32 задачи.",false);
                } else if(lastError!="")Status("Връзката е възстановена.",false);
                lastError="";
            }catch(Exception e) {
                string msg=e.GetBaseException().Message;
                if(msg!=lastError) {
                    Status(msg,true);Program.Log(root,"WAIT "+msg);
                    icon.ShowBalloonTip(4000,"BDS Sync изчаква",msg,ToolTipIcon.Warning);lastError=msg;
                }
            }finally{busy=false;}
        }
        protected override void ExitThreadCore(){timer.Stop();timer.Dispose();icon.Visible=false;icon.Dispose();base.ExitThreadCore();}
    }
    static class Program {
        const string StopName="Local\\BDSOfficeSyncStopV1", MutexName="Local\\BDSOfficeSyncV1";
        static string Shortcut {get{return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Startup),"BDS Office Sync.lnk");}}
        public static void Log(string root,string message){try{string f=Path.Combine(root,"sync.log");if(File.Exists(f)&&new FileInfo(f).Length>1000000)File.Move(f,f+"."+DateTime.Now.ToString("yyyyMMddHHmmss"));File.AppendAllText(f,DateTime.Now.ToString("s")+" "+message+Environment.NewLine,Encoding.UTF8);}catch{}}
        public static void RemoveStartup(string root){
            if(!File.Exists(Shortcut))return;
            using(var s=new ComScope()){
                dynamic shell=s.Keep(Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell",true)));
                dynamic link=s.Keep(shell.CreateShortcut(Shortcut));
                if(Office.SamePath(Office.Txt(link.TargetPath),Path.Combine(root,"BDS_Sync.exe")))File.Delete(Shortcut);
            }
        }
        static void RegisterStartup(string root){
            using(var s=new ComScope()){
                dynamic shell=s.Keep(Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell",true)));
                dynamic link=s.Keep(shell.CreateShortcut(Shortcut));
                link.TargetPath=Path.Combine(root,"BDS_Sync.exe");link.Arguments="--run";link.WorkingDirectory=root;
                link.Description="Обновява BDS Excel от отметките в BDS Word";link.Save();
            }
        }
        static void StopRunning(){
            try {
                using(var s=EventWaitHandle.OpenExisting(StopName)){s.Set();}
                using(var m=Mutex.OpenExisting(MutexName)) {
                    bool acquired=false;
                    try{try{acquired=m.WaitOne(15000);}catch(AbandonedMutexException){acquired=true;}
                        if(!acquired)throw new InvalidOperationException("Помощникът е зает с Office. Затвори диалозите в Word и Excel и опитай пак.");
                    }finally{if(acquired)m.ReleaseMutex();}
                }
            }catch(WaitHandleCannotBeOpenedException){}
        }
        [STAThread] public static int Main(string[] args) {
            Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
            string root=AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);
            string mode=args.Length>0?args[0]:"--run";
            try {
                if(mode=="--stop"){StopRunning();return 0;}
                if(mode=="--uninstall") {
                    RemoveStartup(root);StopRunning();
                    MessageBox.Show("Автоматичното стартиране е премахнато. Word, Excel и резервните копия са запазени.","BDS Sync");return 0;
                }
                if(mode=="--install" || mode=="--test") {
                    using(var progress=new Form{Text="BDS Sync",Width=530,Height=145,StartPosition=FormStartPosition.CenterScreen,ControlBox=false,FormBorderStyle=FormBorderStyle.FixedDialog}) {
                        progress.Controls.Add(new Label{Text="Проверявам Word и Excel върху временни копия…\nИзчакай. Файловете ти не се променят от теста.",Dock=DockStyle.Fill,Padding=new Padding(20),Font=new Font("Segoe UI",10)});
                        progress.Show();Application.DoEvents();Office.SmokeTest(root);progress.Close();
                    }
                    Log(root,"PASS: logic, live checkbox, undo, persisted DOCX, dashboard and closed Excel.");
                    if(mode=="--test"){MessageBox.Show("Тестовете преминаха успешно.","BDS Sync");return 0;}
                    StopRunning();RegisterStartup(root);
                    Process.Start(new ProcessStartInfo(Path.Combine(root,"BDS_Sync.exe"),"--run"){WorkingDirectory=root});
                    MessageBox.Show("Готово. Отваряй BDS_Plan.docx и отмятай задачите.\nExcel ще се обновява автоматично.\n\nПомощникът се стартира при вход в Windows. Не мести папката.\nПри отметка се запазват двата файла, включително текущите редакции.","BDS Sync");return 0;
                }
                bool first;using(var mutex=new Mutex(true,MutexName,out first)) {
                    if(!first){MessageBox.Show("BDS Sync вече работи. Иконата е до часовника на Windows.","BDS Sync");return 0;}
                    using(var stop=new EventWaitHandle(false,EventResetMode.ManualReset,StopName)){
                        stop.Reset();Application.Run(new SyncContext(root,stop));
                    }
                    mutex.ReleaseMutex();
                }
                return 0;
            }catch(Exception e){Log(root,"ERROR "+e);MessageBox.Show("Настройката не е завършена.\n\n"+e.GetBaseException().Message+"\n\nВиж sync.log в папката. Не е нужно да намаляваш защитите на Office или Windows.","BDS Sync",MessageBoxButtons.OK,MessageBoxIcon.Error);return 1;}
        }
    }
}
