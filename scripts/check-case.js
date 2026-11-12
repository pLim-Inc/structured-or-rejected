#!/usr/bin/env node
'use strict';
/**
 * Usage: node scripts/check-case.js <case.json>
 *
 * Checks that the numbers of a case add up, and derives the figures the article quotes from them,
 * so that no percentage in the text is typed by hand. Exit code 1 when something is missing or inconsistent.
 */
const fs = require('node:fs');

const LABELS = ['named', 'anonymised', 'composite'];
const VAT = ['SII', 'foral', 'none'];
const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
const pct = (part, whole) => Math.round((part / whole) * 1000) / 10;
const round1 = n => Math.round(n * 10) / 10;

function checkCase(c) {
  const errors = [], warnings = [];
  const need = (cond, msg) => { if (!cond) errors.push(msg); return cond; };
  const num = v => typeof v === 'number' && Number.isFinite(v);
  const allNum = (o, name) => need(o && Object.values(o).every(num), `${name}: every value has to be a number`);

  need(LABELS.includes(c.label), `label has to be one of: ${LABELS.join(', ')}`);
  if (c.label && c.label !== 'composite') need(String(c.permission || '').trim() !== '', 'permission: say who approved the publication, and when');
  need(/^\d{4}-\d{2}-\d{2}$/.test(c.asOf || ''), 'asOf: date of the measurement as YYYY-MM-DD');

  const derived = {};
  const b = c.baseline || {};
  if (allNum(b.payees, 'baseline.payees') && allNum(b.valueMEUR, 'baseline.valueMEUR')) {
    const payees = sum(b.payees), value = round1(sum(b.valueMEUR));
    derived.payees = payees;
    derived.valueMEUR = value;
    derived.shareByPayee = { structured: pct(b.payees.structured, payees), warnings: pct(b.payees.warnings, payees), notPayable: pct(b.payees.notPayable, payees) };
    derived.shareByValue = { structured: pct(b.valueMEUR.structured, value), warnings: pct(b.valueMEUR.warnings, value), notPayable: pct(b.valueMEUR.notPayable, value) };
    derived.payableTodayPct = { byPayee: pct(b.payees.structured + b.payees.warnings, payees), byValue: pct(b.valueMEUR.structured + b.valueMEUR.warnings, value) };
    const top = b.topNotPayable;
    if (top && num(top.payees) && num(top.valueMEUR)) {
      need(top.payees <= b.payees.notPayable, 'topNotPayable.payees is larger than the number of payees that are not payable');
      need(top.valueMEUR <= b.valueMEUR.notPayable, 'topNotPayable.valueMEUR is larger than the value that is not payable');
      derived.payableAfterFirstWavePct = pct(b.valueMEUR.structured + b.valueMEUR.warnings + top.valueMEUR, value);
      const target = c.targets && c.targets.payableValuePctBeforePilot;
      if (num(target) && derived.payableAfterFirstWavePct < target) warnings.push(`the first wave reaches ${derived.payableAfterFirstWavePct}% of value, below the target of ${target}%`);
    } else errors.push('baseline.topNotPayable: payees and valueMEUR are needed');
  }
  if (allNum(b.lastFile, 'baseline.lastFile')) {
    const f = b.lastFile;
    need(f.structured + f.hybrid + f.unstructured === f.creditorAddresses, 'baseline.lastFile: structured + hybrid + unstructured does not equal creditorAddresses');
    derived.lastFileUnstructuredPct = pct(f.unstructured, f.creditorAddresses);
  }
  need(num(b.oneTimePayments12m), 'baseline.oneTimePayments12m is missing');

  const entities = c.entities || [];
  if (need(entities.length > 0 && entities.every(e => e.alias && num(e.turnoverMEUR) && VAT.includes(e.vatReporting)), `entities: each needs an alias, turnoverMEUR and vatReporting (${VAT.join(', ')})`)) {
    derived.groupTurnoverMEUR = round1(entities.reduce((a, e) => a + e.turnoverMEUR, 0));
    derived.entities = entities.map(e => ({
      entity: e.alias,
      verifactu: e.vatReporting === 'none' ? 'in scope' : e.vatReporting === 'SII' ? 'excluded (SII)' : 'does not apply (foral)',
      eInvoicingFrom: e.turnoverMEUR > 8 ? '2027-10-06' : '2028-10-06',
    }));
  }
  const banks = c.banks || [];
  if (need(banks.length > 0 && banks.every(k => k.alias && num(k.shareOfPaymentValuePct)), 'banks: each needs an alias and shareOfPaymentValuePct')) {
    need(Math.abs(banks.reduce((a, k) => a + k.shareOfPaymentValuePct, 0) - 100) <= 0.5, 'banks: the shares of payment value do not add up to 100');
  }

  const cal = c.calendar || [];
  need(cal.length > 0 && cal.every(e => /^\d{4}-\d{2}-\d{2}$/.test(e.date || '') && e.event), 'calendar: each entry needs a date (YYYY-MM-DD) and an event');
  for (let i = 1; i < cal.length; i++) if (cal[i].date < cal[i - 1].date) { errors.push(`calendar: ${cal[i].date} comes after ${cal[i - 1].date} but is listed before it`); break; }
  for (const e of cal) {
    const day = new Date(`${e.date}T00:00:00Z`).getUTCDay();
    if (!e.law && (day === 0 || day === 6)) warnings.push(`calendar: ${e.date} (${e.event}) falls on a weekend`);
  }
  return { ok: errors.length === 0, errors, warnings, derived };
}

module.exports = { checkCase };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error('Usage: check-case <case.json>'); process.exit(2); }
  const r = checkCase(JSON.parse(fs.readFileSync(file, 'utf8')));
  console.log(JSON.stringify(r.derived, null, 2));
  r.warnings.forEach(w => console.log(`WARNING  ${w}`));
  r.errors.forEach(e => console.log(`ERROR    ${e}`));
  console.log(r.ok ? 'The case adds up.' : `${r.errors.length} problem(s). Fix them before any number goes into the article.`);
  process.exit(r.ok ? 0 : 1);
}
