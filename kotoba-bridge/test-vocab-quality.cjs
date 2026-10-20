#!/usr/bin/env node
'use strict';
/* Lightweight runtime regression tests: no network, browser or external packages. */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const base=__dirname;
const index=fs.readFileSync(path.join(base,'index.html'),'utf8');
const tags=[...index.matchAll(/<script\s+src="\.\/([^"?]+\.js)(?:\?[^"]*)?"/g)].map(x=>x[1]);
const uiSource=fs.readFileSync(path.join(base,'vocab-ui.js'),'utf8');
function environment(wordOnly){
  const data={version:1,cards:{
    ha60102:{seen:4,known:3,stage:2,next:0},
    'r11a7-0116':{seen:1,known:1,stage:1,next:1234}
  },stars:{ha60102:true}};
  const storage=new Map([['kotobaBridge.vocab.v1',JSON.stringify(data)]]);
  const elements={'#vocab-list':{innerHTML:''},'#vocab-type-answer':{value:''}};
  const sandbox={
    window:{KB_VOCAB:[],KB_LEVELS:['L0','L1','L2','L3','L4','L5','L6','L7','L8'].map(id=>({id}))},
    document:{querySelector:selector=>elements[selector]||null},
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,val)=>storage.set(key,val)},
    alert:msg=>{throw Error('Unexpected alert: '+msg);},console
  };
  vm.createContext(sandbox);
  if(!wordOnly){
    const start=tags.indexOf('vocabulary.js'),end=tags.indexOf('vocab-ui.js');
    assert.ok(start>=0&&end>start);
    for(const file of tags.slice(start,end)){
      vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'),sandbox,{filename:file,timeout:5000});
    }
  }else{
    sandbox.window.KB_VOCAB.push({id:'test-card',ko:'정체성형성',displayKo:'정체성 형성',ja:'アイデンティティー形成',level:'L5',pos:'名詞',category:'社会',exKo:'정체성 형성이 중요해요.',exJa:'アイデンティティーの形成は大切です。'});
    sandbox.window.KB_VOCAB_ID_ALIASES={ha60102:'test-card'};
  }
  vm.runInContext(uiSource,sandbox,{filename:'vocab-ui.js',timeout:5000});
  return {w:sandbox.window,elements,storage};
}
const full=environment(false);
const words=full.w.KB_VOCAB;
assert.ok(words.length>=5462,'The quality audit should allow future vocabulary expansion');
assert.ok(!words.some(w=>w.id==='ha60102'),'Superseded duplicate ID must no longer be a card');
assert.equal(words.filter(w=>w.ko==='도덕적 해이').length,1,'Keep exactly one canonical card');
assert.equal(new Set(words.map(w=>w.id)).size,words.length);
assert.equal(new Set(words.map(w=>w.displayKo||w.ko)).size,words.length);
assert.equal(words.filter(w=>!w.exKo||!w.exJa).length,0,'All words need both example fields');
assert.equal(full.w.KB_ORTHOGRAPHY_REVIEW.applied,78);
assert.equal(full.w.KB_ORTHOGRAPHY_REVIEW.merged.length,1);
assert.equal(full.w.KB_V21_SENSE_AUDIT.applied,15,'All fifteen reviewed senses should load');
assert.equal(full.w.KB_V21_SENSE_AUDIT.missing.length,0);
const significant=words.find(w=>w.ko==='유의하다');
assert.ok(significant,'The 有意/留意 homograph must be present');
assert.equal(significant.pos,'形容詞','Primary 有意하다 entry is an adjective');
assert.match(significant.ja,/有意/);
assert.match(significant.senseNote,/留意/);
assert.match(significant.altExampleJa,/留意/);
const notice=words.find(w=>w.ko==='공시');
assert.match(notice.ja,/情報開示/);
const rise=words.find(w=>w.ko==='대두하다');
assert.match(rise.senseNote,/動詞/);

assert.equal(full.w.KBV.wordCount,words.length);
const saved=full.w.KBV.getData();
assert.equal(saved.cards['ha60102'],undefined);
assert.equal(saved.cards['r11a7-0116'].seen,5);
assert.equal(saved.cards['r11a7-0116'].known,4);
assert.equal(saved.stars['r11a7-0116'],true);
full.w.KBV.input({id:'vocab-search',value:'유의하다'});
assert.match(full.elements['#vocab-list'].innerHTML,/留意하다/,'Browsing should show distinction between homonyms');
full.w.KBV.input({id:'vocab-search',value:'정체성 형성'});
assert.match(full.elements['#vocab-list'].innerHTML,/정체성 형성/);
const single=environment(true);
single.w.KBV.startExternalQuiz(5,'L5','typing');
assert.match(single.w.KBV.render(),/韓国語の見出し形/);
single.elements['#vocab-type-answer'].value='정체성 형성';
single.w.KBV.click({dataset:{action:'vocab-type-check'}});
assert.match(single.w.KBV.render(),/✓ 正解！/);
single.w.KBV.startExternalQuiz(5,'L5','typing');
single.elements['#vocab-type-answer'].value='정체성형성';
single.w.KBV.click({dataset:{action:'vocab-type-check'}});
assert.match(single.w.KBV.render(),/✕ 正解/,'Incorrectly joined form should not be accepted');

const imported=single.w.KBV.importData({
  version:1,cards:{ha60102:{seen:9,known:7,stage:3,next:1}},stars:{ha60102:true}
});
assert.equal(imported,true);
assert.equal(single.w.KBV.getData().cards['test-card'].seen,9);
assert.equal(single.w.KBV.getData().stars['test-card'],true);
console.log('PASS Kotoba lexical quality integration:',words.length,'cards,',
  full.w.KB_ORTHOGRAPHY_REVIEW.applied,'visible spacing corrections, 1 saved-progress migration');
