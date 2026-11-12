'use strict';
/**
 * AI proposes, rules decide, a person approves.
 *
 * proposeStructure() asks a language model to split free-text address lines into
 * ISO 20022 elements, then applies a guard the model cannot talk its way past:
 * every word of the proposal must already exist in the source text. A proposal that
 * invents a town, a postal code or a street is discarded.
 *
 * Only the address lines and the country leave your system: no name, IBAN or tax ID.
 */
const { classify } = require('./address');

const SYSTEM = `You split postal addresses into ISO 20022 elements.
Return only JSON: {"street":"","houseNumber":"","postalCode":"","city":"","confidence":0.0}.
Use only words that appear in the input. Leave a field empty when unsure. Never guess.`;

const tokens = s => String(s || '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/**
 * @param {string[]} lines   free-text address lines
 * @param {string}   country ISO 3166-1 alpha-2, taken from master data, never from the model
 * @param {(system: string, user: string) => Promise<string>} llm
 */
async function proposeStructure(lines, country, llm, { minConfidence = 0.8 } = {}) {
  const source = lines.join(' | ');
  const raw = await llm(SYSTEM, `Country: ${country}\nAddress: ${source}`);

  let p;
  try { p = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); }
  catch { return { status: 'REJECTED', reason: 'Model did not return JSON' }; }

  // Guard 1: nothing invented
  const known = new Set(tokens(source));
  const invented = ['street', 'houseNumber', 'postalCode', 'city']
    .flatMap(f => tokens(p[f]).filter(t => !known.has(t)).map(t => `${f}:${t}`));
  if (invented.length) return { status: 'REJECTED', reason: `Invented content (${invented.join(', ')})` };

  // Guard 2: the same deterministic rules as any other address
  const candidate = { street: p.street, houseNumber: p.houseNumber, postalCode: p.postalCode, city: p.city, country };
  const check = classify(candidate);
  if (!check.payable) return { status: 'REJECTED', reason: check.issues.map(i => i.code).join(', ') };

  // Guard 3: a person decides. Low confidence or any warning goes to the review queue.
  const clean = check.issues.length === 0 && Number(p.confidence) >= minConfidence;
  return { status: clean ? 'PROPOSED' : 'NEEDS_REVIEW', proposal: check.address, confidence: Number(p.confidence) || 0, issues: check.issues };
}

/**
 * Adapter for the generative AI hub in SAP AI Core (SAP Cloud SDK for AI, v2 API).
 * Needs an AI Core service binding; not exercised by the tests.
 */
function genAiHubLlm(modelName = process.env.AI_MODEL || 'gpt-5') {
  const { OrchestrationClient } = require('@sap-ai-sdk/orchestration');
  return async (system, user) => {
    const client = new OrchestrationClient({
      promptTemplating: {
        model: { name: modelName },
        prompt: { template: [{ role: 'system', content: system }, { role: 'user', content: '{{?input}}' }] },
      },
    });
    const response = await client.chatCompletion({ placeholderValues: { input: user } });
    return response.getContent();
  };
}

module.exports = { proposeStructure, genAiHubLlm };
