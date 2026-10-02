#!/usr/bin/env node
"use strict";

const fs=require("fs");
const path=require("path");

const root=path.join(__dirname,"..");
const extra=JSON.parse(fs.readFileSync(path.join(root,"data","korean-extra.json"),"utf8"));
const csv=fs.readFileSync(path.join(root,"data","hanja.csv"),"utf8").split(/\r?\n/);
const head=(csv[0]||"").split(",");
const hi=head.indexOf("hanja");
const grade=new Set();

for(let i=1;i<csv.length;i++){
  const row=csv[i].split(",");
  if(hi>=0&&row[hi])grade.add(row[hi].trim());
}

const items=Array.isArray(extra.items)?extra.items:[];
const errors=[];
const seen=new Set();

if(extra.count!==items.length)errors.push(`count mismatch: header=${extra.count}, actual=${items.length}`);
if(items.length<1000)errors.push(`dictionary-verified extra set unexpectedly small: ${items.length}`);

for(const x of items){
  const ch=String(x&&x.hanja||"").trim();
  if(!ch){errors.push("missing hanja");continue}
  if(seen.has(ch))errors.push(`duplicate character: ${ch}`);
  seen.add(ch);
  if(grade.has(ch))errors.push(`grade-assigned character leaked into extra set: ${ch}`);
  if(!String(x.sound||"").trim())errors.push(`missing sound: ${ch}`);
  if(!Array.isArray(x.meanings)||!x.meanings.length)errors.push(`missing hun-eum meanings: ${ch}`);
  if(!Array.isArray(x.usages)||!x.usages.length)errors.push(`missing dictionary usage: ${ch}`);
  for(const u of x.usages||[]){
    if(!String(u.word||"").trim()||!String(u.hanja||"").trim())errors.push(`invalid usage row: ${ch}`);
    if(!String(u.hanja||"").includes(ch))errors.push(`usage does not contain target ${ch}: ${u.hanja}`);
    if(!["표준국어대사전","우리말샘"].includes(String(u.source||"")))errors.push(`unknown usage source ${ch}: ${u.source}`);
  }
}

for(const ch of ["饕","餮"]){
  const x=items.find(v=>v.hanja===ch);
  if(!x)errors.push(`required regression character missing: ${ch}`);
  else if(!(x.usages||[]).some(u=>u.word==="도철"&&u.hanja==="饕餮"))errors.push(`도철(饕餮) usage missing for ${ch}`);
}

if(errors.length){
  console.error(`Korean extra-Hanja validation failed (${errors.length})\n`+errors.join("\n"));
  process.exit(1);
}

console.log(`Korean extra-Hanja validation passed: ${items.length} dictionary-verified characters.`);
