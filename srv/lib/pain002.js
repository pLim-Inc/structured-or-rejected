'use strict';
/**
 * Reads a pain.002 payment status report and groups rejects by root cause,
 * so that an address reject goes back to master data and not to a treasury inbox.
 */
const ROOT_CAUSE = {
  // ISO 20022 external status reason codes
  BE04: 'ADDRESS', // MissingCreditorAddress
  BE07: 'ADDRESS', // MissingDebtorAddress
  RR02: 'ADDRESS', // MissingDebtorNameOrAddress
  RR03: 'ADDRESS', // MissingCreditorNameOrAddress
  AC01: 'ACCOUNT', // IncorrectAccountNumber
  AC04: 'ACCOUNT', // ClosedAccountNumber
  AC06: 'ACCOUNT', // BlockedAccount
  RC01: 'BANK',    // BankIdentifierIncorrect
  FF01: 'FORMAT',  // InvalidFileFormat
};

const tag = n => `(?:[\\w.-]+:)?${n}`;
const one = (src, n) => ((src.match(new RegExp(`<${tag(n)}>([\\s\\S]*?)</${tag(n)}>`)) || [])[1] || '').trim();

function parsePain002(xml) {
  const txRe = new RegExp(`<${tag('TxInfAndSts')}>([\\s\\S]*?)</${tag('TxInfAndSts')}>`, 'g');
  const transactions = [...xml.matchAll(txRe)].map(m => {
    const code = one(one(m[1], 'StsRsnInf'), 'Cd');
    return {
      endToEndId: one(m[1], 'OrgnlEndToEndId'),
      status: one(m[1], 'TxSts'),              // ACCP, ACSC, RJCT, PDNG...
      reasonCode: code,
      info: one(m[1], 'AddtlInf'),
      rootCause: code ? (ROOT_CAUSE[code] || 'OTHER') : null,
    };
  });
  const rejected = transactions.filter(t => t.status === 'RJCT');
  const byRootCause = rejected.reduce((acc, t) => ((acc[t.rootCause || 'OTHER'] = (acc[t.rootCause || 'OTHER'] || 0) + 1), acc), {});
  return { total: transactions.length, rejected: rejected.length, byRootCause, transactions };
}

module.exports = { parsePain002, ROOT_CAUSE };
