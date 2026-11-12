'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { altaString, recordHash, verifyChain } = require('../srv/lib/verifactu');

// Worked example from the AEAT specification for fingerprint generation
const AEAT_EXAMPLE = {
  kind: 'alta', issuerNif: '89890001K', seriesNumber: '12345678/G33', issueDate: '01-01-2024',
  invoiceType: 'F1', totalTax: '12.35', totalAmount: '123.45', generatedAt: '2024-01-01T19:20:30+01:00',
};
const AEAT_HASH = '3C464DAF61ACB827C65FDA19F352A4E3BDC2C640E9E9FC4CC058073F38F12F60';

test('first record reproduces the AEAT worked example', () => {
  assert.equal(
    altaString(AEAT_EXAMPLE),
    'IDEmisorFactura=89890001K&NumSerieFactura=12345678/G33&FechaExpedicionFactura=01-01-2024&TipoFactura=F1&CuotaTotal=12.35&ImporteTotal=123.45&Huella=&FechaHoraHusoGenRegistro=2024-01-01T19:20:30+01:00',
  );
  assert.equal(recordHash(AEAT_EXAMPLE), AEAT_HASH);
});

function chain() {
  const r1 = { ...AEAT_EXAMPLE };
  r1.hash = recordHash(r1);
  const r2 = { kind: 'alta', issuerNif: '89890001K', seriesNumber: '12345679/G34', issueDate: '01-01-2024', invoiceType: 'F1', totalTax: '12.35', totalAmount: '123.45', generatedAt: '2024-01-01T19:20:35+01:00' };
  r2.hash = recordHash(r2, r1.hash);
  const r3 = { kind: 'anulacion', issuerNif: '89890001K', seriesNumber: '12345679/G34', issueDate: '01-01-2024', generatedAt: '2024-01-01T19:20:40+01:00' };
  r3.hash = recordHash(r3, r2.hash);
  return [r1, r2, r3];
}

test('an intact chain verifies', () => {
  assert.deepEqual(verifyChain(chain()), { ok: true, checked: 3, brokenAt: null });
});

test('changing an amount after the fact breaks the chain at that record', () => {
  const records = chain();
  records[1].totalAmount = '23.45';
  const r = verifyChain(records);
  assert.equal(r.ok, false);
  assert.equal(r.brokenAt, 1);
});

test('deleting a record breaks the chain at the next one', () => {
  const [r1, , r3] = chain();
  const r = verifyChain([r1, r3]);
  assert.equal(r.ok, false);
  assert.equal(r.brokenAt, 1);
});
