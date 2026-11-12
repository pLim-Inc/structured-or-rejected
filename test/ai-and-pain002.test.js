'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { proposeStructure } = require('../srv/lib/ai-structurer');
const { parsePain002 } = require('../srv/lib/pain002');

const LINES = ['Avenida Diagonal 477, planta 9', '08036 Barcelona, España'];
const fake = answer => async () => JSON.stringify(answer);

test('a faithful proposal goes forward as PROPOSED', async () => {
  const r = await proposeStructure(LINES, 'ES', fake({ street: 'Avenida Diagonal', houseNumber: '477', postalCode: '08036', city: 'Barcelona', confidence: 0.96 }));
  assert.equal(r.status, 'PROPOSED');
  assert.deepEqual(r.proposal, { street: 'Avenida Diagonal', houseNumber: '477', poBox: '', postalCode: '08036', city: 'Barcelona', country: 'ES', freeText: [] });
});

test('an invented town is rejected, whatever the confidence says', async () => {
  const r = await proposeStructure(LINES, 'ES', fake({ street: 'Avenida Diagonal', houseNumber: '477', postalCode: '08036', city: 'Madrid', confidence: 0.99 }));
  assert.equal(r.status, 'REJECTED');
  assert.match(r.reason, /city:madrid/);
});

test('low confidence goes to a person', async () => {
  const r = await proposeStructure(LINES, 'ES', fake({ street: 'Avenida Diagonal', houseNumber: '477', postalCode: '08036', city: 'Barcelona', confidence: 0.55 }));
  assert.equal(r.status, 'NEEDS_REVIEW');
});

test('a proposal without a town is rejected by the deterministic rules', async () => {
  const r = await proposeStructure(LINES, 'ES', fake({ street: 'Avenida Diagonal', houseNumber: '477', postalCode: '08036', city: '', confidence: 0.9 }));
  assert.equal(r.status, 'REJECTED');
  assert.match(r.reason, /TOWN_MISSING/);
});

test('prose instead of JSON is rejected', async () => {
  const r = await proposeStructure(LINES, 'ES', async () => 'Sure! The city is Barcelona.');
  assert.equal(r.status, 'REJECTED');
});

test('pain.002 rejects are grouped by root cause', () => {
  const xml = `<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.002.001.10"><CstmrPmtStsRpt><OrgnlPmtInfAndSts>
    <TxInfAndSts><OrgnlEndToEndId>E2E-0001</OrgnlEndToEndId><TxSts>ACSC</TxSts></TxInfAndSts>
    <TxInfAndSts><OrgnlEndToEndId>E2E-0002</OrgnlEndToEndId><TxSts>RJCT</TxSts><StsRsnInf><Rsn><Cd>AC04</Cd></Rsn></StsRsnInf></TxInfAndSts>
    <TxInfAndSts><OrgnlEndToEndId>E2E-0003</OrgnlEndToEndId><TxSts>RJCT</TxSts><StsRsnInf><Rsn><Cd>BE04</Cd></Rsn><AddtlInf>Creditor address missing town</AddtlInf></StsRsnInf></TxInfAndSts>
  </OrgnlPmtInfAndSts></CstmrPmtStsRpt></Document>`;
  const r = parsePain002(xml);
  assert.equal(r.total, 3);
  assert.equal(r.rejected, 2);
  assert.deepEqual(r.byRootCause, { ACCOUNT: 1, ADDRESS: 1 });
  assert.equal(r.transactions[2].info, 'Creditor address missing town');
});
