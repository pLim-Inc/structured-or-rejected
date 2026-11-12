'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { classify, toPstlAdr, lintPain001 } = require('../srv/lib/address');

test('fully structured address is payable', () => {
  const r = classify({ street: 'Calle Principal', houseNumber: '123', postalCode: '28001', city: 'Madrid', country: 'es' });
  assert.equal(r.format, 'STRUCTURED');
  assert.equal(r.payable, true);
  assert.deepEqual(r.issues, []);
});

test('town and country plus free text is hybrid', () => {
  const r = classify({ city: 'Madrid', country: 'ES', freeText: 'Calle Principal 123' });
  assert.equal(r.format, 'HYBRID');
  assert.equal(r.payable, true);
});

test('free text only is unstructured and not payable', () => {
  const r = classify({ freeText: ['Empresa ABC, Calle Principal 123', 'Madrid, 28001, España'] });
  assert.equal(r.format, 'UNSTRUCTURED');
  assert.equal(r.payable, false);
  assert.ok(r.issues.some(i => i.code === 'TOWN_MISSING'));
});

test('country names are rejected, codes are required', () => {
  const r = classify({ city: 'Madrid', country: 'Spain' });
  assert.equal(r.payable, false);
  assert.ok(r.issues.some(i => i.code === 'COUNTRY_INVALID'));
});

test('hybrid allows two lines of 70 characters at most', () => {
  const three = classify({ city: 'Madrid', country: 'ES', freeText: ['a', 'b', 'c'] });
  assert.ok(three.issues.some(i => i.code === 'TOO_MANY_LINES'));
  assert.equal(three.payable, false);
  const long = classify({ city: 'Madrid', country: 'ES', freeText: ['x'.repeat(71)] });
  assert.ok(long.issues.some(i => i.code === 'LINE_TOO_LONG'));
});

test('hybrid lines must not repeat structured data', () => {
  const r = classify({ city: 'Madrid', postalCode: '28001', country: 'ES', freeText: ['Calle Principal 123, 28001 Madrid'] });
  assert.equal(r.payable, true); // a warning, not a reject
  assert.equal(r.issues.filter(i => i.code === 'DUPLICATED_DATA').length, 2);
});

test('house number hidden in the street field is flagged', () => {
  const r = classify({ street: 'Calle Principal 123', city: 'Madrid', country: 'ES' });
  assert.equal(r.format, 'STRUCTURED');
  assert.ok(r.issues.some(i => i.code === 'HOUSE_NUMBER_IN_STREET'));
});

test('town name longer than 35 characters is an error', () => {
  const r = classify({ city: 'x'.repeat(36), country: 'ES' });
  assert.ok(r.issues.some(i => i.code === 'TOO_LONG'));
  assert.equal(r.payable, false);
});

test('toPstlAdr emits elements in schema order and escapes XML', () => {
  const xml = toPstlAdr({ street: 'Rua A & B', houseNumber: '7', postalCode: '1000-001', city: 'Lisboa', country: 'PT' });
  assert.equal(xml, [
    '<PstlAdr>',
    '  <StrtNm>Rua A &amp; B</StrtNm>',
    '  <BldgNb>7</BldgNb>',
    '  <PstCd>1000-001</PstCd>',
    '  <TwnNm>Lisboa</TwnNm>',
    '  <Ctry>PT</Ctry>',
    '</PstlAdr>',
  ].join('\n'));
});

test('toPstlAdr refuses an unstructured address', () => {
  assert.throws(() => toPstlAdr({ freeText: 'Somewhere 1, Nowhere' }), /not payable/);
});

test('lintPain001 classifies each party in a payment file', () => {
  const xml = fs.readFileSync(path.join(__dirname, '..', 'samples', 'pain001-mixed.xml'), 'utf8');
  const { summary, findings } = lintPain001(xml);
  assert.deepEqual(summary, { STRUCTURED: 2, HYBRID: 1, UNSTRUCTURED: 1 });
  const bad = findings.find(f => f.format === 'UNSTRUCTURED');
  assert.equal(bad.role, 'Cdtr');
  assert.equal(bad.name, 'Proveedor Tres SL');
  assert.equal(bad.payable, false);
});
