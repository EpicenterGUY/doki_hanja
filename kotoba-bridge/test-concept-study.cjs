#!/usr/bin/env node
'use strict';
/* v1.16 Japanese-first concept study: content and actual app click-flow regression. */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const base=__dirname;
const index=fs.readFileSync(path.join(base,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(base,'sw.js'),'utf8');
const files=[...index.matchAll(/<script\s+src="\.\/([^"?]+\.js)(?:\?[^"]*)?"/g)].map(m=>m[1]);
assert.equal(files.filter(x=>x==='concept-data.js').length,1,'Concept module must load exactly once');
assert.ok(files.indexOf('concept-data.js')>files.indexOf('course-v15-practical.js'));
assert.ok(files.indexOf('concept-data.js')<files.indexOf('app.js'));
assert.ok(sw.includes('"./concept-data.js?v=1.16.0"'),'Offline concept materials must be cached');
const courseModules=['data.js','data-extra.js','data-advanced.js','data-interactive.js','levels-beyond-topik.js','data-core-practice.js','data-super-advanced.js','course-v15-practical.js'];
const w={};
const context=vm.createContext({window:w,console});
for(const f of courseModules.concat(['concept-data.js']))vm.runInContext(fs.readFileSync(path.join(base,f),'utf8'),context,{filename:f,timeout:10000});
const lib=w.KB_CONCEPT_TOPICS,map=w.KB_LESSON_CONCEPTS;
assert.equal(w.KB_LESSONS.length,68);
assert.equal(w.KB_QUESTIONS.length,524);
assert.ok(Object.keys(lib).length>=40);
assert.equal(Object.keys(map).length,w.KB_LESSONS.length);
assert.equal(new Set(w.KB_LESSONS.map(l=>l.id)).size,w.KB_LESSONS.length);
for(const lesson of w.KB_LESSONS){
 const topic=lib[map[lesson.id]];
 assert.ok(topic,'Missing theory for '+lesson.id);
 for(const field of ['title','explain','form','ko','ja','tip'])assert.ok(typeof topic[field]==='string'&&topic[field].trim(),lesson.id+': '+field);
 assert.ok(topic.explain.length>45,'Theory explanation too shallow for '+lesson.id);
 assert.ok(topic.ko.match(/[가-힣]/),'Needs Korean example for '+lesson.id);
 const c=topic.check;
 assert.ok(c&&c.question&&c.feedback);
 assert.ok(Array.isArray(c.options)&&c.options.length===4);
 assert.equal(new Set(c.options).size,4,'Duplicate concept check choices: '+lesson.id);
 assert.ok(Number.isInteger(c.answer)&&c.answer>=0&&c.answer<4);
}
const storage=new Map();
const listeners={};
const element={innerHTML:''};
const doc={
 getElementById(id){return id==='app'?element:null;},
 querySelector(){return null;},
 addEventListener(type,handler){(listeners[type]||(listeners[type]=[])).push(handler);}
};
const appSandbox={window:w,document:doc,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},console,Date,Math};
vm.createContext(appSandbox);
vm.runInContext(fs.readFileSync(path.join(base,'app.js'),'utf8'),appSandbox,{filename:'app.js',timeout:10000});
assert.ok(element.innerHTML.includes('学習方法を選ぶ'),'App should render on boot');
assert.equal((listeners.click||[]).length,1);
function click(action, data={}){
 const button={dataset:{action,...data}};
 listeners.click[0]({target:{closest:()=>button}});
}
click('open-lesson',{id:'g11'});
assert.ok(element.innerHTML.includes('概念を学ぶ'),'Lesson page must offer theory before quiz');
click('open-concept',{id:'g11'});
assert.ok(element.innerHTML.includes('話題の 은/는'),'Correct mapped theory should render');
assert.ok(element.innerHTML.includes('저는 학생이에요'),'Korean example should render');
assert.ok(element.innerHTML.includes('理解チェック'),'Concept check should render');
click('concept-answer',{i:'0'});
assert.ok(element.innerHTML.includes('もう一度確認しましょう'),'Wrong answer needs feedback');
const key='kotobaBridge.progress.v1';
const wrongSaved=storage.get(key);\nif(wrongSaved)assert.equal(JSON.parse(wrongSaved).concepts.g11,undefined,'Do not mark incorrect concept checks as studied');
click('concept-retry');
assert.ok(!element.innerHTML.includes('もう一度確認しましょう'));
click('concept-answer',{i:'1'});
assert.ok(element.innerHTML.includes('正解！理解できました'));
assert.equal(JSON.parse(storage.get(key)).concepts.g11.done,true,'Understanding success must persist');
click('open-lesson',{id:'g11'});
click('start-lesson',{id:'g11'});
assert.ok(element.innerHTML.includes('チャレンジ'),'Quizzes must remain accessible after theory study');
const seeded=JSON.parse(storage.get(key));
assert.equal(seeded.version,1);
assert.ok(seeded.concepts.g11.done);
assert.ok(seeded.session&&seeded.session.lessonId==='g11');
console.log('PASS Kotoba concepts:',Object.keys(lib).length,'theory topics,',Object.keys(map).length,'lesson links, Japanese examples, wrong/right feedback, saved progress and unchanged quiz flow');
