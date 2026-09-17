/* ============================================================
   BDS — обща база за тестовете на операциите
   ------------------------------------------------------------
   Две неща:

   1. loadLogic() — зарежда tools/crm/Logic.gs в Node и връща
      функциите му. Тестовете проверяват СЪЩИЯ файл, който после
      работи в Google, а не негово копие. Копие би се разминало още
      при първата поправка.

   2. FakeSheet — таблица в паметта със същия договор като лист в
      Google Sheets. Позволява да се тества сглобяването на редове
      без интернет и без да се пише в истинската таблица.
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
export const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

/** Изпълнява един или няколко .gs файла в общ контекст — точно както
    Apps Script ги слива в едно глобално пространство. */
export function loadGs(...relPaths) {
  const ctx = { console, Date, JSON, Math, RegExp, String, Number, isNaN, isFinite, parseFloat, parseInt };
  vm.createContext(ctx);
  for (const rel of relPaths) {
    vm.runInContext(read(rel), ctx, { filename: rel });
  }
  return ctx;
}

export const loadLogic = () => loadGs('tools/crm/Logic.gs');

/* ---------- отчитане, същият вид като в другите тестове ---------- */

export function reporter(title) {
  const results = [];
  let group = '';
  console.log('\x1b[1m' + title + '\x1b[0m');
  return {
    results,
    G(name) { group = name; console.log('\n\x1b[1m' + name + '\x1b[0m'); },
    check(name, ok, detail = '') {
      results.push({ group, name, ok: !!ok, detail });
      const tag = ok ? '\x1b[32m  ok  \x1b[0m' : '\x1b[31m FAIL \x1b[0m';
      console.log(tag + ' ' + name + (detail ? '  \x1b[2m' + detail + '\x1b[0m' : ''));
      return !!ok;
    },
    /** Блокирано от външна причина — не е провал на кода, но не е и „минава“. */
    blocked(name, reason) {
      results.push({ group, name, ok: false, blocked: true, detail: reason });
      console.log('\x1b[33m BLOCK\x1b[0m ' + name + '  \x1b[2m' + reason + '\x1b[0m');
      return false;
    },
    summary() {
      const failed = results.filter(r => !r.ok && !r.blocked);
      const blocked = results.filter(r => r.blocked);
      const passed = results.filter(r => r.ok);
      console.log('\n' + '─'.repeat(60));
      console.log(`минали: ${passed.length}   провалени: ${failed.length}   блокирани: ${blocked.length}`);
      if (failed.length) {
        console.log('\n\x1b[31mПровали:\x1b[0m');
        failed.forEach(f => console.log('  · ' + f.group + ' — ' + f.name + (f.detail ? '  (' + f.detail + ')' : '')));
      }
      if (blocked.length) {
        console.log('\n\x1b[33mБлокирани от външна стъпка:\x1b[0m');
        blocked.forEach(f => console.log('  · ' + f.name + ' — ' + f.detail));
      }
      return failed.length === 0;
    }
  };
}

/* ---------- таблица в паметта ---------- */

/** Достатъчно от Google Sheets, за да се провери сглобяването:
    редове, четене, писане, изтриване. Нищо повече — тестът не бива
    да проверява Google, а нашата логика. */
export class FakeSheet {
  constructor(header) {
    this.header = header.slice();
    this.rows = [];
  }
  get lastRow() { return this.rows.length + 1; }
  setRows(rows) { this.rows = rows.map(r => r.slice()); }
  values() { return this.rows.map(r => r.slice()); }
  column(name) {
    const i = this.header.indexOf(name);
    if (i < 0) throw new Error('Няма колона ' + name);
    return this.rows.map(r => r[i]);
  }
  find(predicate) { return this.rows.find(predicate); }
}

/** Ред за лист Leads по имена на колони — за да не се броят индекси
    в тестовете и да не се чупят при добавена колона. */
export function leadRow(columns, fields) {
  const row = columns.map(() => '');
  for (const [name, value] of Object.entries(fields)) {
    const i = columns.indexOf(name);
    if (i < 0) throw new Error('Няма колона ' + name);
    row[i] = value;
  }
  return row;
}

export function near(a, b, eps = 1e-9) {
  return typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < eps;
}
