'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { checkCase } = require('../scripts/check-case');

test('the Alba composite adds up and yields the figures the article quotes', () => {
  const r = checkCase(require('../case/alba.json'));
  assert.deepEqual(r.errors, []);
  assert.equal(r.derived.payees, 6400);
  assert.equal(r.derived.valueMEUR, 312.1);
  assert.deepEqual(r.derived.shareByPayee, { structured: 70, warnings: 22, notPayable: 8 });
  assert.deepEqual(r.derived.shareByValue, { structured: 84, warnings: 13, notPayable: 3 });
  assert.deepEqual(r.derived.payableTodayPct, { byPayee: 92, byValue: 97 });
  assert.equal(r.derived.payableAfterFirstWavePct, 99.4);
  assert.equal(r.derived.lastFileUnstructuredPct, 100);
  assert.equal(r.derived.groupTurnoverMEUR, 475.7);
  assert.deepEqual(r.derived.entities.map(e => e.verifactu), ['excluded (SII)', 'excluded (SII)', 'does not apply (foral)', 'in scope', 'in scope']);
  assert.deepEqual(r.derived.entities.map(e => e.eInvoicingFrom), ['2027-10-06', '2027-10-06', '2027-10-06', '2028-10-06', '2028-10-06']);
});

test('the empty template is refused, field by field', () => {
  const r = checkCase(require('../case/case-data.template.json'));
  assert.equal(r.ok, false);
  assert.ok(r.errors.length >= 6);
});

test('a real case without a named approver is refused', () => {
  const c = { ...require('../case/alba.json'), label: 'anonymised', permission: '' };
  const r = checkCase(c);
  assert.ok(r.errors.some(e => e.startsWith('permission')));
});

test('numbers that do not add up are caught', () => {
  const c = JSON.parse(JSON.stringify(require('../case/alba.json')));
  c.baseline.lastFile.unstructured = 1000;
  c.banks[1].shareOfPaymentValuePct = 20;
  const r = checkCase(c);
  assert.equal(r.errors.length, 2);
});
