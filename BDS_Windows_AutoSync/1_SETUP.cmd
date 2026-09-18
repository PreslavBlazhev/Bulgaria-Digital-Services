@echo off
setlocal
cd /d "%~dp0"
if not exist "BDS_Plan.docx" goto missing
if not exist "BDS_Progress.xlsx" goto missing
if exist "BDS_Sync.exe" (
  start /wait "" "%~dp0BDS_Sync.exe" --stop
  if errorlevel 1 goto failed
)
set "BDS_CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%BDS_CSC%" set "BDS_CSC=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe"
if not exist "%BDS_CSC%" goto compiler
echo BDS Sync - preparing the local Windows helper...
"%BDS_CSC%" /nologo /target:winexe /platform:anycpu /optimize+ /codepage:65001 /out:BDS_Sync.exe /reference:System.dll /reference:System.Core.dll /reference:System.Drawing.dll /reference:System.Windows.Forms.dll /reference:System.Xml.dll /reference:System.Xml.Linq.dll /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll /reference:Microsoft.CSharp.dll BDS_Sync.cs
if errorlevel 1 goto failed
echo Testing your desktop Word and Excel on temporary copies...
start /wait "" "%~dp0BDS_Sync.exe" --install
if errorlevel 1 goto failed
exit /b 0
:missing
echo Extract ALL files from the ZIP into one permanent folder first.
pause
exit /b 1
:compiler
echo Microsoft .NET Framework 4.8 is required. Setup could not continue.
echo Ask for help. Do not disable Windows security settings.
pause
exit /b 1
:failed
echo Setup did not complete. Keep this message or sync.log for diagnosis.
pause
exit /b 1
