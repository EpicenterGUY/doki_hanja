#!/usr/bin/env node
const fs=require("fs");
const path=require("path");

const root=path.resolve(__dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");

function extractFn(name){
  const re=new RegExp("(?:async\\s+)?function\\s+"+name+"\\s*\\(","g");
  const m=re.exec(html);
  if(!m)throw new Error("Missing parser function: "+name);
  const a=m.index, brace=html.indexOf("{",a);
  let depth=0,quote=null,tpl=false,esc=false;
  for(let i=brace;i<html.length;i++){
    const ch=html[i];
    if(quote){
      if(esc)esc=false;
      else if(ch==="\\")esc=true;
      else if(ch===quote)quote=null;
    }else if(tpl){
      if(esc)esc=false;
      else if(ch==="\\")esc=true;
      else if(ch.charCodeAt(0)===96)tpl=false;
    }else{
      if(ch==="'"||ch==='"')quote=ch;
      else if(ch.charCodeAt(0)===96)tpl=true;
      else if(ch==="{")depth++;
      else if(ch==="}"&&--depth===0)return html.slice(a,i+1);
    }
  }
  throw new Error("Unclosed parser function: "+name);
}

const names=[
  "classifyExamHeader","findAnswerStart","parseAnswerRows","markerRE","cleanExamText",
  "contextForQuestion","extractHanjaAfterMarker","extractKoreanBeforeMarker",
  "headerRangesFromFlat","parseCircledChoices","fallbackExamType",
  "buildProblemizedPrompt","isGenericExamPrompt","problemizeFlatPdf"
];
const src=names.map(extractFn).join("\n");
const api=new Function(
  'const remoteExamState={round:null}; const gradeDisplay=x=>x; '+src+
  '; return {findAnswerStart,parseAnswerRows,problemizeFlatPdf,isGenericExamPrompt};'
)();

function files(dir){
  const out=[];
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isDirectory())out.push(...files(p));
    else if(e.isFile()&&e.name.endsWith(".json")&&e.name!=="manifest.json")out.push(p);
  }
  return out;
}

const dir=path.join(root,"data","exams");
const all=files(dir);
const failures=[];
const stats={files:all.length,parsed:0,questions:0,answers:0,broken:0,manual:0};

for(const fp of all){
  try{
    const j=JSON.parse(fs.readFileSync(fp,"utf8"));
    const flat=j.flat;
    if(!Array.isArray(flat)||flat.length<10)throw new Error("flat text missing");
    const answerStart=api.findAnswerStart(flat);
    if(answerStart<0)throw new Error("answer sheet not found");
    const answers=api.parseAnswerRows(flat.slice(answerStart).map(x=>x.line),0);
    const answerKeys=Object.keys(answers).map(Number).filter(Boolean);
    if(answerKeys.length<10)throw new Error("too few answers: "+answerKeys.length);
    const items=api.problemizeFlatPdf(j.level,j.round,flat,answerStart,answers);
    if(items.length<10)throw new Error("too few questions: "+items.length);
    const broken=items.filter(api.isGenericExamPrompt);
    const manual=items.filter(q=>q.manual);
    const maxA=Math.max(...answerKeys);
    const holes=[];
    for(let n=1;n<=maxA;n++)if(!(n in answers))holes.push(n);

    if(broken.length||holes.length||manual.length){
      failures.push({
        file:path.relative(root,fp),
        level:j.level,round:j.round,
        answers:answerKeys.length,questions:items.length,
        broken:broken.map(q=>q.no).slice(0,20),
        holes:holes.slice(0,20),
        manual:manual.map(q=>q.no).slice(0,20)
      });
    }

    stats.parsed++;
    stats.questions+=items.length;
    stats.answers+=answerKeys.length;
    stats.broken+=broken.length;
    stats.manual+=manual.length;
  }catch(e){
    failures.push({file:path.relative(root,fp),error:String(e.message||e)});
  }
}

console.log(JSON.stringify({stats,failures:failures.slice(0,100)},null,2));
if(failures.length){
  console.error("VALIDATION FAILED:",failures.length,"exam files");
  process.exit(1);
}
console.log("VALIDATION PASSED: all",all.length,"exam files are immediately playable.");
