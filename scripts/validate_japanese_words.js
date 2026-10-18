#!/usr/bin/env node
"use strict";

const fs=require("fs");
const path=require("path");
const file=path.join(__dirname,"..","data","japanese","words.json");
const extraFile=path.join(__dirname,"..","data","japanese","rare-words-extra.json");
const commonFile=path.join(__dirname,"..","data","japanese","common-words-extra.json");
const hyogaiExpandedFile=path.join(__dirname,"..","data","japanese","hyogai-words-expanded.json");
const joyoFile=path.join(__dirname,"..","data","japanese","joyo.tsv");
const data=JSON.parse(fs.readFileSync(file,"utf8"));
const extraData=fs.existsSync(extraFile)?JSON.parse(fs.readFileSync(extraFile,"utf8")):{items:[]};
const commonData=fs.existsSync(commonFile)?JSON.parse(fs.readFileSync(commonFile,"utf8")):{items:[]};
const hyogaiExpandedData=fs.existsSync(hyogaiExpandedFile)?JSON.parse(fs.readFileSync(hyogaiExpandedFile,"utf8")):{items:[]};
const joyoChars=new Set(fs.readFileSync(joyoFile,"utf8").trim().split(/\r?\n/).slice(1).map(function(line){return line.split("\t")[1]}).filter(Boolean));
const baseItems=Array.isArray(data.items)?data.items:[];
const extraItems=Array.isArray(extraData.items)?extraData.items:[];
const commonItems=Array.isArray(commonData.items)?commonData.items:[];
const hyogaiExpandedItems=Array.isArray(hyogaiExpandedData.items)?hyogaiExpandedData.items:[];
const items=baseItems.concat(extraItems,commonItems,hyogaiExpandedItems);
const errors=[];
const warnings=[];
const seen=new Map();
const seenForms=new Map();

function norm(s){return String(s||"").trim().replace(/\s+/g," ")}
function forms(w){
  return [...new Set([norm(w.preferredForm),norm(w.word)].filter(Boolean))];
}
function derivativeBase(form,formSet){
  form=norm(form);
  const prefixes=["非","不","無","未","再","超","新","旧","元","お","ご","御"];
  const suffixes=["的","性","化","者","員","家","人","中","用","料","制","式","型","版","系"];
  for(const a of prefixes){
    if(form.startsWith(a)&&[...form].length>[...a].length+1){
      const base=form.slice(a.length);if(formSet.has(base))return base;
    }
  }
  for(const a of suffixes){
    if(form.endsWith(a)&&[...form].length>[...a].length+1){
      const base=form.slice(0,-a.length);if(formSet.has(base))return base;
    }
  }
  return "";
}
function badFallback(s){
  return /文章の中で.*読み方と意味/u.test(s)||
    /[＿_]{2,}/u.test(s)||
    /という語を.*(?:確認|調べ)/u.test(s)||
    /用語集で.*(?:確認|調べ)/u.test(s)||
    /(?:辞書|辞典|資料)で.*(?:語|表記).*確認/u.test(s);
}
function genericExample(s){
  return /(?:教材|資料|解剖図|人体図|動画教材)で.*(?:学んだ|確認した|調べた)/u.test(s)||
    /について.*(?:教材|資料).*(?:学んだ|確認した)/u.test(s);
}
function lastHangul(s){
  const a=[...String(s||"")];
  for(let i=a.length-1;i>=0;i--){
    const cp=a[i].charCodeAt(0);
    if(cp>=0xAC00&&cp<=0xD7A3)return a[i];
  }
  return "";
}
function hasBatchim(s){
  const ch=lastHangul(s);if(!ch)return null;
  return ((ch.charCodeAt(0)-0xAC00)%28)!==0;
}
function glossCandidates(w){
  const m=norm(w&&w.meaning);
  if(!m)return[];
  const parts=m.split(/[·,/／()]/u).map(norm).filter(Boolean);
  return [...new Set([m].concat(parts).filter(function(x){
    return /[가-힣]/u.test(x)&&x.length<=24;
  }))];
}
function badGlossParticle(w,translation){
  for(const g of glossCandidates(w)){
    const batch=hasBatchim(g);if(batch===null)continue;
    const checks=[
      [g+"가",batch,g+"이"],[g+"이",!batch,g+"가"],
      [g+"를",batch,g+"을"],[g+"을",!batch,g+"를"],
      [g+"는",batch,g+"은"],[g+"은",!batch,g+"는"]
    ];
    for(const row of checks){
      if(row[1]&&translation.includes(row[0]))return row[0]+" -> "+row[2];
    }
  }
  return "";
}

for(const w of items){
  const id=w.id??"?";
  const sentence=norm(w.sentence);
  const translation=norm(w.translation);
  const display=norm(w.preferredForm||w.word);
  if(display){
    if(seenForms.has(display))errors.push(`duplicate display form: [${seenForms.get(display)}] and [${id}] ${display}`);
    else seenForms.set(display,id);
  }
  if(!norm(w.word))errors.push(`[${id}] word missing`);
  if(!norm(w.reading))errors.push(`[${id}] reading missing: ${w.word||""}`);
  if(!norm(w.meaning))errors.push(`[${id}] meaning missing: ${w.word||""}`);
  if(!sentence&&!w.exampleOptional)errors.push(`[${id}] sentence missing: ${w.word||""}`);
  if(sentence&&!translation&&!w.exampleOptional&&w.source!=="rapoyrazoglu/nihongo")errors.push(`[${id}] translation missing: ${w.word||""}`);
  const particleIssue=translation&&badGlossParticle(w,translation);
  if(particleIssue)errors.push(`[${id}] Korean particle mismatch: ${w.word||""} -> ${particleIssue} / ${translation}`);
  if(sentence&&badFallback(sentence))errors.push(`[${id}] placeholder example: ${w.word||""}`);
  if(sentence&&genericExample(sentence))warnings.push(`[${id}] generic example review: ${w.word||""} -> ${sentence}`);
  if(w.hyogaiScope&&!["practical","rare"].includes(w.hyogaiScope))errors.push(`[${id}] invalid hyogaiScope: ${w.hyogaiScope}`);
  if(sentence&&!forms(w).some(f=>sentence.includes(f))){
    errors.push(`[${id}] target form not found in sentence: ${w.word||""} -> ${sentence}`);
  }
  if(w.preferredForm&&norm(w.preferredForm)!==norm(w.word)){
    if(!norm(w.formType))errors.push(`[${id}] formType missing: ${w.word}`);
    if(!sentence.includes(norm(w.preferredForm)))errors.push(`[${id}] preferredForm not used in sentence: ${w.word}`);
  }
  if(sentence){
    const key=sentence.normalize("NFKC");
    if(seen.has(key))errors.push(`duplicate sentence: [${seen.get(key)}] and [${id}] ${sentence}`);
    else seen.set(key,id);
  }
}

const allForms=new Set(items.map(function(w){return norm(w.preferredForm||w.word)}).filter(Boolean));
for(const w of items){
  const display=norm(w.preferredForm||w.word);
  const base=derivativeBase(display,allForms);
  if(base)errors.push(`derivative duplicate: [${w.id??"?"}] ${display} -> base ${base}`);
}

if(data.count!==baseItems.length)errors.push(`count mismatch: words.json header=${data.count}, actual=${baseItems.length}`);
if(extraData.count!=null&&extraData.count!==extraItems.length)errors.push(`count mismatch: rare-words-extra.json header=${extraData.count}, actual=${extraItems.length}`);
if(commonData.count!=null&&commonData.count!==commonItems.length)errors.push(`count mismatch: common-words-extra.json header=${commonData.count}, actual=${commonItems.length}`);
if(hyogaiExpandedData.count!=null&&hyogaiExpandedData.count!==hyogaiExpandedItems.length)errors.push(`count mismatch: hyogai-words-expanded.json header=${hyogaiExpandedData.count}, actual=${hyogaiExpandedItems.length}`);
for(const w of hyogaiExpandedItems){
  const word=norm(w.word);
  const chars=[...word].filter(function(ch){return /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u.test(ch)});
  if(!chars.some(function(ch){return !joyoChars.has(ch)}))errors.push(`hyogai expansion has no non-Joyo CJK char: [${w.id??"?"}] ${word}`);
  if(w.set!=="hyogai")errors.push(`hyogai expansion set mismatch: [${w.id??"?"}] ${word}`);
  if(!norm(w.pos))errors.push(`hyogai expansion POS missing: [${w.id??"?"}] ${word}`);
}

if(errors.length){
  console.error(`Japanese word validation failed (${errors.length})\n`+errors.join("\n"));
  process.exit(1);
}
console.log(`Japanese word validation passed: ${items.length} items (base ${baseItems.length} + rare extra ${extraItems.length} + common extra ${commonItems.length} + hyogai expanded ${hyogaiExpandedItems.length}), no placeholders, no duplicate display forms/examples, no affix-derivative duplicates, no gloss-particle mismatches.`);
if(warnings.length)console.warn(`Japanese word quality warnings (${warnings.length})\n`+warnings.slice(0,80).join("\n"));
