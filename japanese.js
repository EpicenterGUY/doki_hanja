
let jpJoyo=[];
let jpHyogai=[];
let jpHyogaiMeta={core:"",jis1Extra:"",jis2Extra:"",practicalChars:"",counts:{core:0,jis1Extra:0,jis2Extra:0,practical:0,rare:0,total:0}};
let jpWords=[];
let jpMextReadings=[];
let jpMextMap=new Map();
let jpReadingIndex={on:new Map(),kun:new Map()};
let jpDataLoading=false;
let jpDataPromise=null;
let jpDataError="";
let jpHideTimer=null;
let jpItemMap=new Map();
let jpJlptData={kanji:{},word:{},counts:{}};

let jpState={
  view:"home",
  set:"joyo",
  grade:"all",
  jlpt:"all",
  hyogaiTier:"practical",
  query:"",
  savedOnly:false,
  limit:120,
  atlasLimit:160,
  atlasGroup:"on",
  atlasInitial:"all",
  atlasFont:storageGet("jpAtlasFontV1","gothic"),
  mode:"memory",
  order:"source",
  count:20,
  list:[],
  index:0,
  phase:"memorize",
  checked:false,
  wordTier:"all",
  wordOrder:"random",
  wordCount:20,
  wordRound:0,
  wordList:[],
  wordIndex:0,
  wordChecked:false,
  wordHideMeaning:storageGet("jpWordHideMeaningV1","1")!=="0",
  readingQuizLevel:"all",
  readingQuizCount:20,
  readingQuizOrder:"random",
  readingQuizList:[],
  readingQuizIndex:0,
  readingQuizChecked:false,
  readingKind:"on",
  readingInitial:"all",
  readingSelected:"",
  readingQuery:"",
  readingRemote:[],
  readingRemoteLoading:false,
  readingRemoteError:""
};
let jpStats=storageJson("jpHanjaStatsV1",{});
let jpUnknown=storageJson("jpHanjaUnknownV1",{});
let jpWordStats=storageJson("jpWordStatsV1",{});
let jpReadingQuizStats=storageJson("jpReadingQuizStatsV1",{});
let jpAtlasApiCache=storageJson("jpKanjiApiCacheV1",{});

function jpAtlasFontStack(v){
  const key=["gothic","mincho","textbook"].includes(v)?v:"gothic";
  if(key==="mincho")return '"Noto Serif JP","Noto Serif CJK JP","Yu Mincho","Hiragino Mincho ProN",serif';
  if(key==="textbook")return '"UD Digi Kyokasho N-R","BIZ UDMincho","Yu Kyokasho","Hiragino Mincho ProN","Noto Serif JP",serif';
  return '"Noto Sans JP","Noto Sans CJK JP","Yu Gothic","Meiryo","Hiragino Kaku Gothic ProN",sans-serif';
}
function applyJapaneseAtlasFont(){
  const key=["gothic","mincho","textbook"].includes(jpState.atlasFont)?jpState.atlasFont:"gothic";
  jpState.atlasFont=key;
  document.documentElement.style.setProperty("--jp-atlas-font",jpAtlasFontStack(key));
  document.documentElement.dataset.jpAtlasFont=key;
}
function setJapaneseAtlasFont(v){
  jpState.atlasFont=["gothic","mincho","textbook"].includes(v)?v:"gothic";
  storageSet("jpAtlasFontV1",jpState.atlasFont);
  applyJapaneseAtlasFont();
  document.querySelectorAll("#jpAtlasFont,#jpAtlasDetailFont").forEach(function(el){el.value=jpState.atlasFont});
}
function jpAtlasFontOptionsHtml(){
  return "<option value='gothic' "+(jpState.atlasFont==="gothic"?"selected":"")+">고딕체</option>"+
    "<option value='mincho' "+(jpState.atlasFont==="mincho"?"selected":"")+">명조체</option>"+
    "<option value='textbook' "+(jpState.atlasFont==="textbook"?"selected":"")+">교과서체</option>";
}
function jpIsHyogaiSet(s){return s==="hyogai"||s==="rare"}
function jpSetLabel(s){return s==="joyo"?"常用漢字":s==="rare"?"희귀·비실용":"表外漢字"}
function jpGradeLabel(g){return g==="S"?"中高":("小"+g)}
function jpKey(item){return (item.set||jpState.set)+"|"+item.char}
function jpWordKey(item){return "word|"+item.word}
function jpJlptWordKey(item){return String(item&&item.word||"")+"\u0000"+String(item&&item.reading||"")}
function jpJlptLabel(v){return ["N5","N4","N3","N2","N1"].includes(String(v||"").toUpperCase())?String(v).toUpperCase():"N1"}
function jpApplyJlptData(joyo,words,data){
  jpJlptData=data&&typeof data==="object"?data:{kanji:{},word:{},counts:{}};
  const km=jpJlptData.kanji||{},wm=jpJlptData.word||{};
  (joyo||[]).forEach(function(x){x.jlpt=jpJlptLabel(km[x.char]||"N1")});
  (words||[]).forEach(function(w){if(w.set==="joyo")w.jlpt=jpJlptLabel(wm[jpJlptWordKey(w)]||w.jlpt||"N1")});
}
function jpItemJlpt(item){return jpJlptLabel(item&&item.jlpt||(jpJlptData.kanji||{})[item&&item.char]||"N1")}
function jpWordJlpt(w){return jpJlptLabel(w&&w.jlpt||(jpJlptData.word||{})[jpJlptWordKey(w)]||"N1")}
function jpJlptCounts(rows,getter){
  const out={N5:0,N4:0,N3:0,N2:0,N1:0};
  (rows||[]).forEach(function(x){const k=(getter||jpItemJlpt)(x);if(k in out)out[k]++});
  return out;
}

function jpHyogaiGroupLabel(group){
  return group==="core"?"핵심":group==="jis1"?"JIS1 확장":"JIS2 확장";
}
function jpHyogaiTierCounts(){
  const c=jpHyogaiMeta&&jpHyogaiMeta.counts||{};
  return {
    core:+c.core||jpHyogai.filter(function(x){return x.hyogaiGroup==="core"}).length,
    practical:+c.practical||jpHyogai.filter(function(x){return !!x.hyogaiPractical}).length,
    rare:+c.rare||jpHyogai.filter(function(x){return !x.hyogaiPractical}).length,
    extended:+c.jis2Extra||jpHyogai.filter(function(x){return x.hyogaiGroup==="jis2"}).length,
    all:+c.total||jpHyogai.length
  };
}
function jpApplyHyogaiGroups(rows,meta){
  const core=new Set([...(meta&&meta.core||"")]);
  const j1=new Set([...(meta&&meta.jis1Extra||"")]);
  const j2=new Set([...(meta&&meta.jis2Extra||"")]);
  const practical=new Set([...(meta&&meta.practicalChars||"")]);
  rows.forEach(function(x){
    x.hyogaiGroup=core.has(x.char)?"core":j1.has(x.char)?"jis1":j2.has(x.char)?"jis2":"jis2";
    x.hyogaiPractical=practical.has(x.char);
  });
  return rows;
}

function jpWordSchoolStage(w){
  if(!w)return "senior";
  if(w.schoolStage&&w.schoolStage!=="hyogai")return w.schoolStage;
  if(w.tier==="basic")return "elementary";
  if(w.tier==="intermediate")return "junior";
  return "senior";
}
function jpHyogaiWordStage(w){
  if(!w)return "practical";
  if(["entry","practical","advanced","deep"].includes(w.hyogaiStage))return w.hyogaiStage;
  const jlpt=String(w.jlpt||"").toUpperCase();
  if(jlpt==="N5"||jlpt==="N4"||jlpt==="N3")return "entry";
  if(jlpt==="N2")return "practical";
  if(jlpt==="N1")return "advanced";
  let rank=0;
  [...String(w.word||"")].forEach(function(ch){
    const item=jpItemMap.get(ch);
    if(!item||item.set!=="hyogai")return;
    rank=Math.max(rank,item.hyogaiGroup==="jis2"?3:item.hyogaiGroup==="jis1"?2:1);
  });
  return rank>=3?"deep":rank===2?"advanced":"practical";
}
function jpWordStudyStage(w){
  if(w&&w.set==="joyo")return jpWordJlpt(w);
  return w&&(w.set==="hyogai"||w.tier==="hyogai")?jpHyogaiWordStage(w):jpWordSchoolStage(w);
}
function jpWordStageLabel(stage){
  if(["N5","N4","N3","N2","N1"].includes(stage))return stage;
  if(stage==="elementary")return "초등";
  if(stage==="junior")return "중등";
  if(stage==="senior")return "고등";
  if(stage==="entry")return "입문";
  if(stage==="practical")return "실용";
  if(stage==="advanced")return "고급";
  if(stage==="deep")return "심화";
  return "전체";
}
function jpWordStageCounts(rows){
  const out={N5:0,N4:0,N3:0,N2:0,N1:0,elementary:0,junior:0,senior:0,entry:0,practical:0,advanced:0,deep:0};
  (rows||[]).forEach(function(w){const k=jpWordStudyStage(w);if(k in out)out[k]++});
  return out;
}

function saveJpProgress(){
  const ok1=storageSet("jpHanjaStatsV1",JSON.stringify(jpStats));
  const ok2=storageSet("jpHanjaUnknownV1",JSON.stringify(jpUnknown));
  const ok3=storageSet("jpWordStatsV1",JSON.stringify(jpWordStats));
  const ok4=storageSet("jpReadingQuizStatsV1",JSON.stringify(jpReadingQuizStats));
  if(!ok1||!ok2||!ok3||!ok4)toast("日本漢字 학습기록을 저장하지 못했습니다. 브라우저 저장공간을 확인해 주세요.");
}
function saveJpApiCache(){
  storageSet("jpKanjiApiCacheV1",JSON.stringify(jpAtlasApiCache));
}
function parseJoyoData(text){
  const lines=String(text||"").trim().split(/\r?\n/);
  if(lines.length<2)return[];
  return lines.slice(1).map(function(line){
    const a=line.split("\t");
    return {id:+a[0]||0,char:a[1]||"",old:a[2]||"",radical:a[3]||"",strokes:+a[4]||0,grade:a[5]||"S",set:"joyo"};
  }).filter(function(x){return x.char});
}
function parseHyogaiData(text,joyoSet){
  const out=[];let cur=null,inParen=false;
  for(const ch of [...String(text||"").trim()]){
    if(ch==="（"||ch==="("){inParen=true;continue}
    if(ch==="）"||ch===")"){inParen=false;continue}
    if(/\s/u.test(ch))continue;
    if(!/\p{Script=Han}/u.test(ch))continue;
    if(inParen){
      if(cur&&!cur.variants.includes(ch))cur.variants.push(ch);
      continue;
    }
    cur={char:ch,variants:[],set:"hyogai",grade:"表外",radical:"",strokes:0};
    out.push(cur);
  }
  const seen=new Set();
  return out.filter(function(x){
    if(joyoSet.has(x.char)||seen.has(x.char))return false;
    seen.add(x.char);return true;
  });
}
function jpBuildItemMap(){
  jpItemMap=new Map();
  jpJoyo.forEach(function(x){jpItemMap.set(x.char,x)});
  jpHyogai.forEach(function(x){if(!jpItemMap.has(x.char))jpItemMap.set(x.char,x)});
}
function jpKanaFold(v){
  return [...String(v||"").replace(/[.・･\-]/g,"")].map(function(ch){
    const cp=ch.codePointAt(0);
    return cp>=0x30A1&&cp<=0x30F6?String.fromCodePoint(cp-0x60):ch;
  }).join("");
}
function jpBuildMextIndex(data){
  jpMextReadings=Array.isArray(data&&data.entries)?data.entries:[];
  jpMextMap=new Map();jpReadingIndex={on:new Map(),kun:new Map()};
  jpMextReadings.forEach(function(e){
    if(!e||!e.kanji)return;
    jpMextMap.set(e.kanji,e);
    (e.readings||[]).forEach(function(r){
      if(!r||!r.reading||(r.kind!=="on"&&r.kind!=="kun"))return;
      const key=jpKanaFold(r.reading);
      const map=jpReadingIndex[r.kind];
      const a=map.get(key)||[];
      a.push({char:e.kanji,reading:r.reading,kind:r.kind,stage:r.stage||"",special:!!r.special,grade:e.grade});
      map.set(key,a);
    });
  });
}
function jpMextEntry(ch){return jpMextMap.get(ch)||null}
function jpOfficialReadings(ch,kind){
  const e=jpMextEntry(ch);if(!e)return[];
  return (e.readings||[]).filter(function(r){return !kind||r.kind===kind});
}
function jpReadingText(item,kind){
  return jpOfficialReadings(item.char,kind).map(function(r){return r.reading}).filter(Boolean);
}
function jpPrimaryReading(item,kind){
  const rows=jpReadingText(item,kind);
  return rows[0]||"";
}
function jpShinjitaiInfo(ch){
  const oldHit=jpJoyo.find(function(x){return x.old===ch&&x.char!==ch});
  if(oldHit)return {traditional:ch,shinjitai:oldHit.char,relation:"old-to-new"};
  const newHit=jpJoyo.find(function(x){return x.char===ch&&x.old&&x.old!==ch});
  if(newHit)return {traditional:newHit.old,shinjitai:ch,relation:"new-to-old"};
  return null;
}
function jpShinjitaiFor(ch){
  const x=jpShinjitaiInfo(ch);
  return x&&x.shinjitai!==ch?x.shinjitai:"";
}
function jpStageLabel(stage){
  return stage==="elementary"?"초등":stage==="junior"?"중등":stage==="senior"?"고등":"상용";
}
function jpReadingInitialKey(reading){
  const h=jpKanaFold(reading).charAt(0);
  const rows=[
    ["あ","ぁあいうえおゔ"],["か","かきくけこがぎぐげご"],["さ","さしすせそざじずぜぞ"],
    ["た","たちつてとだぢづでど"],["な","なにぬねの"],["は","はひふへほばびぶべぼぱぴぷぺぽ"],
    ["ま","まみむめも"],["や","ゃやゆゅよょ"],["ら","らりるれろ"],["わ","ゎわをん"]
  ];
  for(const row of rows)if(row[1].includes(h))return row[0];
  return "기타";
}
function jpReadingIndexGroups(kind){
  const map=jpReadingIndex[kind]||new Map(),out=[];
  map.forEach(function(rows,key){
    const selected=rows.filter(function(r){
      const item=jpFindItem(r.char);
      if(!item||item.set!=="joyo")return false;
      if(jpState.jlpt!=="all"&&jpItemJlpt(item)!==jpState.jlpt)return false;
      return true;
    });
    if(selected.length)out.push({key:key,reading:selected[0].reading,rows:selected,initial:jpReadingInitialKey(selected[0].reading)});
  });
  out.sort(function(a,b){return a.reading.localeCompare(b.reading,"ja")});
  return out;
}
async function jpLookupRemoteReading(){
  const input=$("#jpReadingInput");
  const raw=(input&&input.value||jpState.readingQuery||"").trim();
  if(!raw){toast("찾을 음독·훈독을 입력해 주세요");return}
  jpState.readingQuery=raw;jpState.readingRemoteLoading=true;jpState.readingRemoteError="";renderJapanese();
  try{
    const r=await fetch("https://kanjiapi.dev/v1/reading/"+encodeURIComponent(raw),{cache:"force-cache"});
    if(!r.ok)throw Error("HTTP "+r.status);
    const data=await r.json();
    const all=[].concat(data.main_kanji||[],data.name_kanji||[]);
    const set=new Set(all);
    let pool=jpState.set==="joyo"?jpJoyo:jpHyogai;
    if(jpState.set==="joyo"&&jpState.jlpt!=="all")pool=pool.filter(function(x){return jpItemJlpt(x)===jpState.jlpt});
    if(jpState.set==="hyogai")pool=pool.filter(function(x){return !!x.hyogaiPractical});
    if(jpState.set==="rare")pool=pool.filter(function(x){return !x.hyogaiPractical});
    jpState.readingRemote=pool.filter(function(x){return set.has(x.char)});
  }catch(e){
    jpState.readingRemote=[];jpState.readingRemoteError="읽기 검색 데이터를 불러오지 못했습니다.";
  }finally{
    jpState.readingRemoteLoading=false;renderJapanese();
  }
}function jpReadingPillsHtml(item,data,kind){
  const official=jpOfficialReadings(item.char,kind);
  const api=kind==="on"?(data&&data.on_readings||[]):(data&&data.kun_readings||[]);
  const officialKeys=new Set(official.map(function(r){return jpKanaFold(r.reading)}));
  const extras=api.filter(function(r){return !officialKeys.has(jpKanaFold(r))});
  let h="";
  if(official.length){
    h+="<div class='jp-reading-pills'>"+official.map(function(r){
      return "<span class='jp-reading-pill official "+(r.special?"special":"")+"'><b>"+esc(r.reading)+"</b><small>"+jpStageLabel(r.stage)+(r.special?" · 특별":"")+"</small></span>";
    }).join("")+"</div>";
  }
  if(extras.length){
    const extraClass=kind==="on"?"extra-on":"extra-kun";
    const extraLabel=kind==="on"
      ? (item.set==="joyo"?"비상용 음독":"표외 음독")
      : (item.set==="joyo"?"비상용 훈독":"표외 훈독");
    h+="<div class='jp-reading-extra "+extraClass+"'><span>"+extraLabel+"</span>"+extras.map(function(r){return "<b>"+esc(r)+"</b>"}).join("")+"</div>";
  }
  if(!official.length&&!extras.length)h="<span class='jp-reading-none'>—</span>";
  return h;
}
async function loadJapaneseData(){
  if(jpJoyo.length&&jpHyogai.length&&jpWords.length&&jpMextReadings.length)return true;
  if(jpDataPromise)return jpDataPromise;
  jpDataLoading=true;jpDataError="";
  jpDataPromise=(async function(){
    try{
      const pair=await Promise.all([
        fetch("./data/japanese/joyo.tsv",{cache:"no-store"}),
        fetch("./data/japanese/hyogai.txt",{cache:"no-store"}),
        fetch("./data/japanese/words.json",{cache:"no-store"}),
        fetch("./data/japanese/mext-onkun-2017.json",{cache:"no-store"}),
        fetch("./data/japanese/hyogai-meta.json",{cache:"no-store"}),
        fetch("./data/japanese/jlpt-levels.json",{cache:"no-store"})
      ]);
      if(pair.some(function(r){return !r.ok}))throw Error("HTTP "+pair.map(function(r){return r.status}).join("/"));
      const joyo=parseJoyoData(await pair[0].text());
      const joyoSet=new Set(joyo.map(function(x){return x.char}));
      const hyogai=parseHyogaiData(await pair[1].text(),joyoSet);
      const wordData=await pair[2].json();
      const words=Array.isArray(wordData)?wordData:(wordData.items||[]);
      const mextData=await pair[3].json();
      const hyogaiMeta=await pair[4].json();
      const jlptData=await pair[5].json();
      jpApplyHyogaiGroups(hyogai,hyogaiMeta);
      jpApplyJlptData(joyo,words,jlptData);
      if(joyo.length!==2136||hyogai.length<4000||words.length<2000||(mextData.entries||[]).length<2100||Object.keys(jlptData.kanji||{}).length<2100)throw Error("일본 한자 데이터 수가 비정상입니다.");
      jpJoyo=joyo;jpHyogai=hyogai;jpWords=words;jpHyogaiMeta=hyogaiMeta;
      jpBuildItemMap();jpBuildMextIndex(mextData);
      return true;
    }catch(e){
      jpDataError=String((e&&e.message)||e);
      return false;
    }finally{
      jpDataLoading=false;
    }
  })();
  try{return await jpDataPromise}
  finally{jpDataPromise=null}
}
function jpCurrentPool(){
  let rows=jpState.set==="joyo"?jpJoyo:jpHyogai;
  if(jpState.set==="joyo"&&jpState.jlpt!=="all")rows=rows.filter(function(x){return jpItemJlpt(x)===jpState.jlpt});
  if(jpState.set==="hyogai")rows=rows.filter(function(x){return !!x.hyogaiPractical});
  if(jpState.set==="rare")rows=rows.filter(function(x){return !x.hyogaiPractical});
  if(jpState.savedOnly)rows=rows.filter(function(x){return !!jpUnknown[jpKey(x)]});
  const q=String(jpState.query||"").trim();
  if(q){
    const fq=jpKanaFold(q);
    rows=rows.filter(function(x){
      if(x.char.includes(q)||(x.old||"").includes(q)||(x.radical||"").includes(q))return true;
      if((x.variants||[]).some(function(v){return v.includes(q)}))return true;
      const readings=jpReadingText(x).join(" ");
      if(readings&&jpKanaFold(readings).includes(fq))return true;
      const ko=jpKoreanHanjaMeaning(x);
      return ko&&norm(ko).includes(norm(q));
    });
  }
  return rows;
}function jpCurrentWords(){
  if(jpState.set==="rare")return [];
  let rows=jpWords.filter(function(w){return w.set===jpState.set});
  if(jpState.wordTier!=="all"){
    rows=rows.filter(function(w){return jpState.set==="joyo"?jpWordJlpt(w)===jpState.wordTier:jpWordStudyStage(w)===jpState.wordTier});
  }
  return rows;
}function jpWordRoundInfo(rows){
  const size=Math.max(1,+jpState.wordCount||20);
  const total=Math.max(1,Math.ceil(rows.length/size));
  jpState.wordRound=Math.max(0,Math.min(+jpState.wordRound||0,total-1));
  const start=jpState.wordRound*size,end=Math.min(rows.length,start+size);
  return {size:size,total:total,start:start,end:end,rows:rows.slice(start,end)};
}
function jpWordRoundStatus(rows){
  let tried=0,correct=0;
  rows.forEach(function(w){
    const s=jpWordStats[jpWordKey(w)]||{},n=(+s.ok||0)+(+s.no||0);
    if(n){tried++;if((+s.ok||0)>0)correct++}
  });
  return {tried:tried,correct:correct,done:rows.length>0&&tried===rows.length};
}
function jpSetWordRound(n){
  jpState.wordRound=Math.max(0,+n||0);
  renderJapanese();
}
function jpProfile(){
  const pool=jpState.set==="joyo"?jpJoyo:(jpState.set==="rare"?jpHyogai.filter(function(x){return !x.hyogaiPractical}):jpHyogai.filter(function(x){return !!x.hyogaiPractical}));
  const allowed=new Set(pool.map(function(x){return x.char}));
  const keys=Object.keys(jpStats).filter(function(k){
    const p=k.indexOf("|");return p>=0&&allowed.has(k.slice(p+1));
  });
  let attempted=0,ok=0,no=0;
  keys.forEach(function(k){
    const st=jpStats[k]||{},n=(+st.ok||0)+(+st.no||0);
    if(n){attempted++;ok+=+st.ok||0;no+=+st.no||0}
  });
  const saved=Object.keys(jpUnknown).filter(function(k){
    const p=k.indexOf("|");return p>=0&&allowed.has(k.slice(p+1));
  }).length;
  return {attempted:attempted,ok:ok,no:no,saved:saved,accuracy:(ok+no)?Math.round(ok/(ok+no)*100):0};
}function jpWordProfile(){
  const rows=Object.values(jpWordStats||{});
  let ok=0,no=0,attempted=0;
  rows.forEach(function(s){const n=(+s.ok||0)+(+s.no||0);if(n){attempted++;ok+=+s.ok||0;no+=+s.no||0}});
  return {attempted:attempted,accuracy:(ok+no)?Math.round(ok/(ok+no)*100):0};
}
function jpCardMeta(x){
  if(x.set==="joyo"){
    const old=x.old?(" · 旧 "+x.old):"";
    return jpItemJlpt(x)+" · "+jpGradeLabel(x.grade)+" · "+x.strokes+"획 · "+(x.radical||"—")+old;
  }
  const label=(x.hyogaiPractical?"표외 실용":"희귀·비실용")+" · "+jpHyogaiGroupLabel(x.hyogaiGroup);
  return x.variants&&x.variants.length?(label+" · 이체 "+x.variants.join("·")):label;
}
function jpMetaPillsHtml(x){
  const a=[];
  if(x.set==="joyo"){
    a.push(jpItemJlpt(x));
    a.push(jpGradeLabel(x.grade));
    if(x.strokes)a.push(x.strokes+"획");
    if(x.radical)a.push("부수 "+x.radical);
    if(x.old)a.push("旧字体 "+x.old);
  }else{
    a.push(x.hyogaiPractical?"表外 · 실용":"희귀·비실용");
    a.push(jpHyogaiGroupLabel(x.hyogaiGroup));
    if(x.variants&&x.variants.length)a.push("이체 "+x.variants.join("·"));
  }
  return "<div class='jp-meta-pills'>"+a.map(function(v){return "<span class='jp-meta-pill'>"+esc(v)+"</span>"}).join("")+"</div>";
}
function setJapaneseSet(s){
  jpState.set=s==="hyogai"?"hyogai":s==="rare"?"rare":"joyo";
  jpState.grade="all";jpState.jlpt="all";jpState.hyogaiTier="all";jpState.query="";jpState.savedOnly=false;jpState.limit=120;jpState.atlasLimit=160;
  jpState.atlasGroup=jpState.set==="joyo"?"on":"list";jpState.atlasInitial="all";
  jpState.wordTier="all";jpState.wordRound=0;
  jpState.readingQuizLevel="all";jpState.readingQuizIndex=0; jpState.readingQuizList=[];
  jpState.readingInitial="all";jpState.readingSelected="";jpState.readingQuery="";jpState.readingRemote=[];jpState.readingRemoteError="";
  if(jpState.set==="rare"&&jpState.view==="word")jpState.view="atlas";
  if(jpState.set==="rare"&&jpState.view==="wordreading")jpState.view="atlas";
  renderJapanese();
}function setJapaneseView(v){
  jpState.view=["home","practice","atlas","word","wordreading","reading"].includes(v)?v:"home";
  if(jpState.set==="rare"&&jpState.view==="word")jpState.view="atlas";
  if(jpState.set==="rare"&&jpState.view==="wordreading")jpState.view="atlas";
  jpState.query="";jpState.savedOnly=false;jpState.limit=120;jpState.atlasLimit=160;
  if(jpState.view!=="reading"){jpState.readingSelected="";jpState.readingRemote=[];jpState.readingRemoteError=""}
  renderJapanese();
}
function jpOpenSavedAtlas(){
  jpState.view="atlas";jpState.savedOnly=true;jpState.query="";jpState.atlasLimit=160;renderJapanese();
}
function jpOpenGradePractice(g){
  jpState.set="joyo";jpState.grade="all";jpState.jlpt=g||"all";jpState.view="practice";jpState.savedOnly=false;jpState.query="";jpState.limit=120;renderJapanese();
}
function jpStartQuickChars(set){
  jpState.set=set==="hyogai"?"hyogai":set==="rare"?"rare":"joyo";jpState.grade="all";jpState.jlpt="all";jpState.view="practice";jpState.savedOnly=false;jpState.query="";
  jpState.order="random";jpState.count=20;
  startJapanesePractice();
}function jpHomeWordProgress(set){
  const rows=set==="rare"?[]:jpWords.filter(function(w){return w.set===set});
  const size=Math.max(1,+jpState.wordCount||20),total=rows.length?Math.ceil(rows.length/size):0;
  let done=0,tried=0,next=0,foundNext=false;
  for(let i=0;i<total;i++){
    const part=rows.slice(i*size,Math.min(rows.length,(i+1)*size)),st=jpWordRoundStatus(part);
    if(st.done)done++;
    else if(!foundNext){next=i;foundNext=true}
    tried+=st.tried;
  }
  if(total&&!foundNext)next=Math.max(0,total-1);
  return {rows:rows,total:total,done:done,tried:tried,size:size,next:next};
}function setJapaneseGrade(g){jpState.jlpt=g;jpState.limit=120;jpState.atlasLimit=160;renderJapanese()}
function setJapaneseMode(m){jpState.mode=m==="copy"?"copy":"memory";renderJapanese()}
function setJapaneseOrder(o){jpState.order=o==="random"?"random":"source";renderJapanese()}
function toggleJapaneseSavedOnly(){jpState.savedOnly=!jpState.savedOnly;jpState.limit=120;jpState.atlasLimit=160;renderJapanese()}
function applyJapaneseSearch(){
  jpState.query=($("#jpSearch")&&$("#jpSearch").value)||"";
  jpState.limit=120;jpState.atlasLimit=160;renderJapanese();
}
function toggleJpUnknown(item){
  const k=jpKey(item);
  if(jpUnknown[k]){
    delete jpUnknown[k];
    toast("「"+item.char+"」 저장 해제");
  }else{
    jpUnknown[k]={char:item.char,set:item.set,grade:item.grade||"",strokes:item.strokes||0,radical:item.radical||"",old:item.old||"",variants:item.variants||[],savedAt:Date.now()};
    toast("「"+item.char+"」 모르는 한자에 저장");
  }
  saveJpProgress();
  const b=$("#jpUnknownBtn");
  if(b){
    const yes=!!jpUnknown[k];
    b.classList.toggle("saved",yes);
    b.textContent=yes?"★ 저장됨":"☆ 모름 저장";
  }
  const ab=$("#jpAtlasSave");
  if(ab){
    const yes=!!jpUnknown[k];
    ab.classList.toggle("primary",yes);
    ab.textContent=yes?"★ 저장됨":"☆ 모름 저장";
  }
}
function jpGradeChipsHtml(){
  const a=[["all","전체"],["N5","N5"],["N4","N4"],["N3","N3"],["N2","N2"],["N1","N1"]];
  return a.map(function(v){
    return "<button class='jp-filter-chip "+(jpState.jlpt===v[0]?"active":"")+"' data-grade='"+v[0]+"'>"+v[1]+"</button>";
  }).join("");
}
function jpCardsHtml(rows,atlas){
  return rows.map(function(x){
    const saved=!!jpUnknown[jpKey(x)];
    const on=jpReadingText(x,"on"),kun=jpReadingText(x,"kun");
    const sampleWord=x.set==="hyogai"&&x.hyogaiPractical?jpRelatedWords(x.char)[0]:null;
    const readingMeta=[on.length?("音 "+on.slice(0,2).join("・")):"",kun.length?("訓 "+kun.slice(0,2).join("・")):""].filter(Boolean).join(" · ")||
      (sampleWord?("예 "+jpWordDisplayText(sampleWord)+" · "+sampleWord.reading):"");
    if(atlas){
      return "<button type='button' class='jp-atlas-card "+(saved?"saved":"")+"' data-jp-atlas='"+esc(x.char)+"'><div class='char' lang='ja'>"+esc(x.char)+"</div><span class='meta'>"+(saved?"★ ":"")+esc(jpCardMeta(x))+"</span>"+(readingMeta?"<span class='jp-card-reading'>"+esc(readingMeta)+"</span>":"")+"</button>";
    }
    return "<button type='button' class='jp-card "+(saved?"saved":"")+"' data-jp-char='"+esc(x.char)+"'>"+
      "<div class='jp-card-char' lang='ja'>"+esc(x.char)+"</div>"+
      "<div class='jp-card-meta'>"+(saved?"★ ":"")+esc(jpCardMeta(x))+"</div>"+(readingMeta?"<div class='jp-card-reading'>"+esc(readingMeta)+"</div>":"")+"</button>";
  }).join("");
}
function jpAtlasReadingGroups(rows,kind){
  const m=new Map();
  rows.forEach(function(item){
    const reading=jpPrimaryReading(item,kind);
    const key=reading?jpKanaFold(reading):"기타";
    const initial=reading?jpReadingInitialKey(reading):"기타";
    const g=m.get(key)||{key:key,reading:reading||"읽기 없음",initial:initial,rows:[]};
    g.rows.push(item);m.set(key,g);
  });
  return [...m.values()].sort(function(a,b){
    if(a.key==="기타")return 1;if(b.key==="기타")return -1;
    return a.reading.localeCompare(b.reading,"ja");
  });
}
function jpAtlasGroupedHtml(all){
  const kind=jpState.atlasGroup==="kun"?"kun":"on";
  let groups=jpAtlasReadingGroups(all,kind);
  if(jpState.atlasInitial!=="all")groups=groups.filter(function(g){return g.initial===jpState.atlasInitial});
  const initials=[["all","전체"],["あ","あ"],["か","か"],["さ","さ"],["た","た"],["な","な"],["は","は"],["ま","ま"],["や","や"],["ら","ら"],["わ","わ"],["기타","기타"]];
  let h="<div class='jp-filter-row jp-atlas-initials'>"+initials.map(function(x){return "<button type='button' class='jp-filter-chip "+(jpState.atlasInitial===x[0]?"active":"")+"' data-jp-atlas-initial='"+x[0]+"'>"+x[1]+"</button>"}).join("")+"</div>";
  if(!groups.length)return h+"<div class='jp-empty'>이 분류에 해당하는 한자가 없습니다.</div>";
  h+="<div class='jp-atlas-reading-sections'>";
  groups.forEach(function(g){
    h+="<section class='jp-atlas-reading-section'><div class='jp-atlas-reading-head'><b>"+esc(g.reading)+"</b><span>"+g.rows.length+"자</span></div><div class='jp-atlas-grid'>"+jpCardsHtml(g.rows,true)+"</div></section>";
  });
  return h+"</div>";
}
function jpHeroHtml(){
  const home=jpState.view==="home";
  const n=jpHyogaiTierCounts();
  const setDesc=jpState.set==="joyo"?"常用漢字 2,136자":jpState.set==="hyogai"?"表外漢字 실용 "+n.practical.toLocaleString()+"자":"희귀·비실용 "+n.rare.toLocaleString()+"자";
  const subNav=home?"":("<div class='jp-view-seg jp-sub-nav'><button data-jp-view='practice' class='"+(jpState.view==="practice"?"active":"")+"'>書 글자</button>"+(jpState.set==="rare"?"":"<button data-jp-view='word' class='"+(jpState.view==="word"?"active":"")+"'>文 단어쓰기</button>")+(jpState.set!=="rare"?"<button data-jp-view='wordreading' class='"+(jpState.view==="wordreading"?"active":"")+"'>読 읽기</button>":"")+"<button data-jp-view='atlas' class='"+(jpState.view==="atlas"?"active":"")+"'>冊 도감</button><button data-jp-view='reading' class='"+(jpState.view==="reading"?"active":"")+"'>音 음훈</button></div>");
  return "<section class='jp-hero "+(home?"jp-home-hero":"jp-sub-hero")+"'>"+
    "<div class='jp-kicker'>HANJA LAB · JAPANESE</div><div class='jp-hero-line'><div><h2>"+(home?"日本漢字":(jpState.view==="practice"?"글자 쓰기":jpState.view==="word"?"단어 쓰기":jpState.view==="wordreading"?(jpState.set==="hyogai"?"표외 한자 읽기":"JLPT 단어 읽기"):jpState.view==="reading"?"음독·훈독별":"일본 한자 도감"))+"</h2>"+
    "<p>"+(home?"상용한자는 JLPT N5~N1 중심으로, 표외 실용·희귀/비실용은 기존 구조대로 분리해 학습합니다.":setDesc+" · "+(jpState.view==="practice"?"손글씨 형태 연습":jpState.view==="word"?"예문 기반 단어쓰기":jpState.view==="wordreading"?(jpState.set==="hyogai"?"표외한자가 들어간 실제 단어를 보고 히라가나 읽기 입력":"한자어를 보고 히라가나 읽기 입력"):jpState.view==="reading"?"읽기별 한자 탐색":"읽기·훈음·연관 단어 탐색"))+"</p></div>"+
    (home?"":"<button class='jp-home-back' data-jp-view='home'>⌂ 홈</button>")+"</div>"+
    "<div class='jp-set-seg'><button class='"+(jpState.set==="joyo"?"active":"")+"' data-jp-set='joyo'>常用漢字<small>2,136자</small></button>"+
    "<button class='"+(jpState.set==="hyogai"?"active":"")+"' data-jp-set='hyogai'>表外漢字<small>실용 "+n.practical.toLocaleString()+"자</small></button>"+
    "<button class='"+(jpState.set==="rare"?"active":"")+"' data-jp-set='rare'>희귀·비실용<small>"+n.rare.toLocaleString()+"자</small></button></div>"+
    subNav+
  "</section>";
}function jpHomeHtml(){
  const p=jpProfile(),word=jpHomeWordProgress(jpState.set);
  const hyCount=jpHyogaiTierCounts();
  const total=jpState.set==="joyo"?jpJoyo.length:jpState.set==="hyogai"?hyCount.practical:hyCount.rare;
  const setLabel=jpState.set==="joyo"?"常用漢字":jpState.set==="hyogai"?"表外漢字 · 실용":"희귀·비실용";
  const wordCount=jpState.set==="rare"?0:jpWords.filter(function(w){return w.set===jpState.set}).length;
  const saved=p.saved;
  let h="<section class='jp-home-main'>";
  h+="<div class='jp-home-status'><div><span>현재 컬렉션</span><b>"+setLabel+"</b><small>"+total.toLocaleString()+"자"+(jpState.set==="rare"?" · 기본 단어학습 제외":" · 단어 "+wordCount.toLocaleString()+"개")+"</small></div><div class='jp-home-ring' style='--jp-ring:"+p.accuracy+"%'><b>"+p.accuracy+"%</b><span>글자 정확도</span></div></div>";
  h+="<div class='jp-home-actions'>";
  h+="<button class='jp-home-action write' data-jp-view='practice'><span class='jp-action-glyph'>書</span><span><b>글자 쓰기</b><small>"+(jpState.set==="joyo"?"JLPT N5~N1별 한자 손글씨 연습":"2초 암기 또는 보고 따라쓰기")+"</small></span><i>›</i></button>";
  if(jpState.set!=="rare")h+="<button class='jp-home-action word' data-jp-view='word'><span class='jp-action-glyph'>文</span><span><b>단어 쓰기</b><small>"+(jpState.set==="joyo"?"JLPT별 읽기·뜻·예문 기반 쓰기":"읽기·뜻·예문을 보고 직접 쓰기")+"</small></span><i>›</i></button>";
  if(jpState.set!=="rare")h+="<button class='jp-home-action reading-quiz' data-jp-view='wordreading'><span class='jp-action-glyph'>読</span><span><b>"+(jpState.set==="hyogai"?"표외 한자 읽기":"JLPT 단어 읽기")+"</b><small>"+(jpState.set==="hyogai"?"표외한자가 들어간 실제 단어 읽기":"한자어를 보고 히라가나 읽기 입력")+"</small></span><i>›</i></button>";
  h+="<button class='jp-home-action atlas' data-jp-view='atlas'><span class='jp-action-glyph'>冊</span><span><b>한자 도감</b><small>음독·훈독·한국어 훈음·연관어</small></span><i>›</i></button>";
  h+="<button class='jp-home-action reading' data-jp-view='reading'><span class='jp-action-glyph'>音</span><span><b>독음·훈독별</b><small>"+(jpState.set==="rare"?"희귀자 읽기 검색":"상용 공식 읽기 · 표외 읽기 검색")+"</small></span><i>›</i></button>";
  h+="<button class='jp-home-action saved' id='jpHomeSaved'><span class='jp-action-glyph'>★</span><span><b>저장한 한자</b><small>모르는 한자 "+saved+"자 다시 보기</small></span><i>›</i></button>";
  h+="</div></section>";

  h+="<section class='jp-home-progress-card'><div class='jp-home-progress-head'><div><span>학습 현황</span><b>"+setLabel+"</b></div><button id='jpQuick20'>랜덤 20자</button></div>";
  h+="<div class='jp-home-progress-grid'><div><b>"+p.attempted.toLocaleString()+"</b><span>연습한 글자</span></div><div><b>"+p.accuracy+"%</b><span>글자 정답률</span></div><div><b>"+word.tried.toLocaleString()+"</b><span>연습한 단어</span></div><div><b>"+word.done+"/"+word.total+"</b><span>완료 회차</span></div></div>";
  h+="<div class='jp-home-progress-bar'><i style='width:"+Math.min(100,total?Math.round(p.attempted/total*100):0)+"%'></i></div><small>글자 접촉률 "+(total?Math.round(p.attempted/total*100):0)+"% · 저장 "+saved+"자</small></section>";

  if(jpState.set==="joyo"){
    h+="<section class='app-section jp-grade-launch'><div class='app-section-head'><div><div class='app-section-title'>JLPT별 바로가기</div><div class='app-section-sub'>N5~N1 학습 기준으로 바로 글자 쓰기에 들어갑니다.</div></div></div><div class='jp-home-grade-grid'>";
    [["N5","N5"],["N4","N4"],["N3","N3"],["N2","N2"],["N1","N1"]].forEach(function(g){
      const n=jpJoyo.filter(function(x){return jpItemJlpt(x)===g[0]}).length;
      h+="<button data-jp-home-grade='"+g[0]+"'><b>"+g[1]+"</b><span>"+n+"자</span></button>";
    });
    h+="</div></section>";
  }else if(jpState.set==="hyogai"){
    const samples=jpWords.filter(function(w){return w.set==="hyogai"}).slice(0,6);
    h+="<section class='app-section jp-hyogai-spot'><div class='app-section-head'><div><div class='app-section-title'>표외 단어 맛보기</div><div class='app-section-sub'>실제 단어·예문에 연결된 표외한자만 기본 학습합니다.</div></div><button class='btn' data-jp-view='word'>전체 보기</button></div><div class='jp-hyogai-samples'>";
    h+=samples.map(function(w){return "<div><b lang='ja'>"+esc(jpWordDisplayForm(w))+"</b>"+jpWordVariantNoteHtml(w)+"<span>"+esc(w.reading)+"</span><small>"+esc(w.meaning)+"</small></div>"}).join("");
    h+="</div></section>";
  }else{
    h+="<section class='app-section jp-hyogai-spot jp-rare-spot'><div class='app-section-head'><div><div class='app-section-title'>희귀·비실용 한자</div><div class='app-section-sub'>현대 일본어의 기본 학습 우선순위에서 벗어난 3,581자를 별도 보존합니다. 표외 실용 학습에는 섞이지 않습니다.</div></div><button class='btn' data-jp-view='atlas'>도감 보기</button></div></section>";
  }

  if(jpState.set!=="rare"){
    h+="<section class='jp-home-next'><div><span>NEXT</span><b>"+(word.done<word.total?(word.next+1)+"회차 단어쓰기":"단어 회차 완료")+"</b><small>"+(word.done<word.total?"회차당 "+word.size+"단어 · 현재 컬렉션 "+wordCount+"단어":"원하는 회차를 골라 복습할 수 있습니다.")+"</small></div><button id='jpHomeWordNext'>"+(word.done<word.total?"이어가기":"복습하기")+" →</button></section>";
  }else{
    h+="<section class='jp-home-next'><div><span>ARCHIVE</span><b>희귀자 별도 학습</b><small>표외 실용 661자와 분리된 보존·탐색용 범위입니다.</small></div><button data-jp-view='atlas'>도감 →</button></section>";
  }
  h+="<button class='jp-home-search' id='jpHomeSearch'>⌕ 일본 한자·단어 전체 찾기</button>";
  return h;
}function jpMetricsHtml(){
  const p=jpProfile(),wp=jpWordProfile(),rp=jpReadingQuizProfile(),hyCount=jpHyogaiTierCounts();
  const setTotal=jpState.set==="joyo"?jpJoyo.length:jpState.set==="hyogai"?hyCount.practical:hyCount.rare;
  const label=jpState.set==="joyo"?"현재 상용 목록":jpState.set==="hyogai"?"표외 실용 목록":"희귀·비실용 목록";
  const third=jpState.view==="word"
    ?{n:wp.attempted,label:"단어 연습 · "+wp.accuracy+"%"}
    :jpState.view==="wordreading"
      ?{n:rp.attempted,label:"읽기 연습 · "+rp.accuracy+"%"}
      :{n:p.saved,label:"모름 저장"};
  return "<div class='jp-metrics'><div class='jp-metric'><b>"+setTotal.toLocaleString()+"</b><span>"+label+"</span></div>"+
    "<div class='jp-metric'><b>"+p.attempted.toLocaleString()+"</b><span>글자 연습 · "+p.accuracy+"%</span></div>"+
    "<div class='jp-metric'><b>"+third.n.toLocaleString()+"</b><span>"+third.label+"</span></div></div>";
}function jpCommonFilterHtml(all,atlas){
  const sourceSub=jpState.set==="joyo"?
    "JLPT N5~N1 학습 기준으로 상용한자를 나눠 봅니다. 학교급은 카드·도감의 부가정보로 유지합니다.":
    jpState.set==="hyogai"?
      "실제 표외 단어·예문에 연결된 661자만 기본 표외 학습 범위로 표시합니다.":
      "현대 일본어의 기본 학습 우선순위에서 제외한 희귀·비실용 3,581자를 별도 탐색합니다.";
  return "<section class='app-section'><div class='app-section-head'><div><div class='app-section-title'>"+(atlas?"도감 범위":"연습 범위")+"</div><div class='app-section-sub'>"+sourceSub+"</div></div><span class='badge'>"+all.length.toLocaleString()+"자</span></div>"+
    (jpState.set==="joyo"?"<div class='jp-filter-row' id='jpGradeRow'>"+jpGradeChipsHtml()+"</div>":"")+
    "<div class='jp-search-row'><input id='jpSearch' type='text' value='"+esc(jpState.query)+"' placeholder='"+(jpState.set==="joyo"?"한자 · 구자체 · 부수 검색":jpState.set==="hyogai"?"한자 · 이체자 · 읽기 검색":"희귀 한자 · 이체자 · 읽기 검색")+"'><button class='btn jp-saved-toggle "+(jpState.savedOnly?"primary":"")+"' id='jpSavedOnly'>★ 저장만</button></div></section>";
}function jpPracticeHomeHtml(all){
  const shown=all.slice(0,jpState.limit);
  const modeNote=jpState.mode==="memory"?
    "글자를 2초 보여준 뒤 가립니다. 화면에는 큰 물음표 대신 작은 ‘가려짐’ 표시만 남겨 쓰기에 집중하도록 바꿨습니다.":
    "정답 글자를 계속 보면서 따라 씁니다. 처음 보는 표외한자나 복잡한 글자에 적합합니다.";
  const nStart=Math.min(jpState.count||all.length,all.length);
  let h=jpCommonFilterHtml(all,false);
  h+="<section class='app-section'><div class='app-section-head'><div><div class='app-section-title'>손글씨 연습</div><div class='app-section-sub'>한 글자의 형태를 익히는 모드</div></div><span class='badge good'>"+(jpState.mode==="memory"?"암기 쓰기":"보고 쓰기")+"</span></div>";
  h+="<div class='jp-practice-grid'><div class='jp-field'><span>쓰기 방식</span><div class='jp-mode-seg' id='jpModeSeg'><button data-mode='memory' class='"+(jpState.mode==="memory"?"active":"")+"'>2초 암기 → 쓰기</button><button data-mode='copy' class='"+(jpState.mode==="copy"?"active":"")+"'>보고 따라쓰기</button></div></div>";
  h+="<div class='jp-field'><span>순서</span><div class='jp-mode-seg' id='jpOrderSeg'><button data-order='source' class='"+(jpState.order==="source"?"active":"")+"'>목록순</button><button data-order='random' class='"+(jpState.order==="random"?"active":"")+"'>랜덤</button></div></div>";
  h+="<label class='jp-field'><span>분량</span><select id='jpCount'><option value='20' "+(jpState.count===20?"selected":"")+">20자</option><option value='50' "+(jpState.count===50?"selected":"")+">50자</option><option value='100' "+(jpState.count===100?"selected":"")+">100자</option><option value='0' "+(jpState.count===0?"selected":"")+">현재 목록 전체</option></select></label></div>";
  h+="<div class='jp-mode-note'>"+modeNote+"</div><button class='btn primary app-start' id='jpStart' style='width:100%;margin-top:10px' "+(all.length?"":"disabled")+">현재 범위로 연습 시작 · "+nStart.toLocaleString()+"자</button></section>";
  h+="<section class='app-section'><div class='app-section-head'><div><div class='app-section-title'>한자 목록</div><div class='app-section-sub'>글자를 누르면 그 글자부터 바로 연습합니다.</div></div></div>";
  if(shown.length){
    h+="<div class='jp-grid'>"+jpCardsHtml(shown,false)+"</div>";
    if(all.length>shown.length)h+="<button class='btn jp-more' id='jpMore'>더 보기 · "+shown.length.toLocaleString()+"/"+all.length.toLocaleString()+"</button>";
  }else h+="<div class='jp-empty'>조건에 맞는 한자가 없습니다.</div>";
  h+="</section>";
  return h;
}
function jpAtlasHomeHtml(all){
  let h=jpCommonFilterHtml(all,true);
  h+="<section class='app-section'><div class='app-section-head'><div><div class='app-section-title'>일본 한자 도감</div><div class='app-section-sub'>한국 한자 도감처럼 읽기 기준으로 묶어 볼 수 있습니다. 상용한자는 음독·훈독별, 표외한자는 목록 기준으로 봅니다.</div></div><label class='jp-atlas-font-control'><span>도감 글씨체</span><select id='jpAtlasFont'>"+jpAtlasFontOptionsHtml()+"</select></label></div>";
  if(jpState.set==="joyo"){
    h+="<div class='jp-mode-seg jp-atlas-group-mode'><button type='button' data-jp-atlas-group='on' class='"+(jpState.atlasGroup==="on"?"active":"")+"'>音 읽기별</button><button type='button' data-jp-atlas-group='kun' class='"+(jpState.atlasGroup==="kun"?"active":"")+"'>訓 읽기별</button><button type='button' data-jp-atlas-group='list' class='"+(jpState.atlasGroup==="list"?"active":"")+"'>목록 보기</button></div>";
  }
  if(all.length){
    if(jpState.set==="joyo"&&jpState.atlasGroup!=="list"){
      h+=jpAtlasGroupedHtml(all);
    }else{
      const shown=all.slice(0,jpState.atlasLimit);
      h+="<div class='jp-atlas-grid'>"+jpCardsHtml(shown,true)+"</div>";
      if(all.length>shown.length)h+="<button type='button' class='btn jp-more' id='jpAtlasMore'>더 보기 · "+shown.length.toLocaleString()+"/"+all.length.toLocaleString()+"</button>";
    }
  }else h+="<div class='jp-empty'>조건에 맞는 한자가 없습니다.</div>";
  h+="<div class='jp-mode-note'>카드를 누르면 공식 음독·훈독, 획수·부수, 구자체/신자체 관계, 한국어 훈음과 연관 단어를 함께 봅니다.</div></section>";
  return h;
}
async function jpSelectReading(key){
  jpState.readingSelected=jpState.readingSelected===key?"":key;
  await renderJapanese();
  if(!jpState.readingSelected)return;
  requestAnimationFrame(function(){
    const el=document.querySelector(".jp-reading-inline-detail");
    if(el&&el.scrollIntoView){
      try{el.scrollIntoView({block:"nearest",inline:"nearest",behavior:"smooth"})}
      catch{el.scrollIntoView(false)}
    }
  });
}
function jpCloseReadingDetail(){
  jpState.readingSelected="";
  renderJapanese();
}
function jpReadingHomeHtml(){
  const kind=jpState.readingKind==="kun"?"kun":"on";
  const title=kind==="on"?"음독":"훈독";
  const sourceDesc=jpState.set==="joyo"?"문부과학성 상용한자 음훈표를 기준으로 묶습니다.":jpState.set==="hyogai"?"표외 실용 661자 안에서 KanjiAPI 읽기 색인을 검색합니다.":"희귀·비실용 3,581자 안에서 KanjiAPI 읽기 색인을 검색합니다.";
  const sourceBadge=jpState.set==="joyo"?"공식 상용표":jpState.set==="hyogai"?"표외 실용 검색":"희귀자 검색";
  let h="<section class='app-section jp-reading-browser'><div class='app-section-head'><div><div class='app-section-title'>"+title+"별 한자</div><div class='app-section-sub'>"+sourceDesc+"</div></div><span class='badge good'>"+sourceBadge+"</span></div>";
  h+="<div class='jp-mode-seg jp-reading-kind'><button data-reading-kind='on' class='"+(kind==="on"?"active":"")+"'>音読み 음독</button><button data-reading-kind='kun' class='"+(kind==="kun"?"active":"")+"'>訓読み 훈독</button></div>";
  if(jpState.set==="joyo"){
    const initials=[["all","전체"],["あ","あ"],["か","か"],["さ","さ"],["た","た"],["な","な"],["は","は"],["ま","ま"],["や","や"],["ら","ら"],["わ","わ"]];
    h+="<div class='jp-filter-row jp-reading-initials'>"+initials.map(function(x){return "<button class='jp-filter-chip "+(jpState.readingInitial===x[0]?"active":"")+"' data-reading-initial='"+x[0]+"'>"+x[1]+"</button>"}).join("")+"</div>";
    let groups=jpReadingIndexGroups(kind);
    if(jpState.readingInitial!=="all")groups=groups.filter(function(g){return g.initial===jpState.readingInitial});
    const q=jpKanaFold(jpState.readingQuery||"");
    if(q)groups=groups.filter(function(g){return jpKanaFold(g.reading).includes(q)});
    h+="<div class='jp-search-row'><input id='jpReadingLocalInput' value='"+esc(jpState.readingQuery)+"' placeholder='"+(kind==="on"?"예: カン, コウ":"예: みる, たべる")+"'><button class='btn' id='jpReadingLocalClear'>초기화</button></div>";
    const visibleGroups=groups.slice(0,240);
    const onlyOne=visibleGroups.length===1&&!jpState.readingSelected;
    if(onlyOne)jpState.readingSelected=visibleGroups[0].key;
    h+="<div class='jp-reading-groups'>"+visibleGroups.map(function(g){
      const selected=jpState.readingSelected===g.key;
      let chunk="<button class='jp-reading-group "+(selected?"active":"")+"' data-reading-select='"+esc(g.key)+"' aria-expanded='"+String(selected)+"'><b>"+esc(g.reading)+"</b><span>"+g.rows.length+"자</span></button>";
      if(selected){
        chunk+="<div class='jp-reading-selected jp-reading-inline-detail'><div class='jp-reading-selected-head'><div><small>"+(kind==="on"?"音読み":"訓読み")+"</small><b>"+esc(g.reading)+"</b></div><div class='jp-reading-selected-actions'><span>"+g.rows.length+"자</span><button type='button' class='jp-reading-close' data-reading-close aria-label='읽기 결과 닫기'>×</button></div></div><div class='jp-atlas-grid'>"+
          g.rows.map(function(r){
            const item=jpFindItem(r.char);
            return "<button class='jp-atlas-card' data-jp-atlas='"+esc(r.char)+"'><div class='char' lang='ja'>"+esc(r.char)+"</div><span class='meta'>"+esc(item?jpCardMeta(item):"")+" · "+jpStageLabel(r.stage)+(r.special?" · 특별":"")+"</span></button>";
          }).join("")+"</div></div>";
      }
      return chunk;
    }).join("")+"</div>";
    if(!jpState.readingSelected)h+="<div class='jp-mode-note'>읽기를 누르면 바로 그 아래에 해당 한자가 펼쳐집니다. 같은 읽기를 한 번 더 누르면 닫힙니다.</div>";
  }else{
    h+="<div class='jp-reading-remote-box'><div class='jp-search-row'><input id='jpReadingInput' value='"+esc(jpState.readingQuery)+"' placeholder='"+(kind==="on"?"예: コウ / こう":"예: みる / たべる")+"'><button class='btn primary' id='jpReadingLookup'>읽기 검색</button></div>";
    h+="<div class='jp-mode-note'>"+(jpState.set==="rare"?"희귀·비실용 한자는 공식 상용 음훈표 대상이 아니므로 KANJIDIC 기반 읽기 정보에서 희귀 범위만 추려 표시합니다.":"표외한자는 공식 상용 음훈표 대상이 아니므로 KANJIDIC 기반 읽기 정보에서 실용 표외 범위만 추려 표시합니다.")+"</div>";
    if(jpState.readingRemoteLoading)h+="<div class='jp-empty'>읽기 데이터를 확인하고 있습니다…</div>";
    else if(jpState.readingRemoteError)h+="<div class='jp-empty'>"+esc(jpState.readingRemoteError)+"</div>";
    else if(jpState.readingQuery&&jpState.readingRemote.length)h+="<div class='jp-reading-selected'><div class='jp-reading-selected-head'><b>"+esc(jpState.readingQuery)+"</b><span>"+jpState.readingRemote.length+"자</span></div><div class='jp-atlas-grid'>"+jpCardsHtml(jpState.readingRemote,true)+"</div></div>";
    else if(jpState.readingQuery)h+="<div class='jp-empty'>현재 "+(jpState.set==="rare"?"희귀·비실용":"표외 실용")+" 목록에서 이 읽기와 연결된 한자가 없습니다.</div>";
    h+="</div>";
  }
  h+="</section>";
  return h;
}function jpWordHomeHtml(){
  const baseRows=jpWords.filter(function(w){return w.set===jpState.set}),stageCounts=jpWordStageCounts(baseRows);
  const rows=jpCurrentWords(),info=jpWordRoundInfo(rows),roundRows=info.rows,wp=jpWordProfile();
  const sample=roundRows.slice(0,8);
  const tiers=jpState.set==="joyo"?
    [["all","전체",baseRows.length],["N5","N5",stageCounts.N5],["N4","N4",stageCounts.N4],["N3","N3",stageCounts.N3],["N2","N2",stageCounts.N2],["N1","N1",stageCounts.N1]]:
    [["all","전체",baseRows.length],["entry","입문",stageCounts.entry],["practical","실용",stageCounts.practical],["advanced","고급",stageCounts.advanced],["deep","심화",stageCounts.deep]];
  const stageNote=jpState.set==="hyogai"?"표외 단어는 Hanja Lab 학습용으로 입문·실용·고급·심화 4단계로 묶었습니다. 공식 사용등급을 뜻하지 않습니다.":"JLPT N5~N1 학습 기준으로 단어를 나눠 회차별로 직접 써서 익힙니다.";
  let h=(typeof studyIndexMarkup==="function"?studyIndexMarkup("jpword"):"")+"<section class='app-section'><div class='app-section-head'><div><div class='app-section-title'>단어식 한자쓰기</div><div class='app-section-sub'>"+stageNote+"</div></div><span class='badge good'>"+rows.length.toLocaleString()+"단어</span></div>";
  h+="<div class='jp-word-tier' id='jpWordTier'>"+tiers.map(function(t){return "<button class='jp-filter-chip "+(jpState.wordTier===t[0]?"active":"")+"' data-tier='"+t[0]+"'>"+t[1]+" <small>"+Number(t[2]||0).toLocaleString()+"</small></button>"}).join("")+"</div>";
  h+="<div class='jp-word-count'><label class='jp-field'><span>회차당 문제</span><select id='jpWordCount'><option value='10' "+(jpState.wordCount===10?"selected":"")+">10단어</option><option value='20' "+(jpState.wordCount===20?"selected":"")+">20단어</option><option value='30' "+(jpState.wordCount===30?"selected":"")+">30단어</option><option value='50' "+(jpState.wordCount===50?"selected":"")+">50단어</option></select></label>";
  h+="<label class='jp-field'><span>회차 안 순서</span><select id='jpWordOrder'><option value='random' "+(jpState.wordOrder==="random"?"selected":"")+">랜덤</option><option value='source' "+(jpState.wordOrder==="source"?"selected":"")+">목록순</option></select></label></div>";
  h+="<div class='jp-word-round-head'><b>"+(jpState.wordRound+1)+"회차</b><span>"+(info.start+1)+"~"+info.end+" / "+rows.length+"단어</span></div>";
  h+="<div class='jp-word-rounds' id='jpWordRounds'>";
  for(let i=0;i<info.total;i++){
    const rr=rows.slice(i*info.size,Math.min(rows.length,(i+1)*info.size)),st=jpWordRoundStatus(rr);
    h+="<button class='jp-word-round-chip "+(i===jpState.wordRound?"active":"")+" "+(st.done?"done":"")+"' data-round='"+i+"'>"+(st.done?"✓ ":"")+(i+1)+"회차<small>"+(i*info.size+1)+"~"+Math.min(rows.length,(i+1)*info.size)+" · "+st.tried+"/"+rr.length+"</small></button>";
  }
  h+="</div>";
  h+="<div class='jp-mode-note'>예: <b>けいけん</b> · 경험<br>「海外で貴重な＿＿をしました。」 → 그림판에 <b>経験</b>을 직접 씁니다. 한 회차를 끝내도 다른 회차 진도는 그대로 유지됩니다.</div>";
  h+="<button class='btn primary app-start' id='jpWordStart' style='width:100%;margin-top:10px' "+(roundRows.length?"":"disabled")+">"+(jpState.wordRound+1)+"회차 시작 · "+roundRows.length+"문제</button></section>";
  h+="<section class='app-section'><div class='app-section-head'><div><div class='app-section-title'>"+(jpState.wordRound+1)+"회차 미리보기</div><div class='app-section-sub'>정답 단어는 실제 문제에서 빈칸으로 가려집니다.</div></div><span class='badge'>누적 "+wp.attempted+"단어</span></div>";
  if(sample.length){
    h+="<div class='jp-word-preview-list'>"+sample.map(function(w){return "<div class='jp-word-preview'><b lang='ja'>"+esc(jpWordDisplayForm(w))+"</b>"+jpWordVariantNoteHtml(w)+"<small>"+esc(w.reading)+" · "+esc(w.meaning)+"</small><p>"+esc(jpWordHasRealExample(w)?w.sentence:"예문 없음")+"</p></div>"}).join("")+"</div>";
  }else h+="<div class='jp-empty'>이 회차의 단어 데이터가 없습니다.</div>";
  h+="</section>";
  return h;
}
async function renderJapanese(){
  clearTimeout(jpHideTimer);jpHideTimer=null;
  applyJapaneseAtlasFont();
  document.body.classList.remove("drill-active");
  closeJapaneseAtlasDetail();
  const el=$("#jp");if(!el)return;
  if(!jpJoyo.length||!jpHyogai.length||!jpWords.length){
    el.innerHTML="<div class='app-screen'><section class='app-section'><div class='prompt'>日本漢字 데이터 불러오는 중…</div><div class='sub'>常用漢字 · 表外漢字 · 단어 예문을 준비하고 있습니다.</div></section></div>";
    const ok=await loadJapaneseData();
    if(typeof mode!=="undefined"&&mode!=="jp")return;
    if(!ok){
      el.innerHTML="<div class='app-screen'><section class='app-section'><div class='prompt'>일본 한자 데이터를 불러오지 못했습니다.</div><div class='sub'>"+esc(jpDataError||"네트워크 상태를 확인해 주세요.")+"</div><button class='btn primary' id='jpRetry' style='margin-top:12px'>다시 시도</button></section></div>";
      $("#jpRetry").onclick=function(){jpDataError="";renderJapanese()};
      return;
    }
  }
  const all=jpCurrentPool();
  let body=jpState.view==="home"?jpHomeHtml():(jpState.view==="atlas"?jpAtlasHomeHtml(all):(jpState.view==="word"?jpWordHomeHtml():(jpState.view==="wordreading"?jpReadingQuizHomeHtml():(jpState.view==="reading"?jpReadingHomeHtml():jpPracticeHomeHtml(all)))));
  el.innerHTML="<div class='jp-screen'>"+jpHeroHtml()+(jpState.view==="home"?"":jpMetricsHtml())+body+
    "<section class='app-section'><details class='compact-settings'><summary>데이터 기준</summary><div class='jp-source-note'>常用漢字 2,136자는 학습 화면에서 OpenJLPT의 N5~N1 커뮤니티 학습 목록을 기준으로 분류하고, 문부과학성 「音訓の小・中・高等学校段階別割り振り表」의 학교급 정보는 도감 부가정보로 유지합니다. JLPT는 2010년 이후 공식 고정 한자·어휘 목록을 공개하지 않으므로 N5~N1 표시는 공식 배정표가 아닌 학습용 근사 분류입니다. Hanja Lab 기존 단어는 OpenJLPT 정확 일치를 우선하고, 미일치 항목은 구성 한자 중 가장 어려운 JLPT 레벨로 보완합니다. 表外漢字는 기존대로 실용 661자와 희귀·비실용 3,581자를 분리해 보존하며 JLPT 상용 분류에 섞지 않습니다. 표외 읽기는 KANJIDIC 기반 KanjiAPI와 교차 확인합니다.</div></details></section></div>";
  bindJapaneseHome();
}
function bindJapaneseHome(){
  const root=$(".jp-screen");
  if(root){
    root.onclick=function(e){
      const target=e.target&&e.target.closest?e.target:null;
      if(!target)return;
      const setBtn=target.closest("[data-jp-set]");
      if(setBtn&&root.contains(setBtn)){e.preventDefault();setJapaneseSet(setBtn.dataset.jpSet);return}

      const viewBtn=target.closest("[data-jp-view]");
      if(viewBtn&&root.contains(viewBtn)){e.preventDefault();setJapaneseView(viewBtn.dataset.jpView);return}

      const gradeBtn=target.closest("[data-jp-home-grade]");
      if(gradeBtn&&root.contains(gradeBtn)){e.preventDefault();jpOpenGradePractice(gradeBtn.dataset.jpHomeGrade);return}

      const filterGradeBtn=target.closest("#jpGradeRow [data-grade]");
      if(filterGradeBtn&&root.contains(filterGradeBtn)){e.preventDefault();setJapaneseGrade(filterGradeBtn.dataset.grade);return}

      const hyogaiTierBtn=target.closest("[data-hyogai-tier]");
      if(hyogaiTierBtn&&root.contains(hyogaiTierBtn)){
        e.preventDefault();jpState.hyogaiTier=hyogaiTierBtn.dataset.hyogaiTier||"practical";
        jpState.limit=120;jpState.atlasLimit=160;renderJapanese();return;
      }

      const charBtn=target.closest(".jp-card[data-jp-char]");
      if(charBtn&&root.contains(charBtn)){e.preventDefault();startJapanesePractice(charBtn.dataset.jpChar);return}

      const atlasBtn=target.closest(".jp-atlas-card[data-jp-atlas]");
      if(atlasBtn&&root.contains(atlasBtn)){e.preventDefault();openJapaneseAtlasDetail(atlasBtn.dataset.jpAtlas);return}

      const roundBtn=target.closest("#jpWordRounds [data-round]");
      if(roundBtn&&root.contains(roundBtn)){e.preventDefault();jpSetWordRound(+roundBtn.dataset.round);return}

      const atlasGroupBtn=target.closest("[data-jp-atlas-group]");
      if(atlasGroupBtn&&root.contains(atlasGroupBtn)){e.preventDefault();jpState.atlasGroup=atlasGroupBtn.dataset.jpAtlasGroup||"on";jpState.atlasInitial="all";renderJapanese();return}

      const atlasInitialBtn=target.closest("[data-jp-atlas-initial]");
      if(atlasInitialBtn&&root.contains(atlasInitialBtn)){e.preventDefault();jpState.atlasInitial=atlasInitialBtn.dataset.jpAtlasInitial||"all";renderJapanese();return}

      const readingKindBtn=target.closest("[data-reading-kind]");
      if(readingKindBtn&&root.contains(readingKindBtn)){e.preventDefault();jpState.readingKind=readingKindBtn.dataset.readingKind;jpState.readingSelected="";jpState.readingRemote=[];renderJapanese();return}

      const readingInitialBtn=target.closest("[data-reading-initial]");
      if(readingInitialBtn&&root.contains(readingInitialBtn)){e.preventDefault();jpState.readingInitial=readingInitialBtn.dataset.readingInitial;jpState.readingSelected="";renderJapanese();return}

      const readingCloseBtn=target.closest("[data-reading-close]");
      if(readingCloseBtn&&root.contains(readingCloseBtn)){e.preventDefault();e.stopPropagation();jpCloseReadingDetail();return}

      const readingSelectBtn=target.closest("[data-reading-select]");
      if(readingSelectBtn&&root.contains(readingSelectBtn)){e.preventDefault();jpSelectReading(readingSelectBtn.dataset.readingSelect);return}
    };
  }

  if($("#jpHomeSaved"))$("#jpHomeSaved").onclick=jpOpenSavedAtlas;
  if($("#jpQuick20"))$("#jpQuick20").onclick=function(){jpStartQuickChars(jpState.set)};
  if($("#jpHomeSearch"))$("#jpHomeSearch").onclick=function(){if(typeof openGlobalSearch==="function")openGlobalSearch("")};
  if($("#jpHomeWordNext"))$("#jpHomeWordNext").onclick=function(){
    const info=jpHomeWordProgress(jpState.set);
    jpState.view="word";jpState.wordTier="all";jpState.wordRound=info.next;renderJapanese();
  };
  if($("#jpSavedOnly"))$("#jpSavedOnly").onclick=toggleJapaneseSavedOnly;
  if($("#jpAtlasFont"))$("#jpAtlasFont").onchange=function(e){setJapaneseAtlasFont(e.target.value)};
  if($("#jpSearch")){
    $("#jpSearch").onkeydown=function(e){if(e.key==="Enter")applyJapaneseSearch()};
    $("#jpSearch").onchange=applyJapaneseSearch;
  }
  if($("#jpModeSeg"))$$("#jpModeSeg [data-mode]").forEach(function(b){b.onclick=function(){setJapaneseMode(b.dataset.mode)}});
  if($("#jpOrderSeg"))$$("#jpOrderSeg [data-order]").forEach(function(b){b.onclick=function(){setJapaneseOrder(b.dataset.order)}});
  if($("#jpCount"))$("#jpCount").onchange=function(e){jpState.count=+e.target.value};
  if($("#jpStart"))$("#jpStart").onclick=function(){startJapanesePractice()};
  if($("#jpMore"))$("#jpMore").onclick=function(){jpState.limit+=120;renderJapanese()};
  if($("#jpAtlasMore"))$("#jpAtlasMore").onclick=function(){jpState.atlasLimit+=160;renderJapanese()};
  $$("#jpWordTier [data-tier]").forEach(function(b){b.onclick=function(){jpState.wordTier=b.dataset.tier;jpState.wordRound=0;renderJapanese()}});
  if($("#jpWordCount"))$("#jpWordCount").onchange=function(e){jpState.wordCount=+e.target.value;jpState.wordRound=0;renderJapanese()};
  if($("#jpWordOrder"))$("#jpWordOrder").onchange=function(e){jpState.wordOrder=e.target.value};
  if($("#jpWordStart"))$("#jpWordStart").onclick=startJapaneseWordPractice;
  $("#jpReadingQuizTier [data-reading-quiz-tier]").forEach(function(b){b.onclick=function(){jpState.readingQuizLevel=b.dataset.readingQuizTier||"all";renderJapanese()}});
  if($("#jpReadingQuizCount"))$("#jpReadingQuizCount").onchange=function(e){jpState.readingQuizCount=+e.target.value};
  if($("#jpReadingQuizOrder"))$("#jpReadingQuizOrder").onchange=function(e){jpState.readingQuizOrder=e.target.value};
  if($("#jpReadingQuizStart"))$("#jpReadingQuizStart").onclick=startJapaneseReadingQuiz;
  if($("#jpReadingLocalInput")){
    $("#jpReadingLocalInput").oninput=function(e){jpState.readingQuery=e.target.value};
    $("#jpReadingLocalInput").onkeydown=function(e){if(e.key==="Enter")renderJapanese()};
  }
  if($("#jpReadingLocalClear"))$("#jpReadingLocalClear").onclick=function(){jpState.readingQuery="";jpState.readingSelected="";renderJapanese()};
  if($("#jpReadingInput"))$("#jpReadingInput").onkeydown=function(e){if(e.key==="Enter")jpLookupRemoteReading()};
  if($("#jpReadingLookup"))$("#jpReadingLookup").onclick=jpLookupRemoteReading;
}
function startJapanesePractice(startChar){
  startChar=startChar||"";
  let list=jpCurrentPool().slice();
  if(!list.length){toast("연습할 한자가 없습니다");return}
  if(jpState.order==="random")list=shuffle(list);
  if(startChar){
    const i=list.findIndex(function(x){return x.char===startChar});
    if(i>0)list=list.slice(i).concat(list.slice(0,i));
  }
  if(jpState.count>0)list=list.slice(0,jpState.count);
  jpState.list=list;jpState.index=0;jpState.checked=false;jpState.phase=jpState.mode==="memory"?"memorize":"copy";
  renderJapanesePracticeCard();
}
function exitJapanesePractice(){
  clearTimeout(jpHideTimer);jpHideTimer=null;
  document.body.classList.remove("drill-active");
  if(window._drillViewportFit){
    window.visualViewport&&window.visualViewport.removeEventListener("resize",window._drillViewportFit);
    window._drillViewportFit=null;
  }
  renderJapanese();
}
function jpScheduleHide(){
  clearTimeout(jpHideTimer);jpHideTimer=null;
  if(jpState.mode!=="memory")return;
  jpState.phase="memorize";
  const item=jpState.list[jpState.index];
  const target=$("#jpMemoryTarget"),hint=$("#jpMemoryHint"),again=$("#jpShowAgain");
  if(target){target.classList.remove("hidden");target.textContent=item?item.char:""}
  if(hint)hint.textContent="2초 동안 글자 모양을 기억하세요";
  if(again)again.style.visibility="hidden";
  jpHideTimer=setTimeout(function(){
    jpState.phase="write";
    const t=$("#jpMemoryTarget"),h=$("#jpMemoryHint"),a=$("#jpShowAgain");
    if(t){t.classList.add("hidden");t.textContent="글자 가림"}
    if(h)h.textContent="이제 기억해서 직접 써보세요";
    if(a)a.style.visibility="visible";
  },2000);
}
function jpRecord(item,ok){
  const k=jpKey(item);
  const s=jpStats[k]||(jpStats[k]={ok:0,no:0,last:0,set:item.set,grade:item.grade||""});
  s[ok?"ok":"no"]++;s.last=Date.now();saveJpProgress();
}
function renderJapanesePracticeCard(){
  const st=jpState,item=st.list[st.index];
  if(!item){exitJapanesePractice();return}
  clearTimeout(jpHideTimer);jpHideTimer=null;
  const pct=Math.round((st.index+1)/st.list.length*100),saved=!!jpUnknown[jpKey(item)];
  syncDrillViewport();document.body.classList.add("drill-active");
  if(window._drillViewportFit)window.visualViewport&&window.visualViewport.removeEventListener("resize",window._drillViewportFit);
  window._drillViewportFit=function(){syncDrillViewport()};
  window.visualViewport&&window.visualViewport.addEventListener("resize",window._drillViewportFit,{passive:true});

  let h="";
  h+="<div class='drill-session-shell'><div class='drill-session-top'><div class='drill-status-row'><span class='drill-status-pill accent'>"+(item.set==="joyo"?"常用":"表外")+"</span><span class='drill-status-pill'>"+(st.index+1)+"/"+st.list.length+"</span><span class='drill-status-pill'>"+pct+"%</span><span class='drill-status-pill pen-current-label'>"+(typeof handwritingPenLabel==="function"?handwritingPenLabel():"젤펜")+"</span></div><div class='drill-top-actions'><button class='btn drill-icon-btn drill-settings-btn' id='jpExit'>목록</button></div></div>";
  h+="<div class='drill-stage write-stage'><section class='drill-question-pane jp-practice-question'><div class='prompt'>"+(st.mode==="memory"?"모양을 외운 뒤 직접 써보세요.":"보면서 천천히 따라 써보세요.")+"</div>";
  h+="<div class='jp-memory-target' id='jpMemoryTarget' lang='ja'>"+esc(item.char)+"</div><div class='jp-memory-sub' id='jpMemoryHint'>"+(st.mode==="memory"?"2초 동안 글자 모양을 기억하세요":"정답을 보면서 형태를 익히세요")+"</div>"+jpMetaPillsHtml(item);
  if(st.mode==="memory")h+="<button class='btn jp-memory-again' id='jpShowAgain' style='visibility:hidden'>2초 다시 보기</button>";
  h+="<div id='jpFeedback' class='feedback'></div></section>";
  h+="<section class='drill-canvas-pane'><div class='drill-canvas-wrap'><canvas id='jpCanvas' width='600' height='600'></canvas><div id='jpAnswerPeek' class='drill-answer-overlay jp-answer-overlay' lang='ja' hidden>"+esc(item.char)+"</div></div>";
  h+=(typeof handwritingPenToolbarMarkup==="function"?handwritingPenToolbarMarkup():"");
  h+="<div class='drill-bottom-nav'><button class='btn' id='jpPrev' "+(st.index===0?"disabled":"")+">← 이전 한자</button><button class='btn' id='jpNext'>"+(st.index===st.list.length-1?"처음으로":"다음 한자 →")+"</button></div>";
  h+="<div class='drill-write-controls'><button class='btn' id='jpClear'>지우기</button><button class='btn' id='jpReveal'>정답 보기</button><button class='btn "+(saved?"saved":"")+"' id='jpUnknownBtn'>"+(saved?"★ 저장됨":"☆ 모름 저장")+"</button><button class='btn primary' id='jpCheck'>채점</button></div></section></div></div>";
  $("#jp").innerHTML=h;

  setupAnyCanvas("#jpCanvas");
  const jpSingleCanvas=$("#jpCanvas"),jpSingleWrap=jpSingleCanvas&&jpSingleCanvas.closest(".drill-canvas-wrap");
  if(jpSingleCanvas&&jpSingleWrap)jpInstallCanvasGeometryGuard(jpSingleCanvas,jpSingleWrap);
  if(typeof bindHandwritingPenToolbar==="function")bindHandwritingPenToolbar($("#jp"));
  $("#jpExit").onclick=exitJapanesePractice;
  $("#jpPrev").onclick=function(){if(st.index>0){st.index--;st.checked=false;renderJapanesePracticeCard()}};
  $("#jpNext").onclick=function(){st.index=st.index===st.list.length-1?0:st.index+1;st.checked=false;renderJapanesePracticeCard()};
  $("#jpClear").onclick=function(){clearAnyCanvas("#jpCanvas");const fb=$("#jpFeedback");if(fb){fb.className="feedback";fb.innerHTML=""}};
  const peek=$("#jpAnswerPeek"),rev=$("#jpReveal");
  rev.onclick=function(){const show=peek.hidden;peek.hidden=!show;rev.textContent=show?"정답 숨기기":"정답 보기";rev.classList.toggle("primary",show)};
  $("#jpUnknownBtn").onclick=function(){toggleJpUnknown(item)};
  $("#jpCheck").onclick=function(){
    autoGradeHandwriting("#jpCanvas",item.char,item.strokes||0,function(ok,score,label){
      st.checked=true;showHandwritingResult("#jpFeedback",item.char,ok,score,label);jpRecord(item,ok);
    });
  };
  if($("#jpShowAgain"))$("#jpShowAgain").onclick=jpScheduleHide;
  if(st.mode==="memory")jpScheduleHide();
}

/* Japanese word-reading quiz · 常用 + 表外 */
function jpReadingQuizKey(w){return "reading|"+jpJlptWordKey(w)}
function jpReadingQuizSet(){return jpState.set==="hyogai"?"hyogai":"joyo"}
function jpReadingQuizTier(w){
  return jpReadingQuizSet()==="hyogai"?jpHyogaiWordStage(w):jpWordJlpt(w);
}
function jpReadingQuizTierLabel(v){
  return jpReadingQuizSet()==="hyogai"?jpWordStageLabel(v):v;
}
function jpReadingQuizBaseRows(){
  const set=jpReadingQuizSet();
  return jpWords.filter(function(w){
    if(w.set!==set)return false;
    if(!String(w.word||"").trim()||!String(w.reading||"").trim())return false;
    if(set==="hyogai"){
      return [...String(w.word||"")].some(function(ch){
        const item=jpItemMap.get(ch);
        return item&&item.set==="hyogai"&&item.hyogaiPractical;
      });
    }
    return true;
  });
}
function jpReadingQuizPool(){
  let rows=jpReadingQuizBaseRows();
  if(jpState.readingQuizLevel!=="all")rows=rows.filter(function(w){return jpReadingQuizTier(w)===jpState.readingQuizLevel});
  return rows;
}
function jpReadingQuizCounts(){
  const out=jpReadingQuizSet()==="hyogai"
    ?{entry:0,practical:0,advanced:0,deep:0}
    :{N5:0,N4:0,N3:0,N2:0,N1:0};
  jpReadingQuizBaseRows().forEach(function(w){
    const k=jpReadingQuizTier(w);if(k in out)out[k]++;
  });
  return out;
}
function jpReadingQuizProfile(){
  const rows=jpReadingQuizBaseRows(),allowed=new Set(rows.map(jpReadingQuizKey));
  let attempted=0,ok=0,no=0;
  Object.keys(jpReadingQuizStats).forEach(function(k){
    if(!allowed.has(k))return;
    const s=jpReadingQuizStats[k]||{},n=(+s.ok||0)+(+s.no||0);
    if(n){attempted++;ok+=+s.ok||0;no+=+s.no||0}
  });
  return {attempted:attempted,accuracy:ok+no?Math.round(ok/(ok+no)*100):0};
}
function jpReadingQuizHomeHtml(){
  const set=jpReadingQuizSet(),rows=jpReadingQuizPool(),counts=jpReadingQuizCounts(),p=jpReadingQuizProfile();
  const baseCount=jpReadingQuizBaseRows().length;
  const levels=set==="hyogai"
    ?[["all","전체",baseCount],["entry","입문",counts.entry],["practical","실용",counts.practical],["advanced","고급",counts.advanced],["deep","심화",counts.deep]]
    :[["all","전체",baseCount],["N5","N5",counts.N5],["N4","N4",counts.N4],["N3","N3",counts.N3],["N2","N2",counts.N2],["N1","N1",counts.N1]];
  const count=Math.max(1,+jpState.readingQuizCount||20),startCount=Math.min(count,rows.length);
  const sample=rows.slice(0,8);
  const title=set==="hyogai"?"표외 한자 읽기":"JLPT 한자단어 읽기";
  const sub=set==="hyogai"
    ?"표외한자는 단독 읽기가 여러 개인 경우가 많아 실제 단어 안에서 읽는 법을 입력합니다."
    :"한자어를 보고 읽는 법을 히라가나로 직접 입력합니다.";
  let h="<section class='app-section jp-reading-quiz-home'><div class='app-section-head'><div><div class='app-section-title'>"+title+"</div><div class='app-section-sub'>"+sub+"</div></div><span class='badge good'>"+rows.length.toLocaleString()+"단어</span></div>";
  h+="<div class='jp-word-tier' id='jpReadingQuizTier'>"+levels.map(function(t){return "<button type='button' class='jp-filter-chip "+(jpState.readingQuizLevel===t[0]?"active":"")+"' data-reading-quiz-tier='"+t[0]+"'>"+t[1]+" <small>"+Number(t[2]||0).toLocaleString()+"</small></button>"}).join("")+"</div>";
  h+="<div class='jp-word-count'><label class='jp-field'><span>문제 수</span><select id='jpReadingQuizCount'><option value='10' "+(jpState.readingQuizCount===10?"selected":"")+">10문제</option><option value='20' "+(jpState.readingQuizCount===20?"selected":"")+">20문제</option><option value='50' "+(jpState.readingQuizCount===50?"selected":"")+">50문제</option><option value='100' "+(jpState.readingQuizCount===100?"selected":"")+">100문제</option></select></label>";
  h+="<label class='jp-field'><span>순서</span><select id='jpReadingQuizOrder'><option value='random' "+(jpState.readingQuizOrder==="random"?"selected":"")+">랜덤</option><option value='source' "+(jpState.readingQuizOrder==="source"?"selected":"")+">목록순</option></select></label></div>";
  h+="<div class='jp-mode-note'>문제에는 한자 표기만 먼저 보여 주고, 채점 뒤에 정답 읽기·한국어 뜻·예문을 확인합니다. 가타카나로 입력해도 같은 읽기면 정답으로 처리합니다.</div>";
  h+="<button type='button' class='btn primary app-start' id='jpReadingQuizStart' style='width:100%;margin-top:10px' "+(rows.length?"":"disabled")+">읽기 연습 시작 · "+startCount+"문제</button></section>";
  h+="<section class='app-section'><div class='app-section-head'><div><div class='app-section-title'>범위 미리보기</div><div class='app-section-sub'>현재 "+(jpState.readingQuizLevel==="all"?(set==="hyogai"?"표외 전체":"전체 JLPT"):jpReadingQuizTierLabel(jpState.readingQuizLevel))+" 단어</div></div><span class='badge'>누적 "+p.attempted+"단어 · "+p.accuracy+"%</span></div>";
  if(sample.length)h+="<div class='jp-reading-quiz-preview'>"+sample.map(function(w){return "<div><b lang='ja'>"+esc(jpWordDisplayForm(w))+"</b><span>"+esc(jpReadingQuizTierLabel(jpReadingQuizTier(w)))+"</span><small>"+esc(w.meaning)+"</small></div>"}).join("")+"</div>";
  else h+="<div class='jp-empty'>이 범위의 단어가 없습니다.</div>";
  h+="</section>";
  return h;
}
function startJapaneseReadingQuiz(){
  let rows=jpReadingQuizPool().slice();
  if(!rows.length){toast(jpReadingQuizSet()==="hyogai"?"이 표외 범위의 읽기 단어가 없습니다":"이 JLPT 범위의 단어가 없습니다");return}
  if(jpState.readingQuizOrder==="random")rows=shuffle(rows);
  rows=rows.slice(0,Math.max(1,+jpState.readingQuizCount||20));
  jpState.readingQuizList=rows;jpState.readingQuizIndex=0;jpState.readingQuizChecked=false;
  renderJapaneseReadingQuizCard();
}
function jpReadingQuizRecord(w,ok){
  const k=jpReadingQuizKey(w),s=jpReadingQuizStats[k]||(jpReadingQuizStats[k]={ok:0,no:0,last:0,set:w.set||jpReadingQuizSet(),level:jpReadingQuizTier(w)});
  s[ok?"ok":"no"]++;s.last=Date.now();s.set=w.set||jpReadingQuizSet();s.level=jpReadingQuizTier(w);
  storageSet("jpReadingQuizStatsV1",JSON.stringify(jpReadingQuizStats));
}
function jpReadingQuizNormalize(v){return jpKanaFold(String(v||"").trim()).replace(/\s+/g,"")}
function jpCheckReadingQuiz(){
  const w=jpState.readingQuizList[jpState.readingQuizIndex],input=$("#jpReadingQuizInput"),fb=$("#jpReadingQuizFeedback");
  if(!w||!input||!fb)return;
  const typed=jpReadingQuizNormalize(input.value),answer=jpReadingQuizNormalize(w.reading);
  if(!typed){toast("읽는 법을 입력해 주세요");input.focus();return}
  const ok=typed===answer;
  jpState.readingQuizChecked=true;jpReadingQuizRecord(w,ok);
  fb.className="feedback jp-reading-quiz-feedback "+(ok?"ok":"no");
  fb.innerHTML="<div><b>"+(ok?"정답":"다시 확인")+"</b> · 정답 <strong lang='ja'>"+esc(jpHiraganaReading(w.reading))+"</strong></div><div class='jp-reading-quiz-answer-meta'>"+esc(w.meaning)+" · "+esc(jpReadingQuizTierLabel(jpReadingQuizTier(w)))+"</div>"+(jpWordHasRealExample(w)?"<p lang='ja'>"+esc(w.sentence)+"</p><small>"+esc(w.translation||"")+"</small>":"");
  input.setAttribute("aria-invalid",ok?"false":"true");
}
function renderJapaneseReadingQuizCard(){
  const w=jpState.readingQuizList[jpState.readingQuizIndex];
  if(!w){exitJapanesePractice();return}
  const pct=Math.round((jpState.readingQuizIndex+1)/jpState.readingQuizList.length*100);
  document.body.classList.add("drill-active");syncDrillViewport();
  let h="<div class='drill-session-shell jp-reading-quiz-session'><div class='drill-session-top'><div class='drill-status-row'><span class='drill-status-pill accent'>"+esc(jpReadingQuizTierLabel(jpReadingQuizTier(w)))+"</span><span class='drill-status-pill'>"+(jpState.readingQuizIndex+1)+"/"+jpState.readingQuizList.length+"</span><span class='drill-status-pill'>"+pct+"%</span></div><div class='drill-top-actions'><button type='button' class='btn drill-icon-btn drill-settings-btn' id='jpReadingQuizExit'>목록</button></div></div>";
  h+="<div class='jp-reading-quiz-stage'><section class='jp-reading-quiz-card'><div class='prompt'>"+(jpReadingQuizSet()==="hyogai"?"이 표외한자 단어의 읽는 법을 입력하세요.":"이 한자어의 읽는 법을 입력하세요.")+"</div><div class='jp-reading-quiz-word' lang='ja'>"+esc(jpWordDisplayForm(w))+"</div><div class='jp-reading-quiz-level'>"+esc(jpReadingQuizTierLabel(jpReadingQuizTier(w)))+(jpReadingQuizSet()==="hyogai"?" 표외 학습":" 학습 기준")+"</div><input id='jpReadingQuizInput' class='jp-reading-quiz-input' lang='ja' inputmode='text' autocomplete='off' autocapitalize='off' spellcheck='false' placeholder='ひらがな로 입력'><button type='button' class='btn primary jp-reading-quiz-check' id='jpReadingQuizCheck'>채점</button><div id='jpReadingQuizFeedback' class='feedback jp-reading-quiz-feedback'></div></section>";
  h+="<div class='jp-word-nav jp-reading-quiz-nav'><button type='button' class='btn' id='jpReadingQuizPrev' "+(jpState.readingQuizIndex===0?"disabled":"")+">← 이전</button><button type='button' class='btn' id='jpReadingQuizNext'>"+(jpState.readingQuizIndex===jpState.readingQuizList.length-1?"연습 완료 →":"다음 →")+"</button></div></div></div>";
  $("#jp").innerHTML=h;
  $("#jpReadingQuizExit").onclick=exitJapanesePractice;
  $("#jpReadingQuizPrev").onclick=function(){if(jpState.readingQuizIndex>0){jpState.readingQuizIndex--;jpState.readingQuizChecked=false;renderJapaneseReadingQuizCard()}};
  $("#jpReadingQuizNext").onclick=function(){
    if(jpState.readingQuizIndex===jpState.readingQuizList.length-1){toast("읽기 연습을 마쳤습니다");exitJapanesePractice();return}
    jpState.readingQuizIndex++;jpState.readingQuizChecked=false;renderJapaneseReadingQuizCard();
  };
  $("#jpReadingQuizCheck").onclick=jpCheckReadingQuiz;
  $("#jpReadingQuizInput").onkeydown=function(e){if(e.key==="Enter"){e.preventDefault();jpCheckReadingQuiz()}};
  setTimeout(function(){const x=$("#jpReadingQuizInput");if(x)x.focus()},0);
}

/* word-writing */
function startJapaneseWordPractice(){
  const all=jpCurrentWords().slice();
  if(!all.length){toast("이 범위의 단어가 없습니다");return}
  const info=jpWordRoundInfo(all);
  let rows=info.rows.slice();
  if(jpState.wordOrder==="random")rows=shuffle(rows);
  jpState.wordList=rows;jpState.wordIndex=0;jpState.wordChecked=false;
  renderJapaneseWordCard();
}
function jpWordRecord(word,ok){
  const k=jpWordKey(word),s=jpWordStats[k]||(jpWordStats[k]={word:word.word,reading:word.reading,ok:0,no:0,last:0});
  s[ok?"ok":"no"]++;s.last=Date.now();saveJpProgress();
}
function jpWordBoardSpec(count){
  const n=Math.max(1,+count||1);
  const vv=window.visualViewport;
  const vw=(vv&&vv.width)||window.innerWidth||800;
  const vh=(vv&&vv.height)||window.innerHeight||600;
  const landscape=vw>vh;
  const tabletPortrait=!landscape&&vw>=700;
  let cols=1,rows=1;
  // Two-character words stay horizontal on phones too. This keeps the word board compact
  // in portrait mode and restores the familiar left-to-right writing layout.
  // Tablet portrait can comfortably fit 3 square-ish cells in one row; this also removes
  // the unused fourth cell that previously appeared for 3-character words such as 醍醐味.
  if(n===2){cols=2;rows=1}
  else if(n===3){cols=(landscape||tabletPortrait)?3:2;rows=Math.ceil(n/cols)}
  else if(n===4){cols=landscape&&vw>=900?4:2;rows=Math.ceil(n/cols)}
  else if(n<=6){cols=(landscape||tabletPortrait)?3:2;rows=Math.ceil(n/cols)}
  else{cols=landscape?4:3;rows=Math.ceil(n/cols)}
  return {count:n,cols:cols,rows:rows,cell:480,width:cols*480,height:rows*480};
}
function jpInstallCanvasGeometryGuard(canvas,host){
  if(!canvas)return;
  const root=host||canvas.parentElement;
  if(!root)return;
  if(canvas._jpGeometryObserver){try{canvas._jpGeometryObserver.disconnect()}catch{}}
  const refresh=function(){
    const r=root.getBoundingClientRect();
    if(!(r.width>2&&r.height>2))return;
    canvas.dataset.layoutWidth=String(Math.round(r.width));
    canvas.dataset.layoutHeight=String(Math.round(r.height));
    // A resize must never leave stale pointer capture or a half-finished stroke.
    try{if(canvas.hasPointerCapture&&canvas._jpActivePointerId!=null&&canvas.hasPointerCapture(canvas._jpActivePointerId))canvas.releasePointerCapture(canvas._jpActivePointerId)}catch{}
  };
  refresh();
  if(typeof ResizeObserver!=="undefined"){
    const ro=new ResizeObserver(function(){requestAnimationFrame(refresh)});
    ro.observe(root);canvas._jpGeometryObserver=ro;
  }
}
function jpPaintWordCanvasBase(c){
  if(!c)return;
  const x=c.getContext("2d");
  x.save();x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.restore();
}
function jpClearWordCanvases(){
  const c=$("#jpWordCanvas");if(!c)return;
  if(typeof resetCanvasStrokeHistory==="function")resetCanvasStrokeHistory(c);
  else{c._strokeHistory=[];c._strokeCount=0}
  jpPaintWordCanvasBase(c);
  const fb=$("#jpWordFeedback");if(fb){fb.className="feedback jp-word-feedback";fb.innerHTML=""}
}
function jpSetupUnifiedWordCanvas(spec){
  const c=$("#jpWordCanvas"),board=c?.closest(".jp-word-board");if(!c||!board)return;
  c.width=spec.width;c.height=spec.height;c._jpWordSpec=spec;
  c._redrawBase=function(){jpPaintWordCanvasBase(c)};
  const ipad=document.documentElement.classList.contains("is-ipad");
  c._brushCssPx=ipad?7.2:6.0;
  jpClearWordCanvases();
  // canvas rect and backing coordinates stay 1:1 even after iPad rotation.
  board.style.touchAction="none";
  c.style.pointerEvents="auto";
  c.style.touchAction="none";
  bindCanvasDrawing(c,c.getContext("2d"),function(){},c);
  jpInstallCanvasGeometryGuard(c,board);
}
function jpWordRegionCanvas(source,index,spec){
  if(!source||!spec)return null;
  const col=index%spec.cols,row=Math.floor(index/spec.cols);
  if(row>=spec.rows)return null;
  const sx=col*spec.cell,sy=row*spec.cell;
  const out=document.createElement("canvas");
  out.width=spec.cell;out.height=spec.cell;
  const ctx=out.getContext("2d");
  ctx.fillStyle="#fff";ctx.fillRect(0,0,out.width,out.height);
  ctx.drawImage(source,sx,sy,spec.cell,spec.cell,0,0,out.width,out.height);
  out._strokeCount=0;
  return out;
}
function jpWordGuideHtml(chars,spec){
  const total=spec.cols*spec.rows;
  let h="";
  for(let i=0;i<total;i++){
    const col=i%spec.cols,row=Math.floor(i/spec.cols);
    const edge=(col===spec.cols-1?" last-col":"")+(row===spec.rows-1?" last-row":"");
    if(i<chars.length)h+="<div class='jp-word-guide active"+edge+"'><span>"+(i+1)+"</span></div>";
    else h+="<div class='jp-word-guide empty"+edge+"'></div>";
  }
  return h;
}
function jpWordAnswerGridHtml(chars,spec){
  const total=spec.cols*spec.rows;
  let h="";
  for(let i=0;i<total;i++){
    h+="<div class='jp-word-answer-cell' lang='ja'>"+(i<chars.length?esc(chars[i]):"")+"</div>";
  }
  return h;
}
function jpHiraganaReading(value){
  return [...String(value||"")].map(function(ch){
    const code=ch.codePointAt(0);
    return code>=0x30A1&&code<=0x30F6?String.fromCodePoint(code-0x60):ch;
  }).join("");
}
function jpWordStudyForm(w){return String((w&&w.word)||"").trim()}
function jpWordDisplayForm(w){return String((w&&w.preferredForm)||jpWordStudyForm(w)).trim()}
function jpWordExampleForms(w){
  return [...new Set([jpWordDisplayForm(w),jpWordStudyForm(w)].filter(Boolean))];
}
function jpWordDisplayText(w){
  const display=jpWordDisplayForm(w),study=jpWordStudyForm(w);
  return display&&study&&display!==study?display+"（旧字体 "+study+"）":display||study;
}
function jpWordVariantNoteHtml(w){
  const display=jpWordDisplayForm(w),study=jpWordStudyForm(w);
  if(!display||!study||display===study)return "";
  return "<small class='jp-word-variant-note'>旧字体 "+esc(study)+"</small>";
}
function jpWordFormNoteHtml(w){
  const display=jpWordDisplayForm(w),study=jpWordStudyForm(w);
  if(!display||!study||display===study)return "";
  return "<div class='jp-word-form-note'>일반 표기 <b lang='ja'>"+esc(display)+"</b> · 표외 학습 표기 <b lang='ja'>"+esc(study)+"</b>"+(w&&w.formType?" <span>"+esc(w.formType)+"</span>":"")+"</div>";
}
function jpWordHasRealExample(w){
  const s=String((w&&w.sentence)||"").trim();
  if(!s)return false;
  if(/文章の中で.*読み方と意味/u.test(s)||/[＿_]{2,}/u.test(s))return false;
  return jpWordExampleForms(w).some(function(form){return s.includes(form)});
}
function jpWordSentencePrompt(w){
  const s=jpWordHasRealExample(w)?String(w.sentence).trim():"";
  if(!s)return "예문 없음";
  const form=jpWordExampleForms(w).find(function(v){return s.includes(v)});
  return form?s.replace(form,"＿＿"):s;
}
function jpWordSentenceMarkup(w){
  const s=jpWordHasRealExample(w)?String(w.sentence).trim():"";
  if(!s)return "<span class='jp-word-no-example'>예문 없음</span>";
  const reading=jpHiraganaReading(w&&w.reading||"");
  const target="<span class='jp-word-target-reading' title='이 읽기를 한자로 쓰기'>"+esc(reading)+"</span>";
  const form=jpWordExampleForms(w).find(function(v){return s.includes(v)});
  if(form){
    const i=s.indexOf(form);
    return esc(s.slice(0,i))+target+esc(s.slice(i+form.length));
  }
  return esc(s);
}
function jpSetWordMeaningHidden(hidden){
  jpState.wordHideMeaning=!!hidden;
  try{localStorage.setItem("jpWordHideMeaningV1",jpState.wordHideMeaning?"1":"0")}catch{}
  const panel=$("#jpWordMeaningPanel"),b=$("#jpWordMeaningToggle");
  const question=document.querySelector(".jp-word-question");
  const shell=document.querySelector(".jp-word-session-shell");
  if(panel)panel.hidden=jpState.wordHideMeaning;
  if(question)question.classList.toggle("meaning-open",!jpState.wordHideMeaning);
  if(shell)shell.classList.toggle("meaning-open",!jpState.wordHideMeaning);
  if(b){
    b.textContent=jpState.wordHideMeaning?"뜻 보기":"뜻 가리기";
    b.classList.toggle("active",!jpState.wordHideMeaning);
    b.setAttribute("aria-expanded",String(!jpState.wordHideMeaning));
  }
}
function jpToggleWordMeaning(){jpSetWordMeaningHidden(!jpState.wordHideMeaning)}

function jpToggleWordAnswer(){
  const overlays=$$(".jp-word-answer");
  const show=overlays.some(function(x){return x.hidden});
  overlays.forEach(function(x){x.hidden=!show});
  const b=$("#jpWordReveal");if(b){b.textContent=show?"정답 숨기기":"정답 보기";b.classList.toggle("primary",show)}
}
function jpGradeWord(){
  const w=jpState.wordList[jpState.wordIndex];if(!w)return;
  const chars=[...w.word],fb=$("#jpWordFeedback"),btn=$("#jpWordCheck");
  if(btn&&btn.disabled)return;

  const setFeedback=function(kind,html){
    if(!fb)return;
    fb.className="feedback jp-word-feedback "+(kind||"");
    fb.innerHTML=html;
  };

  if(btn){btn.disabled=true;btn.textContent="채점 중…"}
  try{
    const canvas=$("#jpWordCanvas"),spec=canvas&&canvas._jpWordSpec;
    if(!canvas||!spec){
      setFeedback("no","그림판을 찾지 못했습니다. 화면을 다시 열어 주세요.");
      return;
    }
    const results=[];
    for(let i=0;i<chars.length;i++){
      const region=jpWordRegionCanvas(canvas,i,spec);
      if(!region){setFeedback("no","채점 영역을 나누지 못했습니다.");return}
      const r=handwritingSimilarity(region,chars[i]);
      if(r.blank){
        const msg=(i+1)+"번째 영역에 글자를 먼저 써 주세요.";
        setFeedback("no",esc(msg));toast(msg);return;
      }
      const meta=jpItemMap.get(chars[i]),expected=meta?meta.strokes:0;
      // 통합 그림판에서는 한 획이 칸 경계를 넘을 수 있어 획수 감점은 사용하지 않고 형태만 판정합니다.
      const decision=handwritingDecision(r,0,+expected||0);
      results.push({ch:chars[i],ok:decision.ok,score:decision.score,label:decision.label});
    }

    const allOk=results.length>0&&results.every(function(r){return r.ok});
    const avg=results.length?Math.round(results.reduce(function(a,b){return a+b.score},0)/results.length):0;
    jpState.wordChecked=true;jpWordRecord(w,allOk);
    setFeedback(allOk?"ok":"no",
      "<div class='jp-word-feedback-line'><span>"+(allOk?"단어 전체 통과":"다시 확인")+" · 평균 <b>"+avg+"%</b></span><span class='jp-word-feedback-scores'>"+
      results.map(function(r){return "<span class='jp-char-score "+(r.ok?"ok":"no")+"'><b lang='ja'>"+esc(r.ch)+"</b> "+r.score+"%</span>"}).join("")+
      "</span></div><div class='jp-word-feedback-answer'>정답 <b lang='ja'>"+esc(w.word)+"</b>（"+esc(jpHiraganaReading(w.reading))+"）</div>"
    );
  }catch(err){
    console.error("jpGradeWord",err);
    setFeedback("no","채점 중 오류가 생겼습니다. 지우고 다시 써 주세요.");
    toast("채점 오류가 발생했습니다");
  }finally{
    if(btn){btn.disabled=false;btn.textContent="채점"}
  }
}

function renderJapaneseWordCard(){
  const w=jpState.wordList[jpState.wordIndex];
  if(!w){exitJapanesePractice();return}
  const chars=[...w.word],spec=jpWordBoardSpec(chars.length),pct=Math.round((jpState.wordIndex+1)/jpState.wordList.length*100);
  const reading=jpHiraganaReading(w.reading),sentenceHtml=jpWordSentenceMarkup(w);
  syncDrillViewport();document.body.classList.add("drill-active");
  if(window._drillViewportFit)window.visualViewport&&window.visualViewport.removeEventListener("resize",window._drillViewportFit);
  window._drillViewportFit=function(){
    syncDrillViewport();
    const canvas=$("#jpWordCanvas");
    if(!canvas||!canvas._jpWordSpec||(canvas._strokeHistory&&canvas._strokeHistory.length))return;
    const next=jpWordBoardSpec(chars.length),cur=canvas._jpWordSpec;
    if(next.cols!==cur.cols||next.rows!==cur.rows){
      renderJapaneseWordCard();
    }
  };
  window.visualViewport&&window.visualViewport.addEventListener("resize",window._drillViewportFit,{passive:true});

  let h="<div class='drill-session-shell jp-word-session-shell "+(jpState.wordHideMeaning?"":"meaning-open")+"'><div class='drill-session-top'><div class='drill-status-row'><span class='drill-status-pill accent'>"+jpWordStageLabel(jpWordStudyStage(w))+"</span><span class='drill-status-pill'>"+(jpState.wordRound+1)+"회차</span><span class='drill-status-pill'>"+(jpState.wordIndex+1)+"/"+jpState.wordList.length+"</span><span class='drill-status-pill'>"+pct+"%</span><span class='drill-status-pill pen-current-label'>"+(typeof handwritingPenLabel==="function"?handwritingPenLabel():"젤펜")+"</span></div><div class='drill-top-actions'><button class='btn drill-icon-btn drill-settings-btn' id='jpWordExit'>목록</button></div></div>"+(typeof studyIndexMarkup==="function"?studyIndexMarkup("jpword",true):"");
  h+="<div class='jp-word-stage'><section class='jp-word-question "+(jpState.wordHideMeaning?"":"meaning-open")+"'><button class='jp-word-meaning-toggle "+(jpState.wordHideMeaning?"":"active")+"' id='jpWordMeaningToggle' aria-expanded='"+String(!jpState.wordHideMeaning)+"'>"+(jpState.wordHideMeaning?"뜻 보기":"뜻 가리기")+"</button><div class='jp-word-prompt-main'><div class='jp-word-example'>"+sentenceHtml+"</div>"+jpWordFormNoteHtml(w)+"</div><div class='jp-word-meaning-panel' id='jpWordMeaningPanel' "+(jpState.wordHideMeaning?"hidden":"")+"><div class='jp-word-meaning'>"+esc(w.meaning)+"</div><div class='jp-word-translation'>"+esc(w.translation)+"</div></div></section>";
  h+="<section class='jp-word-canvas-pane jp-word-cols-"+spec.cols+" jp-word-rows-"+spec.rows+"' style='--word-cols:"+spec.cols+";--word-rows:"+spec.rows+"'><div class='jp-word-board'><canvas id='jpWordCanvas' aria-label='"+esc(w.word)+" 손글씨 입력'></canvas><div class='jp-word-board-guides' aria-hidden='true'>"+jpWordGuideHtml(chars,spec)+"</div><div class='jp-word-answer' hidden>"+jpWordAnswerGridHtml(chars,spec)+"</div></div>"+(typeof handwritingPenToolbarMarkup==="function"?handwritingPenToolbarMarkup():"")+"<div id='jpWordFeedback' class='feedback jp-word-feedback'></div><div class='jp-word-nav'><button class='btn' id='jpWordPrev' "+(jpState.wordIndex===0?"disabled":"")+">← 이전 단어</button><button class='btn' id='jpWordNext'>"+(jpState.wordIndex===jpState.wordList.length-1?"회차 완료 →":"다음 단어 →")+"</button></div><div class='jp-word-controls'><button class='btn' id='jpWordClear'>지우기</button><button class='btn' id='jpWordReveal'>정답 보기</button><button class='btn primary' id='jpWordCheck'>채점</button></div></section></div></div>";
  $("#jp").innerHTML=h;
  jpSetupUnifiedWordCanvas(spec);
  if(typeof bindHandwritingPenToolbar==="function")bindHandwritingPenToolbar($("#jp"));
  $("#jpWordExit").onclick=exitJapanesePractice;
  $("#jpWordPrev").onclick=function(){if(jpState.wordIndex>0){jpState.wordIndex--;jpState.wordChecked=false;renderJapaneseWordCard()}};
  $("#jpWordNext").onclick=function(){
    if(jpState.wordIndex===jpState.wordList.length-1){
      toast((jpState.wordRound+1)+"회차를 마쳤습니다");exitJapanesePractice();return;
    }
    jpState.wordIndex++;jpState.wordChecked=false;renderJapaneseWordCard();
  };
  $("#jpWordMeaningToggle").onclick=jpToggleWordMeaning;
  $("#jpWordClear").onclick=jpClearWordCanvases;
  $("#jpWordReveal").onclick=jpToggleWordAnswer;
  $("#jpWordCheck").onclick=jpGradeWord;
}


/* atlas · 2.20.3 */
function jpFindItem(ch){return jpItemMap.get(ch)||null}
function jpRelatedWords(ch){
  return jpWords.filter(function(w){return jpWordExampleForms(w).some(function(form){return form.includes(ch)})}).slice(0,24);
}
function jpKoreanHanjaMeaning(item){
  try{
    const candidates=[item.char,item.old].concat(item.variants||[]).filter(Boolean);
    const hit=(Array.isArray(chars)?chars:[]).find(function(c){return candidates.includes(c.hanja)});
    if(!hit)return "";
    if(typeof officialMeaningSoundForms==="function"){
      const forms=officialMeaningSoundForms(hit);
      if(forms&&forms.canonical)return forms.canonical;
    }
    if(typeof charPrimary==="function"){
      const p=charPrimary(hit);
      if(p)return [p.meaning,p.sound].filter(Boolean).join(" ");
    }
    return "";
  }catch{return ""}
}
function closeJapaneseAtlasDetail(){
  const s=document.getElementById("jpAtlasSheet"),b=document.getElementById("jpAtlasBackdrop");
  if(s)s.remove();if(b)b.remove();
}
async function jpFetchKanjiApi(ch){
  if(jpAtlasApiCache[ch])return jpAtlasApiCache[ch];
  try{
    const r=await fetch("https://kanjiapi.dev/v1/kanji/"+encodeURIComponent(ch),{cache:"force-cache"});
    if(!r.ok)throw Error("HTTP "+r.status);
    const data=await r.json();
    jpAtlasApiCache[ch]=data;saveJpApiCache();return data;
  }catch{return null}
}
function jpAtlasLocalCells(item){
  const cells=[];
  cells.push(["분류",item.set==="joyo"?"常用漢字":item.hyogaiPractical?"表外漢字 · 실용":"희귀·비실용"]);
  if(item.set==="joyo"){
    cells.push(["JLPT 학습",jpItemJlpt(item)]);
    cells.push(["학교 배정",jpGradeLabel(item.grade)]);
  }
  if(item.strokes)cells.push(["총획",item.strokes+"획"]);
  if(item.radical)cells.push(["부수",item.radical]);
  if(item.old&&item.old!==item.char){
    cells.push(["旧字体",item.old]);
    cells.push(["新字体",item.char]);
  }
  if(item.variants&&item.variants.length)cells.push(["이체·간이자",item.variants.join(" · ")]);
  return cells.map(function(c){return "<div class='jp-atlas-cell'><span>"+esc(c[0])+"</span><b lang='ja'>"+esc(c[1])+"</b></div>"}).join("");
}async function openJapaneseAtlasDetail(ch){
  closeJapaneseAtlasDetail();
  const item=jpFindItem(ch);if(!item)return;
  const words=jpRelatedWords(ch),saved=!!jpUnknown[jpKey(item)];
  const backdrop=document.createElement("div");backdrop.id="jpAtlasBackdrop";backdrop.className="jp-atlas-backdrop";backdrop.onclick=closeJapaneseAtlasDetail;
  const sheet=document.createElement("div");sheet.id="jpAtlasSheet";sheet.className="jp-atlas-sheet";
  sheet.innerHTML="<div class='jp-atlas-head'><button class='jp-atlas-close' id='jpAtlasClose' aria-label='닫기'>×</button><div class='jp-atlas-big' lang='ja'>"+esc(ch)+"</div><div class='jp-atlas-title'><b>"+(item.set==="joyo"?"常用漢字":item.hyogaiPractical?"表外漢字":"희귀·비실용")+" 도감</b><small>"+esc(jpCardMeta(item))+"</small><label class='jp-atlas-font-inline'><span>글씨체</span><select id='jpAtlasDetailFont'>"+jpAtlasFontOptionsHtml()+"</select></label></div></div>"+
    "<div class='jp-atlas-data'>"+jpAtlasLocalCells(item)+(item.set==="hyogai"&&item.hyogaiPractical&&words.length?"<div class='jp-atlas-cell'><span>실용 근거</span><b>"+esc(jpWordDisplayText(words[0]))+" · "+esc(words[0].reading)+"</b></div>":"")+"<div class='jp-atlas-cell jp-reading-cell'><span>음독</span><div id='jpAtlasOn' class='jp-atlas-loading'>"+(item.set==="joyo"?"공식 음독 확인 중…":"표외 음독 확인 중…")+"</div></div><div class='jp-atlas-cell jp-reading-cell'><span>훈독</span><div id='jpAtlasKun' class='jp-atlas-loading'>"+(item.set==="joyo"?"공식 훈독 확인 중…":"표외 훈독 확인 중…")+"</div></div><div class='jp-atlas-cell'><span>한국어 뜻·훈음</span><b id='jpAtlasMeaning'>"+esc(jpKoreanHanjaMeaning(item)||"한국 훈음 데이터 확인 중")+"</b></div></div>"+
    "<div class='app-section-title' style='margin-top:13px'>연관 단어</div><div class='jp-atlas-words'>"+(words.length?words.map(function(w){return "<div class='jp-atlas-word'><b lang='ja'>"+esc(jpWordDisplayForm(w))+"</b>"+jpWordVariantNoteHtml(w)+"<div>"+esc(w.reading)+" · "+esc(w.meaning)+"<small>"+esc(jpWordHasRealExample(w)?w.sentence:"예문 없음")+"</small></div></div>"}).join(""):"<div class='jp-empty'>현재 예문 데이터에 연결된 단어가 없습니다.</div>")+"</div>"+
    "<div class='jp-atlas-actions'><button class='btn "+(saved?"primary":"")+"' id='jpAtlasSave'>"+(saved?"★ 저장됨":"☆ 모름 저장")+"</button><button class='btn primary' id='jpAtlasPractice'>이 글자 연습</button></div>";
  document.body.appendChild(backdrop);document.body.appendChild(sheet);
  $("#jpAtlasClose").onclick=closeJapaneseAtlasDetail;
  if($("#jpAtlasDetailFont"))$("#jpAtlasDetailFont").onchange=function(e){setJapaneseAtlasFont(e.target.value)};
  $("#jpAtlasSave").onclick=function(){toggleJpUnknown(item)};
  $("#jpAtlasPractice").onclick=function(){closeJapaneseAtlasDetail();jpState.view="practice";startJapanesePractice(ch)};
  const data=await jpFetchKanjiApi(ch);
  if(!document.getElementById("jpAtlasSheet"))return;
  const on=$("#jpAtlasOn"),kun=$("#jpAtlasKun"),meaning=$("#jpAtlasMeaning");
  const ko=jpKoreanHanjaMeaning(item);
  if(meaning)meaning.textContent=ko||"한국어 훈음 데이터 없음";
  if(on){on.className="";on.innerHTML=jpReadingPillsHtml(item,data,"on")}
  if(kun){kun.className="";kun.innerHTML=jpReadingPillsHtml(item,data,"kun")}
  if(!data&&item.set==="hyogai"){
    [on,kun].forEach(function(x){if(x&&!x.textContent.trim())x.textContent="온라인 읽기 정보 없음"});
  }
}


// Warm local Japanese assets after the module is ready so the 日本 tab opens immediately.
applyJapaneseAtlasFont();
setTimeout(function(){loadJapaneseData().catch(function(){});if(typeof mode!=="undefined"&&mode==="jp")renderJapanese()},0);
