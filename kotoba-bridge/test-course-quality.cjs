#!/usr/bin/env node
'use strict';
/* Ensure v1.15.0 course expansion preserves existing lessons and question IDs. */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const base=__dirname;
const index=fs.readFileSync(path.join(base,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(base,'sw.js'),'utf8');
const sources=[...index.matchAll(/<script\s+src="\.\/([^"?]+\.js)(?:\?[^"]*)?"/g)].map(m=>m[1]);
const stop=sources.indexOf('vocabulary.js');
assert.ok(stop>0,'Course scripts must be loaded before the vocabulary modules');
const courseSources=sources.slice(0,stop);
const newFile='course-v15-practical.js';
assert.equal(courseSources.filter(f=>f===newFile).length,1,'Load the new course pack exactly once');
assert.ok(sw.includes(JSON.stringify('./'+newFile+'?v=1.15.0')),'The offline cache must include the course pack');
function load(excludeNew){
  const sandbox={window:{},console};
  vm.createContext(sandbox);
  for(const file of courseSources){
    if(excludeNew&&file===newFile)continue;
    vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'),sandbox,{filename:file,timeout:5000});
  }
  return sandbox.window;
}
const before=load(true),after=load(false);
const additions=['c15h0','c15v1','c15g2','c15r2','c15g3','c15r3','c15g4','c15r4','c15r5','c15r6','c15r7','c15r8'];
const added=new Set(additions);
assert.equal(after.KB_LESSONS.length,before.KB_LESSONS.length+12);
assert.equal(after.KB_QUESTIONS.length,before.KB_QUESTIONS.length+96);
assert.equal(after.KB_LESSONS.filter(l=>added.has(l.id)).length,12);
assert.equal(new Set(after.KB_LESSONS.map(l=>l.id)).size,after.KB_LESSONS.length);
assert.equal(new Set(after.KB_QUESTIONS.map(q=>q.id)).size,after.KB_QUESTIONS.length);
const oldLesson=(l)=>JSON.stringify(l);
const oldQuestion=(q)=>JSON.stringify(q);
for(const l of before.KB_LESSONS){
  const current=after.KB_LESSONS.find(x=>x.id===l.id);
  assert.ok(current,'Prior lesson missing: '+l.id);
  assert.equal(oldLesson(current),oldLesson(l),'Prior lesson changed: '+l.id);
}
for(const q of before.KB_QUESTIONS){
  const current=after.KB_QUESTIONS.find(x=>x.id===q.id);
  assert.ok(current,'Prior question missing: '+q.id);
  assert.equal(oldQuestion(current),oldQuestion(q),'Prior question changed: '+q.id);
}
const categories={'한글':'文字','어휘':'語彙','문법':'文法','독해':'読解'};
const levels=new Set(['L0','L1','L2','L3','L4','L5','L6','L7','L8']);
const seenPrompt=new Set();
for(const id of additions){
  const l=after.KB_LESSONS.find(x=>x.id===id);
  assert.ok(l,'Missing v1.15 lesson '+id);
  assert.ok(levels.has(l.level));
  assert.ok(categories[l.category]);
  assert.equal(l.questions.length,8,'Expected eight carefully reviewed prompts in '+id);
  assert.ok(l.title && l.ko && l.summary);
  for(let i=0;i<l.questions.length;i++){
    const q=l.questions[i];
    assert.equal(q.kind,categories[l.category]);
    assert.ok(typeof q.prompt==='string' && q.prompt.trim());
    assert.ok(typeof q.explain==='string' && q.explain.trim());
    assert.ok(Array.isArray(q.options)&&q.options.length===4);
    assert.equal(new Set(q.options).size,4,'Duplicated choice: '+id+'-'+i);
    assert.ok(q.options.every(o=>typeof o==='string'&&o.trim()));
    assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4);
    assert.ok(typeof q.options[q.answer]==='string' && q.options[q.answer].trim());
    assert.equal(Boolean(q.passage),l.category==='독해','Reading passage missing or misplaced: '+id+'-'+i);
    const promptId=id+'|'+q.prompt;
    assert.ok(!seenPrompt.has(promptId),'Repeated question: '+promptId);
    seenPrompt.add(promptId);
    const assembled=after.KB_QUESTIONS.find(x=>x.id===id+'-'+i);
    assert.ok(assembled);
    assert.equal(assembled.lessonId,id);
    assert.equal(assembled.level,l.level);
  }
}
assert.ok(before.KB_LESSONS.length>=56 && before.KB_QUESTIONS.length>=428);
console.log('PASS Kotoba practical course QA:',after.KB_LESSONS.length,'lessons,',after.KB_QUESTIONS.length,'questions, 12 new units / 96 questions; previous content stable');
