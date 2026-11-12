'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const cds = require('@sap/cds');

test('ReadinessService classifies on write and reports exposure by format', async () => {
  cds.root = path.join(__dirname, '..');
  const csn = await cds.load(['db', 'srv']);
  cds.model = cds.compile.for.nodejs(csn);
  cds.db = await cds.connect.to('db', { kind: 'sqlite', credentials: { url: ':memory:' } });
  await cds.deploy(csn).to(cds.db);
  const srv = await cds.serve('ReadinessService').from(csn);
  const { PayeeAddresses } = srv.entities;

  await srv.run(INSERT.into(PayeeAddresses).entries([
    { partner: '100001', addressId: '1', name: 'Fournisseur Un SARL', street: 'Rue de la Paix', houseNumber: '10', postalCode: '75002', city: 'Paris', country: 'FR', paidLast12m: 900000 },
    { partner: '100002', addressId: '1', name: 'Lieferant Zwei GmbH', postalCode: '60311', city: 'Frankfurt am Main', country: 'DE', freeText: 'Kaiserplatz 1, 49. Stock', paidLast12m: 250000 },
    { partner: '100003', addressId: '1', name: 'Proveedor Tres SL', freeText: 'Avenida Diagonal 477, planta 9\n08036 Barcelona, España', paidLast12m: 1400000 },
  ]));

  const rows = await srv.run(SELECT.from(PayeeAddresses).orderBy('partner'));
  assert.deepEqual(rows.map(r => r.format), ['STRUCTURED', 'HYBRID', 'UNSTRUCTURED']);
  assert.deepEqual(rows.map(r => Boolean(r.payable)), [true, true, false]);
  assert.match(rows[2].issues, /TOWN_MISSING/);

  const summary = await srv.send('summary');
  const unstructured = summary.find(s => s.format === 'UNSTRUCTURED');
  assert.equal(unstructured.payees, 1);
  assert.equal(unstructured.exposure, 1400000);

  const xml = await srv.send('pstlAdr', { partner: '100002', addressId: '1' });
  assert.match(xml, /<TwnNm>Frankfurt am Main<\/TwnNm>\n\s*<Ctry>DE<\/Ctry>\n\s*<AdrLine>Kaiserplatz 1, 49\. Stock<\/AdrLine>/);

  await assert.rejects(() => srv.send('pstlAdr', { partner: '100003', addressId: '1' }), /not payable/);

  // Fixing the master data flips the verdict without anyone touching it
  await srv.run(UPDATE(PayeeAddresses).set({ street: 'Avenida Diagonal', houseNumber: '477', postalCode: '08036', city: 'Barcelona', country: 'ES', freeText: 'planta 9' }).where({ partner: '100003', addressId: '1' }));
  const fixed = await srv.run(SELECT.one.from(PayeeAddresses).where({ partner: '100003', addressId: '1' }));
  assert.equal(fixed.format, 'HYBRID');
  assert.equal(Boolean(fixed.payable), true);
  assert.equal(fixed.issues, '');
});
