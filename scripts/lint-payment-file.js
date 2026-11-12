#!/usr/bin/env node
'use strict';
/**
 * Usage: node scripts/lint-payment-file.js <pain.001 file> [more files...]
 * Prints how many postal addresses in each file are structured, hybrid or unstructured,
 * and lists the parties that would be rejected once unstructured addresses are retired.
 */
const fs = require('node:fs');
const { lintPain001 } = require('../srv/lib/address');

const files = process.argv.slice(2);
if (!files.length) { console.error('Usage: lint-payment-file <pain.001.xml> [...]'); process.exit(2); }

let atRisk = 0;
for (const file of files) {
  const { summary, findings } = lintPain001(fs.readFileSync(file, 'utf8'));
  console.log(`\n${file}`);
  console.table(summary);
  for (const f of findings.filter(x => !x.payable)) {
    atRisk++;
    console.log(`  AT RISK  ${f.role.padEnd(9)} ${f.name}  ->  ${f.issues.map(i => i.code).join(', ')}`);
  }
}
process.exit(atRisk ? 1 : 0);
