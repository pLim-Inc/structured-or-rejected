'use strict';
/**
 * ISO 20022 postal address readiness.
 *
 * classify()      -> STRUCTURED | HYBRID | UNSTRUCTURED | MISSING, plus the issues found
 * toPstlAdr()     -> <PstlAdr> fragment in schema order
 * lintPain001()   -> classifies every <PstlAdr> found in a payment file
 *
 * Rules implemented (CBPR+ / EPC guidance EPC153-22):
 *   - Town name and country are mandatory for structured and hybrid addresses.
 *   - A structured address carries no <AdrLine>.
 *   - A hybrid address carries at most 2 <AdrLine> of at most 70 characters,
 *     and those lines must not repeat data already sent in structured elements.
 */

// ISO 20022 PostalAddress24/27 maximum lengths
const MAX = { StrtNm: 70, BldgNb: 16, PstBx: 16, PstCd: 16, TwnNm: 35, AdrLine: 70 };
const MAX_HYBRID_LINES = 2;

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const clean = v => (v == null ? '' : String(v).replace(/\s+/g, ' ').trim());

function isCountry(code) {
  if (!/^[A-Z]{2}$/.test(code)) return false;
  try { return regionNames.of(code) !== code; } catch { return false; }
}

function normalise(input = {}) {
  const lines = Array.isArray(input.freeText)
    ? input.freeText
    : String(input.freeText ?? '').split(/\r?\n/);
  return {
    street: clean(input.street),
    houseNumber: clean(input.houseNumber),
    poBox: clean(input.poBox),
    postalCode: clean(input.postalCode),
    city: clean(input.city),
    country: clean(input.country).toUpperCase(),
    freeText: lines.map(clean).filter(Boolean),
  };
}

function classify(input) {
  const a = normalise(input);
  const issues = [];
  const add = (code, severity, message) => issues.push({ code, severity, message });

  const hasTown = a.city !== '';
  const hasCountry = isCountry(a.country);
  if (!hasTown) add('TOWN_MISSING', 'error', 'Town name is empty');
  if (!hasCountry) add('COUNTRY_INVALID', 'error', `Country "${a.country}" is not an ISO 3166-1 alpha-2 code`);

  for (const [field, tag] of [['street', 'StrtNm'], ['houseNumber', 'BldgNb'], ['poBox', 'PstBx'], ['postalCode', 'PstCd'], ['city', 'TwnNm']]) {
    if (a[field].length > MAX[tag]) add('TOO_LONG', 'error', `${tag} exceeds ${MAX[tag]} characters`);
  }

  // Data-quality findings: valid XML today, wrong data tomorrow
  if (a.street && !a.houseNumber && /\d/.test(a.street)) {
    add('HOUSE_NUMBER_IN_STREET', 'warning', 'Street holds a number but the house-number field is empty');
  }
  if (/\d{4,}/.test(a.city)) add('POSTCODE_IN_TOWN', 'warning', 'Town name looks like it contains a postal code');
  if (/^(p\.?\s?o\.?\s?box|apartado|postfach|bo[iî]te postale|bp)\b/i.test(a.street)) {
    add('PO_BOX_IN_STREET', 'warning', 'PO box stored in the street field; it belongs in PstBx');
  }

  if (a.freeText.length > MAX_HYBRID_LINES) add('TOO_MANY_LINES', 'error', `More than ${MAX_HYBRID_LINES} address lines`);
  a.freeText.forEach((line, i) => {
    if (line.length > MAX.AdrLine) add('LINE_TOO_LONG', 'error', `Address line ${i + 1} exceeds ${MAX.AdrLine} characters`);
    const l = line.toLowerCase();
    for (const v of [a.city, a.postalCode]) {
      if (v && l.includes(v.toLowerCase())) add('DUPLICATED_DATA', 'warning', `Address line ${i + 1} repeats "${v}"`);
    }
  });

  let format;
  if (hasTown && hasCountry) format = a.freeText.length ? 'HYBRID' : 'STRUCTURED';
  else if (a.freeText.length || a.street) format = 'UNSTRUCTURED';
  else format = 'MISSING';

  const errors = issues.filter(i => i.severity === 'error');
  return {
    format,
    // payable = survives the cut-off without a reject
    payable: (format === 'STRUCTURED' || format === 'HYBRID') && errors.length === 0,
    issues,
    address: a,
  };
}

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Builds <PstlAdr> in schema order. Throws when the address cannot be sent as structured or hybrid. */
function toPstlAdr(input, { indent = '  ' } = {}) {
  const r = classify(input);
  if (!r.payable) {
    const why = r.issues.filter(i => i.severity === 'error').map(i => i.code).join(', ') || r.format;
    throw new Error(`Address is not payable: ${why}`);
  }
  const a = r.address;
  const el = (tag, v) => (v ? `${indent}<${tag}>${esc(v)}</${tag}>\n` : '');
  return '<PstlAdr>\n'
    + el('StrtNm', a.street) + el('BldgNb', a.houseNumber) + el('PstBx', a.poBox)
    + el('PstCd', a.postalCode) + el('TwnNm', a.city) + el('Ctry', a.country)
    + a.freeText.map(l => el('AdrLine', l)).join('')
    + '</PstlAdr>';
}

/**
 * Classifies every postal address in a pain.001 / pacs.008 file.
 * Dependency-free on purpose: it tolerates namespace prefixes, it does not validate the schema.
 */
function lintPain001(xml) {
  const tag = n => `(?:[\\w.-]+:)?${n}`;
  const partyRe = new RegExp(`<(${tag('(?:Dbtr|Cdtr|UltmtDbtr|UltmtCdtr)')})>([\\s\\S]*?)</\\1>`, 'g');
  const one = (src, n) => (src.match(new RegExp(`<${tag(n)}>([\\s\\S]*?)</${tag(n)}>`)) || [])[1];
  const all = (src, n) => [...src.matchAll(new RegExp(`<${tag(n)}>([\\s\\S]*?)</${tag(n)}>`, 'g'))].map(m => m[1]);

  const findings = [];
  for (const m of xml.matchAll(partyRe)) {
    const role = m[1].replace(/^.*:/, '');
    const adr = one(m[2], 'PstlAdr');
    if (adr === undefined) { findings.push({ role, name: clean(one(m[2], 'Nm')), format: 'NONE', payable: true, issues: [] }); continue; }
    const r = classify({
      street: one(adr, 'StrtNm'), houseNumber: one(adr, 'BldgNb'), poBox: one(adr, 'PstBx'),
      postalCode: one(adr, 'PstCd'), city: one(adr, 'TwnNm'), country: one(adr, 'Ctry'),
      freeText: all(adr, 'AdrLine'),
    });
    findings.push({ role, name: clean(one(m[2], 'Nm')), format: r.format, payable: r.payable, issues: r.issues });
  }
  const summary = findings.reduce((acc, f) => ((acc[f.format] = (acc[f.format] || 0) + 1), acc), {});
  return { summary, findings };
}

module.exports = { classify, toPstlAdr, lintPain001, isCountry, MAX, MAX_HYBRID_LINES };
