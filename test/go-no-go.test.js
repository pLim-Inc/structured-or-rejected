'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluate } = require('../scripts/go-no-go');
const criteria = require('../cutover/criteria.json');

test('the sample status of 4 March 2027 is a GO', () => {
  const r = evaluate(criteria, require('../cutover/status.sample.json'));
  assert.equal(r.go, true);
  assert.deepEqual(r.failed, []);
});

test('three criteria below threshold make a NO-GO and are named', () => {
  const r = evaluate(criteria, require('../cutover/status.no-go.sample.json'));
  assert.equal(r.go, false);
  assert.deepEqual(r.failed, ['G1', 'G8', 'G10']);
});

test('a missing metric is a failure', () => {
  const status = { ...require('../cutover/status.sample.json') };
  delete status.bankConfirmed;
  const r = evaluate(criteria, status);
  assert.equal(r.go, false);
  assert.deepEqual(r.failed, ['G5']);
});
