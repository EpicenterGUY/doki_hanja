#!/usr/bin/env node
/* Audit the exact JS module order served by index.html. No network or dependencies. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = __dirname;
const index = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
const files = [...index.matchAll(/<script\s+src="\.\/([^"?]+\.js)(?:\?[^"]*)?"/g)]
  .map(m => m[1])
  .filter(f => /^vocabulary(?:-|\.js)/.test(f) || /^memory-(?:data|extra)\.js$/.test(f) ||
    /^grammar-(?:guide-extra|core-gaps|super-advanced|v12-practical-contrasts)\.js$/.test(f));
const sandbox = {window: {KB_VOCAB: [], KB_MEMORY_CARDS: []}, console};
vm.createContext(sandbox);
for (const file of files) {
  const source = fs.readFileSync(path.join(base, file), 'utf8');
  try {
    vm.runInContext(source, sandbox, {filename: file, timeout: 5000});
  } catch (e) {
    console.error('Error loading', file, e.stack || e);
    process.exit(1);
  }
}
const words = sandbox.window.KB_VOCAB;
const cards = sandbox.window.KB_MEMORY_CARDS.filter(x => x.section === 'grammar');
const levels = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8'];
const counts = Object.fromEntries(levels.map(l => [l, {words: 0, examples: 0, missing: 0, pos: {}}]));
const issues = [];
function unique(items, field, group) {
  const seen = new Set();
  for (const item of items) {
    const value = item[field];
    if (!value) {issues.push(group + ': missing ' + field); continue;}
    if (seen.has(value)) issues.push(group + ': duplicate ' + field + '=' + value);
    seen.add(value);
  }
}
unique(words, 'id', 'vocab');
unique(words, 'ko', 'vocab');
unique(cards, 'id', 'grammar');
unique(cards, 'front', 'grammar');
for (const w of words) {
  if (!counts[w.level]) {issues.push('Invalid level for ' + w.ko + ': ' + w.level); continue;}
  const c = counts[w.level];
  c.words++;
  c.pos[w.pos || '(unset)'] = (c.pos[w.pos || '(unset)'] || 0) + 1;
  if (w.exKo && w.exJa) c.examples++;
  else {
    c.missing++;
    if (!!w.exKo !== !!w.exJa) issues.push('Partial translation for ' + w.ko);
  }
}
for (const g of cards) {
  if (!g.example || !g.translation || !g.back || !g.level) issues.push('Incomplete grammar card ' + g.id);
}
// Catch regressions where a JS data module is loaded on the page but omitted from offline cache.
const cacheSource = fs.readFileSync(path.join(base, 'sw.js'), 'utf8');
const indexSources = [...index.matchAll(/<script\s+src="\.\/([^"?]+\.js)(?:\?([^"]*))?"/g)]
  .map(m => './' + m[1] + (m[2] ? '?' + m[2] : ''));
for (const src of indexSources) {
  if (!cacheSource.includes(JSON.stringify(src))) issues.push('Offline cache missing ' + src);
}
const summary = {
  vocab: words.length,
  bilingualExamples: words.filter(w => w.exKo && w.exJa).length,
  missingExamples: words.filter(w => !w.exKo || !w.exJa).length,
  grammar: cards.length,
  levels: counts,
  checkedFiles: files.length,
  issues,
  v12: sandbox.window.KB_V12_CONTEXT_STATS || null,
  v13Examples: sandbox.window.KB_V13_CONTEXT_STATS || null,
  v13Vocabulary: sandbox.window.KB_V13_POS_STATS || null,
  v14Examples: sandbox.window.KB_V14_STATS || null
};
// Optional exhaustive missing-lemma report for precise editorial backfill planning.
if (process.argv.includes('--missing')) {
  const missing = Object.fromEntries(levels.map(level => [level,
    words.filter(w => w.level === level && (!w.exKo || !w.exJa)).map(w => ({id:w.id,ko:w.ko,pos:w.pos}))]));
  console.log(JSON.stringify({missing, totals: Object.fromEntries(levels.map(level => [level,missing[level].length]))},null,2));
} else if (process.argv.includes('--json')) console.log(JSON.stringify(summary, null, 2));
else {
  console.log('Kotoba Bridge vocab:', summary.vocab, '| bilingual examples:', summary.bilingualExamples,
    '| missing:', summary.missingExamples, '| grammar:', summary.grammar);
  for (const [level, c] of Object.entries(counts)) {
    console.log(level.padEnd(3), 'vocab:', String(c.words).padStart(4),
      'examples:', String(c.examples).padStart(4), 'missing:', String(c.missing).padStart(4),
      'POS:', JSON.stringify(c.pos));
  }
  console.log('v1.2 examples:', JSON.stringify(summary.v12));
  console.log('v1.3 contextual examples:', JSON.stringify(summary.v13Examples));
  console.log('v1.3 POS expansion:', JSON.stringify(summary.v13Vocabulary));
  console.log('v1.4 missing-example remediation:', JSON.stringify(summary.v14Examples));
  console.log('Loaded modules:', files.length, '| structural issues:', issues.length);
  for (const issue of issues.slice(0, 30)) console.error(' -', issue);
}
if (issues.length) process.exitCode = 1;
