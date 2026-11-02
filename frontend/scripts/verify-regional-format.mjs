import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL("../src/lib/regional-format.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});
const context = { exports: {}, Intl, Date };
vm.runInNewContext(compiled.outputText, context);
const { defaultPreferences, regionalFormat, parseRegionalDate } =
  context.exports;
const us = regionalFormat(defaultPreferences);
const de = regionalFormat({
  locale: "de-DE",
  currency: "EUR",
  time_zone: "Europe/Berlin",
});
assert.equal(us.formatCurrency("1234.56"), "$1,234.56");
assert.match(de.formatCurrency("1234.56"), /^1\.234,56\s€$/u);
assert.equal(us.today(new Date("2026-11-01T02:30:00Z")), "2026-10-31");
assert.equal(de.today(new Date("2026-11-01T02:30:00Z")), "2026-11-01");
assert.equal(us.today(new Date("2026-07-01T04:30:00Z")), "2026-07-01"); // EDT
assert.equal(us.today(new Date("2026-12-01T04:30:00Z")), "2026-11-30"); // EST
assert.equal(us.formatDate("2026-11-01"), "Nov 1, 2026"); // never shifted to October
assert.equal(parseRegionalDate("03/04/2026", "en-US"), "2026-03-04");
assert.equal(parseRegionalDate("03/04/2026", "en-GB"), "2026-04-03");
assert.equal(parseRegionalDate("02.11.2026", "de-DE"), "2026-11-02");
assert.equal(parseRegionalDate("2026-11-02", "en-US"), "2026-11-02");
assert.equal(parseRegionalDate("02/29/2024", "en-US"), "2024-02-29");
assert.equal(parseRegionalDate("02/29/2026", "en-US"), undefined);
assert.equal(parseRegionalDate("13/01/2026", "en-US"), undefined);
for (const locale of [
  "en-US",
  "en-GB",
  "en-CA",
  "en-AU",
  "en-NZ",
  "de-DE",
  "fr-FR",
  "es-ES",
  "it-IT",
  "de-CH",
  "ja-JP",
  "zh-CN",
  "en-IN",
  "es-MX",
  "pt-BR",
]) {
  const format = regionalFormat({ ...defaultPreferences, locale });
  const rendered = format.formatDate("2026-11-22", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  assert.equal(parseRegionalDate(rendered, locale), "2026-11-22", locale);
  const month = format.formatDate("2026-11-01", {
    year: "numeric",
    month: "2-digit",
  });
  assert.equal(parseRegionalDate(month, locale, true), "2026-11-01", locale);
}
console.log(
  "Passed regional money/date formatting, numeric date parsing, EST/EDT and month-boundary checks.",
);
