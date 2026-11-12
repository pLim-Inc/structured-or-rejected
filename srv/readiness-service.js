'use strict';
const cds = require('@sap/cds');
const { classify, toPstlAdr, lintPain001 } = require('./lib/address');

module.exports = class ReadinessService extends cds.ApplicationService {
  init() {
    const { PayeeAddresses } = this.entities;

    // The verdict is computed, never typed: every write is re-classified.
    const verdict = row => {
      const r = classify(row);
      return { format: r.format, payable: r.payable, issues: r.issues.map(i => i.code).join(',') };
    };

    this.before('CREATE', PayeeAddresses, req => {
      for (const row of [].concat(req.data)) Object.assign(row, verdict(row));
    });

    this.before('UPDATE', PayeeAddresses, async req => {
      const current = (await SELECT.one.from(req.subject)) || {};
      Object.assign(req.data, verdict({ ...current, ...req.data }));
    });

    this.on('summary', async () => {
      const rows = await SELECT.from(PayeeAddresses)
        .columns('format', 'count(*) as payees', 'sum(paidLast12m) as exposure')
        .groupBy('format');
      return rows.map(r => ({ format: r.format, payees: Number(r.payees), exposure: Number(r.exposure || 0) }));
    });

    this.on('pstlAdr', async req => {
      const { partner, addressId } = req.data;
      const row = await SELECT.one.from(PayeeAddresses).where({ partner, addressId });
      if (!row) return req.reject(404, `No address ${addressId} for partner ${partner}`);
      try { return toPstlAdr(row); } catch (e) { return req.reject(422, e.message); }
    });

    this.on('lintPaymentFile', req => JSON.stringify(lintPain001(req.data.xml || '').summary));

    return super.init();
  }
};
