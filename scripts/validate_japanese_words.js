#!/usr/bin/env node
"use strict";

const fs=require("fs");
const path=require("path");
const file=path.join(__dirname,"..","data","japanese","words.json");
const extraFile=path.join(__dirname,"..","data","japanese","rare-words-extra.json");
const data=JSON.parse(fs.readFileSync(file,"utf8"));
const extraData=fs.existsSync(extraFile)?JSON.parse(fs.readFileSync(extraFile,"utf8")):{items:[]};
const baseItems=Array.isArray(data.items)?data.items:[];
const extraItems=Array.isArray(extraData.items)?extraData.items:[];
const items=baseItems.concat(extraItems);
const errors=[];
const warnings=[];
const seen=new Map();

function norm(s){return String(s||"").trim().replace(/\s+/g," ")}
function forms(w){
  return [...new Set([norm(w.preferredForm),norm(w.word)].filter(Boolean))];
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
  if(!norm(w.word))errors.push(`[${id}] word missing`);
  if(!norm(w.reading))errors.push(`[${id}] reading missing: ${w.word||""}`);
  if(!norm(w.meaning))errors.push(`[${id}] meaning missing: ${w.word||""}`);
  if(!sentence)errors.push(`[${id}] sentence missing: ${w.word||""}`);
  if(!translation)errors.push(`[${id}] translation missing: ${w.word||""}`);
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

if(data.count!==baseItems.length)errors.push(`count mismatch: words.json header=${data.count}, actual=${baseItems.length}`);
if(extraData.count!=null&&extraData.count!==extraItems.length)errors.push(`count mismatch: rare-words-extra.json header=${extraData.count}, actual=${extraItems.length}`);

if(errors.length){
  console.error(`Japanese word validation failed (${errors.length})\n`+errors.join("\n"));
  process.exit(1);
}
console.log(`Japanese word validation passed: ${items.length} items (base ${baseItems.length} + rare extra ${extraItems.length}), no placeholders, no duplicate examples, no gloss-particle mismatches.`);
if(warnings.length)console.warn(`Japanese word quality warnings (${warnings.length})\n`+warnings.slice(0,80).join("\n"));
