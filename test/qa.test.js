'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { lintPain001 } = require('../srv/lib/address');
const { buildFile, cases } = require('../scripts/generate-qa-files');

for (const c of cases) {
  test(`${c.id} ${c.title}`, () => {
    const { findings } = lintPain001(buildFile(c));
    const debtor = findings.find(f => f.role === 'Dbtr');
    assert.equal(debtor.format, 'STRUCTURED');
    assert.equal(debtor.payable, true);

    const party = findings.find(f => f.role === (c.role || 'Cdtr'));
    assert.ok(party, `no ${c.role || 'Cdtr'} in the generated file`);
    assert.equal(party.format, c.expect.format);
    assert.equal(party.payable, c.expect.payable);
    assert.deepEqual(party.issues.map(i => i.code).sort(), [...c.expect.issues].sort());
  });
}

test('the catalogue and the generated files stay in step', () => {
  assert.equal(new Set(cases.map(c => c.id)).size, cases.length);
  assert.equal(cases.length, 12);
});
