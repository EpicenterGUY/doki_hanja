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
// Every vocabulary level now has complete bilingual examples (v1.9.0).
// Fail CI on any new missing pair or malformed usage fields.
for (const level of levels) {
  if (counts[level].missing > 0) issues.push(level + ': bilingual example coverage regressed by ' + counts[level].missing + ' cards');
}
for (const w of words) {
  if (typeof w.ja !== 'string' || !w.ja.trim()) issues.push('Missing Japanese gloss for ' + w.ko);
  if (typeof w.exKo !== 'string' || !w.exKo.trim() || typeof w.exJa !== 'string' || !w.exJa.trim()) {
    issues.push('Empty bilingual example field for ' + w.ko);
  }
  if (w.altExampleKo || w.altExampleJa) {
    if (typeof w.altExampleKo !== 'string' || !w.altExampleKo.trim() || typeof w.altExampleJa !== 'string' || !w.altExampleJa.trim()) {
      issues.push('Incomplete contrast example for ' + w.ko);
    }
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
// Editorial diagnostics are informational; never reject a valid inflected phrase solely on shape.
const lexicalWarnings = words.filter(w =>
  ['動詞','形容詞'].includes(w.pos) && !w.ko.includes(' ') && !w.ko.endsWith('다')
).map(w => ({id:w.id,ko:w.ko,pos:w.pos,level:w.level,reason:'Check dictionary form'}));
const normalizedCollisions=[];
const normalized=new Map();
for(const w of words){
  const norm=String(w.ko||'').normalize('NFC').replace(/\s+/g,'');
  if(normalized.has(norm) && normalized.get(norm).ko !== w.ko){
    normalizedCollisions.push({a:normalized.get(norm).ko,b:w.ko});
  }else if(!normalized.has(norm)) normalized.set(norm,w);
}

const visibleCollisions=[];
const visibleSeen=new Map();
for(const w of words){
  const form=w.displayKo||w.ko;
  if(visibleSeen.has(form)) visibleCollisions.push({a:visibleSeen.get(form).id,b:w.id,form});
  else visibleSeen.set(form,w);
}
if(visibleCollisions.length) issues.push('Duplicate displayed headwords: '+visibleCollisions.length);
const legacyAliases=sandbox.window.KB_VOCAB_ID_ALIASES||{};
for(const [obsolete,active] of Object.entries(legacyAliases)){
  if(words.some(w=>w.id===obsolete))issues.push('Legacy duplicate was not retired: '+obsolete);
  if(!words.some(w=>w.id===active))issues.push('Legacy ID target not found: '+active);
}
const editorialQueue=['기인되다','대두하다','종합적','주관적']
 .map(ko=>words.find(w=>w.ko===ko)).filter(Boolean)
 .map(w=>({id:w.id,ko:w.ko,pos:w.pos,level:w.level,reason:'Usage or dictionary citation review required'}));
const v22Audit=sandbox.window.KB_V22_POS_SENSE_AUDIT;
if(v22Audit){
  if(v22Audit.missing.length)issues.push('POS review targeted terms absent: '+v22Audit.missing.join(', '));
  if(v22Audit.applied!==v22Audit.candidates)issues.push('POS review not fully applied');
}
const requiredV22Pos={'이번':'名詞','쯤':'接尾辞','불가분의':'表現'};
for(const [ko,expectedPos] of Object.entries(requiredV22Pos)){
  const w=words.find(x=>x.ko===ko);
  if(!w||w.pos!==expectedPos)issues.push('POS correction regressed for '+ko+' (expected '+expectedPos+')');
}
if(!words.some(w=>w.ko==='맞히다'&&w.ja&&w.exKo&&w.exJa))
  issues.push('Missing separate 맞히다 card with bilingual context');
const summary = {
  vocab: words.length,
  bilingualExamples: words.filter(w => w.exKo && w.exJa).length,
  missingExamples: words.filter(w => !w.exKo || !w.exJa).length,
  grammar: cards.length,
  levels: counts,
  coveragePercent: words.length ? Number((words.filter(w => w.exKo && w.exJa).length / words.length * 100).toFixed(2)) : 0,
  checkedFiles: files.length,
  issues,
  lexicalWarnings,
  normalizedCollisions,
  visibleCollisions,
  legacyAliases,
  orthography: sandbox.window.KB_ORTHOGRAPHY_REVIEW || null,
  senseReview: sandbox.window.KB_V21_SENSE_AUDIT || null,
  posSenseReview: sandbox.window.KB_V22_POS_SENSE_AUDIT || null,
  editorialQueue,
  gradeReview: sandbox.window.KB_LEVEL_REVIEW || null,
  gradePromotion: sandbox.window.KB_GRADE_PROMOTION || null,
  polysemy: sandbox.window.KB_SENSE_REVIEW || null,
  v12: sandbox.window.KB_V12_CONTEXT_STATS || null,
  v13Examples: sandbox.window.KB_V13_CONTEXT_STATS || null,
  v13Vocabulary: sandbox.window.KB_V13_POS_STATS || null,
  v14Examples: sandbox.window.KB_V14_STATS || null,
  v15Core: sandbox.window.KB_V15_CORE_STATS || null,
  v15Advanced: sandbox.window.KB_V15_ADVANCED_STATS || null,
  v16Backfill: sandbox.window.KB_V16_BACKFILL || null,
  v17L4: sandbox.window.KB_V17_L4 || null,
  v17L5: sandbox.window.KB_V17_L5 || null,
  v17L6: sandbox.window.KB_V17_L6 || null,
  v18L4: sandbox.window.KB_V18_L4 || null,
  v18L5: sandbox.window.KB_V18_L5 || null,
  v18L6: sandbox.window.KB_V18_L6 || null,
  v19L5Argument: sandbox.window.KB_V19_L5_ARGUMENT || null,
  v19L5Language: sandbox.window.KB_V19_L5_LANGUAGE || null,
  v19L6Diplomacy: sandbox.window.KB_V19_L6_DIPLOMACY || null,
  v19L6Science: sandbox.window.KB_V19_L6_SCIENCE || null,
  v19L6Social: sandbox.window.KB_V19_L6_SOCIAL || null
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
  console.log('v1.5 L1-L3 examples:', JSON.stringify(summary.v15Core));
  console.log('v1.5 L4-L6 examples:', JSON.stringify(summary.v15Advanced));
  console.log('Grade recalibration:', JSON.stringify(summary.gradeReview && {proposals:summary.gradeReview.proposals,applied:summary.gradeReview.applied,notFound:summary.gradeReview.notFound.length}));
  console.log('Upward calibration:', JSON.stringify(summary.gradePromotion && {proposals:summary.gradePromotion.proposals,applied:summary.gradePromotion.applied}));
  console.log('Polysemy explanations:', JSON.stringify(summary.polysemy));
  console.log('V1.6 new bilingual examples:', JSON.stringify(summary.v16Backfill));
  console.log('V1.7 new L4/L5/L6 examples:', JSON.stringify([summary.v17L4,summary.v17L5,summary.v17L6]));
  console.log('V1.8 new L4/L5/L6 examples:', JSON.stringify([summary.v18L4,summary.v18L5,summary.v18L6]));
  console.log('V1.9 completed L5 and L6 examples:', JSON.stringify([summary.v19L5Argument,summary.v19L5Language,summary.v19L6Diplomacy,summary.v19L6Science,summary.v19L6Social]));
  console.log('Lexical/POS review flags:',lexicalWarnings.length,'spacing collisions:',normalizedCollisions.length);
  console.log('User-visible spelling review:', JSON.stringify(summary.orthography&&{proposals:summary.orthography.candidates,applied:summary.orthography.applied,examplesCorrected:summary.orthography.examplesCorrected,merged:summary.orthography.merged.length}));
  console.log('Meaning and homonym review:', JSON.stringify(summary.senseReview&&{candidates:summary.senseReview.candidates,applied:summary.senseReview.applied,missing:summary.senseReview.missing.length}));
  console.log('POS and polysemy review:', JSON.stringify(summary.posSenseReview&&{candidates:summary.posSenseReview.candidates,applied:summary.posSenseReview.applied,missing:summary.posSenseReview.missing.length,added:summary.posSenseReview.addedWords.length}));
  console.log('Display-name collisions:',visibleCollisions.length,'word-form review queue:',editorialQueue.length);
  console.log('Loaded modules:', files.length, '| structural issues:', issues.length);
  for (const issue of issues.slice(0, 30)) console.error(' -', issue);
}
if (issues.length) process.exitCode = 1;
