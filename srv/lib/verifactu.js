'use strict';
/**
 * VERI*FACTU record chain verifier (RD 1007/2023, Orden HAC/1177/2024).
 *
 * This is an AUDIT tool: it recomputes the SHA-256 fingerprint ("huella") of exported
 * billing records and tells you where a chain breaks. It does not issue invoices.
 * An application that issues invoices is itself a billing system (SIF) under the
 * regulation and carries the producer's obligations. In SAP, issuing belongs to
 * SAP Document and Reporting Compliance.
 *
 * Field order follows the AEAT specification for fingerprint generation (v0.1.2):
 *   alta:       IDEmisorFactura, NumSerieFactura, FechaExpedicionFactura, TipoFactura,
 *               CuotaTotal, ImporteTotal, Huella (previous), FechaHoraHusoGenRegistro
 *   anulacion:  IDEmisorFacturaAnulada, NumSerieFacturaAnulada, FechaExpedicionFacturaAnulada,
 *               Huella (previous), FechaHoraHusoGenRegistro
 */
const { createHash } = require('node:crypto');

const v = x => (x == null ? '' : String(x).trim());
const sha256 = s => createHash('sha256').update(s, 'utf8').digest('hex').toUpperCase();

function altaString(r, previousHash = '') {
  return [
    ['IDEmisorFactura', r.issuerNif],
    ['NumSerieFactura', r.seriesNumber],
    ['FechaExpedicionFactura', r.issueDate],       // DD-MM-YYYY
    ['TipoFactura', r.invoiceType],                // F1, F2, R1...
    ['CuotaTotal', r.totalTax],
    ['ImporteTotal', r.totalAmount],
    ['Huella', previousHash],
    ['FechaHoraHusoGenRegistro', r.generatedAt],   // ISO 8601 with offset
  ].map(([k, val]) => `${k}=${v(val)}`).join('&');
}

function anulacionString(r, previousHash = '') {
  return [
    ['IDEmisorFacturaAnulada', r.issuerNif],
    ['NumSerieFacturaAnulada', r.seriesNumber],
    ['FechaExpedicionFacturaAnulada', r.issueDate],
    ['Huella', previousHash],
    ['FechaHoraHusoGenRegistro', r.generatedAt],
  ].map(([k, val]) => `${k}=${v(val)}`).join('&');
}

function recordHash(record, previousHash = '') {
  const s = record.kind === 'anulacion' ? anulacionString(record, previousHash) : altaString(record, previousHash);
  return sha256(s);
}

/**
 * records: oldest first, each with the stored fingerprint in `hash`.
 * Returns { ok, checked, brokenAt, expected, found }.
 */
function verifyChain(records) {
  let previous = '';
  for (let i = 0; i < records.length; i++) {
    const expected = recordHash(records[i], previous);
    if (expected !== v(records[i].hash).toUpperCase()) {
      return { ok: false, checked: i, brokenAt: i, expected, found: records[i].hash };
    }
    previous = expected;
  }
  return { ok: true, checked: records.length, brokenAt: null };
}

module.exports = { altaString, anulacionString, recordHash, verifyChain };
