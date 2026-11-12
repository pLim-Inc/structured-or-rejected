#!/usr/bin/env node
'use strict';
/**
 * Usage: node scripts/go-no-go.js <status.json> [criteria.json]
 *
 * Evaluates the go/no-go criteria against the measured status of a cutover wave.
 * A metric that is missing counts as a failure: no data is a no.
 * Exit code 0 = GO, 1 = NO-GO.
 */
const fs = require('node:fs');
const path = require('node:path');

const OPS = { '>=': (a, b) => a >= b, '<=': (a, b) => a <= b, '==': (a, b) => a === b };

function evaluate(criteria, status) {
  const rows = criteria.map(c => {
    const value = status[c.metric];
    const known = value !== undefined && value !== null;
    return { id: c.id, criterion: c.label, required: `${c.op} ${c.threshold}`, measured: known ? value : 'no data', owner: c.owner, pass: known && OPS[c.op](value, c.threshold) };
  });
  return { go: rows.every(r => r.pass), failed: rows.filter(r => !r.pass).map(r => r.id), rows };
}

module.exports = { evaluate };

if (require.main === module) {
  const [statusFile, criteriaFile = path.join(__dirname, '..', 'cutover', 'criteria.json')] = process.argv.slice(2);
  if (!statusFile) { console.error('Usage: go-no-go <status.json> [criteria.json]'); process.exit(2); }
  const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
  const result = evaluate(JSON.parse(fs.readFileSync(criteriaFile, 'utf8')), status);
  console.log(`${status.wave || 'Cutover wave'} · status as of ${status.asOf || 'unknown date'}`);
  console.table(result.rows.map(r => ({ ...r, pass: r.pass ? 'yes' : 'NO' })));
  console.log(result.go ? 'GO' : `NO-GO: ${result.failed.join(', ')}`);
  process.exit(result.go ? 0 : 1);
}
