#!/usr/bin/env node
'use strict';
/* v1.17: three-chapter Korean learning, all level mappings, actual click flow and old-save migration. */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const base=__dirname;
const index=fs.readFileSync(path.join(base,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(base,'sw.js'),'utf8');
const files=[...index.matchAll(/<script\s+src="\.\/([^"?]+\.js)(?:\?[^"]*)?"/g)].map(m=>m[1]);
const required=['concept-data.js','concept-advanced-v17.js','app.js'];
for(const file of required)assert.equal(files.filter(x=>x===file).length,1,'Each concept source loads exactly once: '+file);
assert.ok(files.indexOf(required[0])<files.indexOf(required[1])&&files.indexOf(required[1])<files.indexOf(required[2]),'Theory and contrast modules must precede app');
for(const file of required)assert.ok(sw.includes('"./'+file+'?v=1.17.0"'),'Precache '+file);
const courseModules=['data.js','data-extra.js','data-advanced.js','data-interactive.js','levels-beyond-topik.js','data-core-practice.js','data-super-advanced.js','course-v15-practical.js'];
const w={};
const context=vm.createContext({window:w,console});
for(const file of courseModules.concat(required.slice(0,2)))vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'),context,{filename:file,timeout:10000});
const lib=w.KB_CONCEPT_TOPICS,map=w.KB_LESSON_CONCEPTS,contrast=w.KB_CONCEPT_CONTRAST;
assert.equal(w.KB_LESSONS.length,68);
assert.equal(w.KB_QUESTIONS.length,524);
assert.equal(Object.keys(lib).length,44);
assert.equal(Object.keys(contrast).length,44);
assert.equal(Object.keys(map).length,68);
assert.equal(new Set(w.KB_LESSONS.map(l=>l.id)).size,68);
for(const lesson of w.KB_LESSONS){
 const topic=lib[map[lesson.id]],detail=contrast[map[lesson.id]];
 assert.ok(topic&&detail,'Missing linked three-chapter theory for '+lesson.id);
 for(const field of ['title','explain','ko','ja','tip']){
  assert.ok(typeof topic[field]==='string'&&topic[field].trim(),lesson.id+': first '+field);
  assert.ok(typeof detail[field]==='string'&&detail[field].trim(),lesson.id+': second '+field);
 }
 assert.ok(detail.explain.length>=40,'Contrast explanation too brief for '+lesson.id);
 assert.ok(/[가-힣]/.test(detail.ko),'Missing Korean comparison example for '+lesson.id);
 assert.ok(Array.isArray(topic.check.options)&&topic.check.options.length===4);
 assert.ok(Number.isInteger(topic.check.answer)&&topic.check.answer>=0&&topic.check.answer<=3);
 const eligible=lesson.questions.filter(q=>q.options&&q.options.length===4&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4);
 assert.ok(eligible.length>=3,'Worked example and two independent checks needed: '+lesson.id);
 assert.ok(eligible[0]!==eligible[1]&&eligible[1]!==eligible[eligible.length-1],'Check tasks must not repeat');
}
function runApp(initial=null){
 const storage=new Map();
 if(initial)storage.set('kotobaBridge.progress.v1',JSON.stringify(initial));
 const listeners={};
 const element={innerHTML:''};
 const doc={getElementById(id){return id==='app'?element:null;},querySelector(){return null;},
 addEventListener(type,cb){(listeners[type]||(listeners[type]=[])).push(cb);}};
 const sandbox={window:w,document:doc,localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},console,Date,Math};
 vm.createContext(sandbox);
 vm.runInContext(fs.readFileSync(path.join(base,'app.js'),'utf8'),sandbox,{filename:'app.js',timeout:10000});
 assert.ok(element.innerHTML.includes('学習方法を選ぶ'));
 assert.equal((listeners.click||[]).length,1);
 const click=(action,attrs={})=>listeners.click[0]({target:{closest:()=>({dataset:{action,...attrs}})}});
 const saved=()=>JSON.parse(storage.get('kotobaBridge.progress.v1')||'null');
 return {click,saved,element,storage};
}
const app=runApp();
for(const lesson of w.KB_LESSONS){
 app.click('open-concept',{id:lesson.id});
 assert.ok(app.element.innerHTML.includes('3章に分けて学びます'),'Lesson missing three chapters: '+lesson.id);
 assert.ok(app.element.innerHTML.includes(lib[map[lesson.id]].title));
 app.click('concept-next');
 assert.ok(app.element.innerHTML.includes(contrast[map[lesson.id]].title),'Second chapter must be distinct: '+lesson.id);
 app.click('concept-next');
 assert.ok(app.element.innerHTML.includes('例題を読み解く'),'Worked example missing: '+lesson.id);
 app.click('concept-prev');
 assert.ok(app.element.innerHTML.includes(contrast[map[lesson.id]].title));
}
app.click('open-lesson',{id:'g11'});
assert.ok(app.element.innerHTML.includes('概念を学ぶ'),'The original lesson should keep the theory entry');
app.click('open-concept',{id:'g11'});
app.click('concept-answer',{i:'0'});
assert.ok(app.element.innerHTML.includes('もう一度確認しましょう'),'Incorrect check should explain failure');
assert.equal(app.saved()?.concepts?.g11,undefined,'Incorrect check must not mark completed');
app.click('concept-retry');
app.click('concept-answer',{i:'1'});
assert.ok(app.element.innerHTML.includes('正解！この章を完了しました'));
assert.equal(app.saved().concepts.g11.steps[0],true);
assert.equal(app.saved().concepts.g11.done,false,'A single completed chapter is not a whole course');
app.click('concept-next');
const lesson=w.KB_LESSONS.find(l=>l.id==='g11');
const eligible=lesson.questions.filter(q=>q.options&&q.options.length===4&&Number.isInteger(q.answer));
app.click('concept-answer',{i:String(eligible[1].answer)});
assert.equal(app.saved().concepts.g11.steps[1],true);
assert.equal(app.saved().concepts.g11.done,false,'Two chapter checks do not finish the course');
app.click('concept-next');
app.click('concept-answer',{i:String(eligible[eligible.length-1].answer)});
assert.deepEqual(Array.from(app.saved().concepts.g11.steps),[true,true,true]);
assert.equal(app.saved().concepts.g11.done,true,'Three complete checks mark the lesson as studied');
assert.ok(app.element.innerHTML.includes('全章修了'));
app.click('open-lesson',{id:'g11'});
app.click('start-lesson',{id:'g11'});
assert.ok(app.element.innerHTML.includes('チャレンジ'),'Quiz flow must stay accessible');
assert.equal(app.saved().session.lessonId,'g11');
assert.equal(app.saved().version,1,'Original save schema should keep version one');
const legacy={version:1,xp:41,streak:2,lastActive:'2026-10-20',progress:{g11:{best:1,attempts:2,last:'2026-10-20'}},facts:{},awarded:{},history:[],concepts:{g11:{done:true,at:'2026-10-20'}},session:null};
const migrated=runApp(legacy);
migrated.click('open-concept',{id:'g11'});
assert.ok(migrated.element.innerHTML.includes('1 / 3 章完了'),'Existing one-step completion must count as first chapter');
assert.equal(migrated.saved().xp,41);
migrated.click('concept-next');
migrated.click('concept-answer',{i:String(eligible[1].answer)});
assert.deepEqual(Array.from(migrated.saved().concepts.g11.steps),[true,true,false]);
assert.equal(migrated.saved().concepts.g11.done,true,'Legacy done marker must not be erased');
assert.equal(migrated.saved().progress.g11.best,1,'Earlier lesson scores must stay intact');
console.log('PASS Kotoba v1.17 concept chapters: 44 authored comparison topics, 68 lessons x 3 stages = 204 chapters; answer/feedback, step saves, legacy migration, 524 prior quiz questions intact');
