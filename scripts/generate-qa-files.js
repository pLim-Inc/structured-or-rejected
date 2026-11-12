#!/usr/bin/env node
'use strict';
/**
 * Usage: node scripts/generate-qa-files.js [output folder]
 *
 * Writes one pain.001.001.09 file per case in qa/address-cases.json.
 * The addresses are written exactly as the case states them. Nothing is repaired,
 * because negative cases have to reach the linter, and the bank's test channel, as written.
 *
 * Before sending a file to a bank: replace the debtor account and agent with the
 * test account the bank gave you. All names and account numbers here are synthetic.
 */
const fs = require('node:fs');
const path = require('node:path');
const cases = require('../qa/address-cases.json');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const el = (tag, v, pad) => (v ? `${pad}<${tag}>${esc(v)}</${tag}>\n` : '');

// Raw on purpose: emits whatever the case holds, in schema order.
function pstlAdr(a, pad) {
  const body = el('StrtNm', a.street, pad + '  ') + el('BldgNb', a.houseNumber, pad + '  ') + el('PstBx', a.poBox, pad + '  ')
    + el('PstCd', a.postalCode, pad + '  ') + el('TwnNm', a.city, pad + '  ') + el('Ctry', a.country, pad + '  ')
    + (a.freeText || []).map(l => el('AdrLine', l, pad + '  ')).join('');
  return body ? `${pad}<PstlAdr>\n${body}${pad}</PstlAdr>\n` : '';
}
const party = (tag, p, pad) => `${pad}<${tag}>\n${el('Nm', p.name, pad + '  ')}${pstlAdr(p, pad + '  ')}${pad}</${tag}>\n`;

const DEBTOR = { name: 'Alba Industrial SA', street: 'Calle de Serrano', houseNumber: '41', postalCode: '28001', city: 'Madrid', country: 'ES' };

function buildFile(c) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- ${c.id}: ${esc(c.title)}. Synthetic test file. -->
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>QA-${c.id}</MsgId>
      <CreDtTm>2027-02-01T09:00:00</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>1.00</CtrlSum>
      <InitgPty><Nm>${esc(DEBTOR.name)}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>QA-${c.id}-PMT</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <ReqdExctnDt><Dt>2027-02-02</Dt></ReqdExctnDt>
${party('Dbtr', DEBTOR, '      ')}      <DbtrAcct><Id><IBAN>ES9121000418450200051332</IBAN></Id></DbtrAcct>
      <DbtrAgt><FinInstnId><BICFI>CAIXESBBXXX</BICFI></FinInstnId></DbtrAgt>
      <CdtTrfTxInf>
        <PmtId><EndToEndId>${c.id}</EndToEndId></PmtId>
        <Amt><InstdAmt Ccy="EUR">1.00</InstdAmt></Amt>
${party('Cdtr', c.creditor, '        ')}        <CdtrAcct><Id><IBAN>${c.creditor.iban}</IBAN></Id></CdtrAcct>
${c.ultimateCreditor ? party('UltmtCdtr', c.ultimateCreditor, '        ') : ''}      </CdtTrfTxInf>
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>
`;
}

module.exports = { buildFile, cases };

if (require.main === module) {
  const out = path.resolve(process.argv[2] || path.join(__dirname, '..', 'qa', 'files'));
  fs.mkdirSync(out, { recursive: true });
  for (const c of cases) fs.writeFileSync(path.join(out, `${c.id}.xml`), buildFile(c));
  console.table(cases.map(c => ({ case: c.id, title: c.title, gate: c.expect.payable ? 'pass' : 'hold', issues: c.expect.issues.join(', ') })));
  console.log(`${cases.length} files written to ${out}`);
}
