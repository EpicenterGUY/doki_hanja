
let jpJoyo=[];
let jpHyogai=[];
let jpWords=[];
let jpDataLoading=false;
let jpDataError="";
let jpHideTimer=null;
let jpItemMap=new Map();

let jpState={
  view:"home",
  set:"joyo",
  grade:"all",
  query:"",
  savedOnly:false,
  limit:120,
  atlasLimit:160,
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
  wordChecked:false
};
let jpStats=JSON.parse(localStorage.getItem("jpHanjaStatsV1")||"{}");
let jpUnknown=JSON.parse(localStorage.getItem("jpHanjaUnknownV1")||"{}");
let jpWordStats=JSON.parse(localStorage.getItem("jpWordStatsV1")||"{}");
let jpAtlasApiCache=JSON.parse(localStorage.getItem("jpKanjiApiCacheV1")||"{}");

function jpSetLabel(s){return s==="joyo"?"常用漢字":"表外漢字"}
function jpGradeLabel(g){return g==="S"?"中高":("小"+g)}
function jpKey(item){return (item.set||jpState.set)+"|"+item.char}
function jpWordKey(item){return "word|"+item.word}
function saveJpProgress(){
  localStorage.setItem("jpHanjaStatsV1",JSON.stringify(jpStats));
  localStorage.setItem("jpHanjaUnknownV1",JSON.stringify(jpUnknown));
  localStorage.setItem("jpWordStatsV1",JSON.stringify(jpWordStats));
}
function saveJpApiCache(){
  try{localStorage.setItem("jpKanjiApiCacheV1",JSON.stringify(jpAtlasApiCache))}catch{}
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
async function loadJapaneseData(){
  if(jpJoyo.length&&jpHyogai.length&&jpWords.length)return true;
  if(jpDataLoading)return false;
  jpDataLoading=true;jpDataError="";
  try{
    const pair=await Promise.all([
      fetch("./data/japanese/joyo.tsv",{cache:"no-store"}),
      fetch("./data/japanese/hyogai.txt",{cache:"no-store"}),
      fetch("./data/japanese/words.json",{cache:"no-store"})
    ]);
    if(!pair[0].ok||!pair[1].ok||!pair[2].ok)throw Error("HTTP "+pair.map(function(r){return r.status}).join("/"));
    jpJoyo=parseJoyoData(await pair[0].text());
    const joyoSet=new Set(jpJoyo.map(function(x){return x.char}));
    jpHyogai=parseHyogaiData(await pair[1].text(),joyoSet);
    const wordData=await pair[2].json();
    jpWords=Array.isArray(wordData)?wordData:(wordData.items||[]);
    jpBuildItemMap();
    if(jpJoyo.length!==2136||jpHyogai.length<800||jpWords.length<100)throw Error("일본 한자 데이터 수가 비정상입니다.");
    return true;
  }catch(e){
    jpDataError=String((e&&e.message)||e);
    return false;
  }finally{
    jpDataLoading=false;
  }
}
function jpCurrentPool(){
  let rows=jpState.set==="joyo"?jpJoyo:jpHyogai;
  if(jpState.set==="joyo"&&jpState.grade!=="all")rows=rows.filter(function(x){return x.grade===jpState.grade});
  if(jpState.savedOnly)rows=rows.filter(function(x){return !!jpUnknown[jpKey(x)]});
  const q=String(jpState.query||"").trim();
  if(q)rows=rows.filter(function(x){
    if(x.char.includes(q)||(x.old||"").includes(q)||(x.radical||"").includes(q))return true;
    return (x.variants||[]).some(function(v){return v.includes(q)});
  });
  return rows;
}
function jpCurrentWords(){
  let rows=jpWords.filter(function(w){return w.set===jpState.set});
  if(jpState.set==="joyo"&&jpState.wordTier!=="all")rows=rows.filter(function(w){return w.tier===jpState.wordTier});
  return rows;
}
function jpWordRoundInfo(rows){
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
  const set=jpState.set;
  const keys=Object.keys(jpStats).filter(function(k){return k.startsWith(set+"|")});
  let attempted=0,ok=0,no=0;
  keys.forEach(function(k){
    const s=jpStats[k]||{},n=(+s.ok||0)+(+s.no||0);
    if(n){attempted++;ok+=+s.ok||0;no+=+s.no||0}
  });
  const saved=Object.keys(jpUnknown).filter(function(k){return k.startsWith(set+"|")}).length;
  return {attempted:attempted,ok:ok,no:no,saved:saved,accuracy:(ok+no)?Math.round(ok/(ok+no)*100):0};
}
function jpWordProfile(){
  const rows=Object.values(jpWordStats||{});
  let ok=0,no=0,attempted=0;
  rows.forEach(function(s){const n=(+s.ok||0)+(+s.no||0);if(n){attempted++;ok+=+s.ok||0;no+=+s.no||0}});
  return {attempted:attempted,accuracy:(ok+no)?Math.round(ok/(ok+no)*100):0};
}
function jpCardMeta(x){
  if(x.set==="joyo"){
    const old=x.old?(" · 旧 "+x.old):"";
    return jpGradeLabel(x.grade)+" · "+x.strokes+"획 · "+(x.radical||"—")+old;
  }
  return x.variants&&x.variants.length?("표외 · 이체 "+x.variants.join("·")):"표외 핵심";
}
function jpMetaPillsHtml(x){
  const a=[];
  if(x.set==="joyo"){
    a.push(jpGradeLabel(x.grade));
    if(x.strokes)a.push(x.strokes+"획");
    if(x.radical)a.push("부수 "+x.radical);
    if(x.old)a.push("旧字体 "+x.old);
  }else{
    a.push("表外");
    if(x.variants&&x.variants.length)a.push("이체 "+x.variants.join("·"));
  }
  return "<div class='jp-meta-pills'>"+a.map(function(v){return "<span class='jp-meta-pill'>"+esc(v)+"</span>"}).join("")+"</div>";
}
function setJapaneseSet(s){
  jpState.set=s==="hyogai"?"hyogai":"joyo";
  jpState.grade="all";jpState.query="";jpState.savedOnly=false;jpState.limit=120;jpState.atlasLimit=160;
  jpState.wordTier="all";jpState.wordRound=0;
  renderJapanese();
}
function setJapaneseView(v){
  jpState.view=["home","practice","atlas","word"].includes(v)?v:"home";
  jpState.query="";jpState.savedOnly=false;jpState.limit=120;jpState.atlasLimit=160;
  renderJapanese();
}
function jpOpenSavedAtlas(){
  jpState.view="atlas";jpState.savedOnly=true;jpState.query="";jpState.atlasLimit=160;renderJapanese();
}
function jpOpenGradePractice(g){
  jpState.set="joyo";jpState.grade=g||"all";jpState.view="practice";jpState.savedOnly=false;jpState.query="";jpState.limit=120;renderJapanese();
}
function jpStartQuickChars(set){
  jpState.set=set==="hyogai"?"hyogai":"joyo";jpState.grade="all";jpState.view="practice";jpState.savedOnly=false;jpState.query="";
  jpState.order="random";jpState.count=20;
  startJapanesePractice();
}
function jpHomeWordProgress(set){
  const rows=jpWords.filter(function(w){return w.set===set});
  const size=Math.max(1,+jpState.wordCount||20),total=Math.max(1,Math.ceil(rows.length/size));
  let done=0,tried=0,next=0,foundNext=false;
  for(let i=0;i<total;i++){
    const part=rows.slice(i*size,Math.min(rows.length,(i+1)*size)),st=jpWordRoundStatus(part);
    if(st.done)done++;
    else if(!foundNext){next=i;foundNext=true}
    tried+=st.tried;
  }
  if(!foundNext)next=Math.max(0,total-1);
  return {rows:rows,total:total,done:done,tried:tried,size:size,next:next};
}
function setJapaneseGrade(g){jpState.grade=g;jpState.limit=120;jpState.atlasLimit=160;renderJapanese()}
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
  const a=[["all","전체"],["1","小1"],["2","小2"],["3","小3"],["4","小4"],["5","小5"],["6","小6"],["S","中高"]];
  return a.map(function(v){
    return "<button class='jp-filter-chip "+(jpState.grade===v[0]?"active":"")+"' data-grade='"+v[0]+"'>"+v[1]+"</button>";
  }).join("");
}
function jpCardsHtml(rows,atlas){
  return rows.map(function(x){
    const saved=!!jpUnknown[jpKey(x)];
    if(atlas){
      return "<button class='jp-atlas-card "+(saved?"saved":"")+"' data-jp-atlas='"+esc(x.char)+"'><div class='char' lang='ja'>"+esc(x.char)+"</div><span class='meta'>"+(saved?"★ ":"")+esc(jpCardMeta(x))+"</span></button>";
    }
    return "<button class='jp-card "+(saved?"saved":"")+"' data-jp-char='"+esc(x.char)+"'>"+
      "<div class='jp-card-char' lang='ja'>"+esc(x.char)+"</div>"+
      "<div class='jp-card-meta'>"+(saved?"★ ":"")+esc(jpCardMeta(x))+"</div></button>";
  }).join("");
}
function jpHeroHtml(){
  const home=jpState.view==="home";
  return "<section class='jp-hero "+(home?"jp-home-hero":"jp-sub-hero")+"'>"+
    "<div class='jp-kicker'>DOKI 漢字 · JAPANESE LAB</div><div class='jp-hero-line'><div><h2>"+(home?"日本漢字":(jpState.view==="practice"?"글자 쓰기":jpState.view==="word"?"단어 쓰기":"일본 한자 도감"))+"</h2>"+
    "<p>"+(home?"상용·표외 한자를 찾고, 보고, 직접 쓰는 일본 한자 전용 학습 공간입니다.":(jpState.set==="joyo"?"常用漢字 2,136자":"表外漢字 핵심 "+jpHyogai.length.toLocaleString()+"자")+" · "+(jpState.view==="practice"?"손글씨 형태 연습":jpState.view==="word"?"예문 기반 단어쓰기":"읽기·훈음·연관 단어 탐색"))+"</p></div>"+
    (home?"":"<button class='jp-home-back' data-jp-view='home'>⌂ 홈</button>")+"</div>"+
    "<div class='jp-set-seg'><button class='"+(jpState.set==="joyo"?"active":"")+"' data-jp-set='joyo'>常用漢字<small>2,136자</small></button>"+
    "<button class='"+(jpState.set==="hyogai"?"active":"")+"' data-jp-set='hyogai'>表外漢字<small>"+jpHyogai.length.toLocaleString()+"자</small></button></div>"+
    (home?"":"<div class='jp-view-seg jp-sub-nav'><button data-jp-view='practice' class='"+(jpState.view==="practice"?"active":"")+"'>書 글자</button><button data-jp-view='word' class='"+(jpState.view==="word"?"active":"")+"'>文 단어</button><button data-jp-view='atlas' class='"+(jpState.view==="atlas"?"active":"")+"'>冊 도감</button></div>")+
  "</section>";
}
function jpHomeHtml(){
  const p=jpProfile(),wp=jpWordProfile(),word=jpHomeWordProgress(jpState.set);
  const total=jpState.set==="joyo"?jpJoyo.length:jpHyogai.length;
  const setLabel=jpState.set==="joyo"?"常用漢字":"表外漢字";
  const wordCount=jpWords.filter(function(w){return w.set===jpState.set}).length;
  const saved=Object.keys(jpUnknown).filter(function(k){return k.startsWith(jpState.set+"|")}).length;
  let h="<section class='jp-home-main'>";
  h+="<div class='jp-home-status'><div><span>현재 컬렉션</span><b>"+setLabel+"</b><small>"+total.toLocaleString()+"자 · 단어 "+wordCount.toLocaleString()+"개</small></div><div class='jp-home-ring' style='--jp-ring:"+p.accuracy+"%'><b>"+p.accuracy+"%</b><span>글자 정확도</span></div></div>";
  h+="<div class='jp-home-actions'>";
  h+="<button class='jp-home-action write' data-jp-view='practice'><span class='jp-action-glyph'>書</span><span><b>글자 쓰기</b><small>2초 암기 또는 보고 따라쓰기</small></span><i>›</i></button>";
  h+="<button class='jp-home-action word' data-jp-view='word'><span class='jp-action-glyph'>文</span><span><b>단어 쓰기</b><small>읽기·뜻·예문을 보고 직접 쓰기</small></span><i>›</i></button>";
  h+="<button class='jp-home-action atlas' data-jp-view='atlas'><span class='jp-action-glyph'>冊</span><span><b>한자 도감</b><small>음독·훈독·한국어 훈음·연관어</small></span><i>›</i></button>";
  h+="<button class='jp-home-action saved' id='jpHomeSaved'><span class='jp-action-glyph'>★</span><span><b>저장한 한자</b><small>모르는 한자 "+saved+"자 다시 보기</small></span><i>›</i></button>";
  h+="</div></section>";

  h+="<section class='jp-home-progress-card'><div class='jp-home-progress-head'><div><span>학습 현황</span><b>"+setLabel+"</b></div><button id='jpQuick20'>랜덤 20자</button></div>";
  h+="<div class='jp-home-progress-grid'><div><b>"+p.attempted.toLocaleString()+"</b><span>연습한 글자</span></div><div><b>"+p.accuracy+"%</b><span>글자 정답률</span></div><div><b>"+word.tried.toLocaleString()+"</b><span>연습한 단어</span></div><div><b>"+word.done+"/"+word.total+"</b><span>완료 회차</span></div></div>";
  h+="<div class='jp-home-progress-bar'><i style='width:"+Math.min(100,total?Math.round(p.attempted/total*100):0)+"%'></i></div><small>글자 접촉률 "+(total?Math.round(p.attempted/total*100):0)+"% · 저장 "+saved+"자</small></section>";

  if(jpState.set==="joyo"){
    h+="<section class='app-section jp-grade-launch'><div class='app-section-head'><div><div class='app-section-title'>학년별 바로가기</div><div class='app-section-sub'>원하는 배정 범위를 눌러 바로 글자 쓰기로 들어갑니다.</div></div></div><div class='jp-home-grade-grid'>";
    [["1","小1"],["2","小2"],["3","小3"],["4","小4"],["5","小5"],["6","小6"],["S","中高"]].forEach(function(g){
      const n=jpJoyo.filter(function(x){return x.grade===g[0]}).length;
      h+="<button data-jp-home-grade='"+g[0]+"'><b>"+g[1]+"</b><span>"+n+"자</span></button>";
    });
    h+="</div></section>";
  }else{
    const samples=jpWords.filter(function(w){return w.set==="hyogai"}).slice(0,6);
    h+="<section class='app-section jp-hyogai-spot'><div class='app-section-head'><div><div class='app-section-title'>표외 단어 맛보기</div><div class='app-section-sub'>어려운 표기와 실제 단어를 예문으로 익힙니다.</div></div><button class='btn' data-jp-view='word'>전체 보기</button></div><div class='jp-hyogai-samples'>";
    h+=samples.map(function(w){return "<div><b lang='ja'>"+esc(w.word)+"</b><span>"+esc(w.reading)+"</span><small>"+esc(w.meaning)+"</small></div>"}).join("");
    h+="</div></section>";
  }

  h+="<section class='jp-home-next'><div><span>NEXT</span><b>"+(word.done<word.total?(word.next+1)+"회차 단어쓰기":"단어 회차 완료")+"</b><small>"+(word.done<word.total?"회차당 "+word.size+"단어 · 현재 컬렉션 "+wordCount+"단어":"원하는 회차를 골라 복습할 수 있습니다.")+"</small></div><button id='jpHomeWordNext'>"+(word.done<word.total?"이어가기":"복습하기")+" →</button></section>";
  h+="<button class='jp-home-search' id='jpHomeSearch'>⌕ 일본 한자·단어 전체 찾기</button>";
  return h;
}
function jpMetricsHtml(){
  const p=jpProfile(),wp=jpWordProfile(),setTotal=jpState.set==="joyo"?jpJoyo.length:jpHyogai.length;
  return "<div class='jp-metrics'><div class='jp-metric'><b>"+setTotal.toLocaleString()+"</b><span>"+(jpState.set==="joyo"?"현재 상용 목록":"현재 표외 핵심")+"</span></div>"+
    "<div class='jp-metric'><b>"+p.attempted.toLocaleString()+"</b><span>글자 연습 · "+p.accuracy+"%</span></div>"+
    "<div class='jp-metric'><b>"+(jpState.view==="word"?wp.attempted:p.saved).toLocaleString()+"</b><span>"+(jpState.view==="word"?("단어 연습 · "+wp.accuracy+"%"):"모름 저장")+"</span></div></div>";
}
function jpCommonFilterHtml(all,atlas){
  const sourceSub=jpState.set==="joyo"?
    "학년별 배정과 중·고교 상용한자를 나눠 볼 수 있습니다.":
    "표외한자자체표의 기본자를 현행 상용한자와 중복되지 않게 정리했습니다.";
  return "<section class='app-section'><div class='app-section-head'><div><div class='app-section-title'>"+(atlas?"도감 범위":"연습 범위")+"</div><div class='app-section-sub'>"+sourceSub+"</div></div><span class='badge'>"+all.length.toLocaleString()+"자</span></div>"+
    (jpState.set==="joyo"?"<div class='jp-filter-row' id='jpGradeRow'>"+jpGradeChipsHtml()+"</div>":"")+
    "<div class='jp-search-row'><input id='jpSearch' type='text' value='"+esc(jpState.query)+"' placeholder='"+(jpState.set==="joyo"?"한자 · 구자체 · 부수 검색":"한자 · 이체자 검색")+"'><button class='btn jp-saved-toggle "+(jpState.savedOnly?"primary":"")+"' id='jpSavedOnly'>★ 저장만</button></div></section>";
}
function jpPracticeHomeHtml(all){
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
  const shown=all.slice(0,jpState.atlasLimit);
  let h=jpCommonFilterHtml(all,true);
  h+="<section class='app-section'><div class='app-section-head'><div><div class='app-section-title'>일본 한자 도감</div><div class='app-section-sub'>카드를 누르면 읽기·획수·부수·구자체/이체자·연관 단어를 한 화면에서 봅니다.</div></div></div>";
  if(shown.length){
    h+="<div class='jp-atlas-grid'>"+jpCardsHtml(shown,true)+"</div>";
    if(all.length>shown.length)h+="<button class='btn jp-more' id='jpAtlasMore'>더 보기 · "+shown.length.toLocaleString()+"/"+all.length.toLocaleString()+"</button>";
  }else h+="<div class='jp-empty'>조건에 맞는 한자가 없습니다.</div>";
  h+="<div class='jp-mode-note'>읽기·뜻 상세정보는 도감 카드를 열 때 온라인 사전 데이터를 불러와 기기에 캐시합니다. 연결이 없어도 급수·부수·획수·구자체/이체자와 저장한 정보는 볼 수 있습니다.</div></section>";
  return h;
}
function jpWordHomeHtml(){
  const rows=jpCurrentWords(),info=jpWordRoundInfo(rows),roundRows=info.rows,wp=jpWordProfile();
  const sample=roundRows.slice(0,8);
  const tiers=jpState.set==="joyo"?[["all","전체"],["basic","기초"],["intermediate","중급"],["advanced","고급"]]:[["all","표외 단어"]];
  let h="<section class='app-section'><div class='app-section-head'><div><div class='app-section-title'>단어식 한자쓰기</div><div class='app-section-sub'>전체 단어를 회차로 나눠 조금씩 끝내고, 원하는 회차만 다시 연습할 수 있습니다.</div></div><span class='badge good'>"+rows.length.toLocaleString()+"단어</span></div>";
  h+="<div class='jp-word-tier' id='jpWordTier'>"+tiers.map(function(t){return "<button class='jp-filter-chip "+(jpState.wordTier===t[0]?"active":"")+"' data-tier='"+t[0]+"'>"+t[1]+"</button>"}).join("")+"</div>";
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
    h+="<div class='jp-word-preview-list'>"+sample.map(function(w){return "<div class='jp-word-preview'><b lang='ja'>"+esc(w.word)+"</b><small>"+esc(w.reading)+" · "+esc(w.meaning)+"</small><p>"+esc(w.sentence)+"</p></div>"}).join("")+"</div>";
  }else h+="<div class='jp-empty'>이 회차의 단어 데이터가 없습니다.</div>";
  h+="</section>";
  return h;
}
async function renderJapanese(){
  clearTimeout(jpHideTimer);jpHideTimer=null;
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
  let body=jpState.view==="home"?jpHomeHtml():(jpState.view==="atlas"?jpAtlasHomeHtml(all):(jpState.view==="word"?jpWordHomeHtml():jpPracticeHomeHtml(all)));
  el.innerHTML="<div class='jp-screen'>"+jpHeroHtml()+(jpState.view==="home"?"":jpMetricsHtml())+body+
    "<section class='app-section'><details class='compact-settings'><summary>데이터 기준</summary><div class='jp-source-note'>常用漢字는 현행 2,136자 목록, 表外漢字는 표외한자자체표의 기본자를 바탕으로 현행 상용한자와 겹치는 글자를 제외해 구성합니다. 표외한자자체표는 인쇄문자 기준이므로 손글씨 자동채점은 형태 연습용 참고 판정입니다. 단어 쓰기는 DOKI의 예문 학습 데이터로 별도 구성됩니다.</div></details></section></div>";
  bindJapaneseHome();
}
function bindJapaneseHome(){
  $$("[data-jp-set]").forEach(function(b){b.onclick=function(){setJapaneseSet(b.dataset.jpSet)}});
  $("[data-jp-view]").forEach(function(b){b.onclick=function(){setJapaneseView(b.dataset.jpView)}});
  $("#jpGradeRow [data-grade]").forEach(function(b){b.onclick=function(){setJapaneseGrade(b.dataset.grade)}});
  $("[data-jp-home-grade]").forEach(function(b){b.onclick=function(){jpOpenGradePractice(b.dataset.jpHomeGrade)}});
  if($("#jpHomeSaved"))$("#jpHomeSaved").onclick=jpOpenSavedAtlas;
  if($("#jpQuick20"))$("#jpQuick20").onclick=function(){jpStartQuickChars(jpState.set)};
  if($("#jpHomeSearch"))$("#jpHomeSearch").onclick=function(){if(typeof openGlobalSearch==="function")openGlobalSearch("")};
  if($("#jpHomeWordNext"))$("#jpHomeWordNext").onclick=function(){
    const info=jpHomeWordProgress(jpState.set);
    jpState.view="word";jpState.wordTier="all";jpState.wordRound=info.next;renderJapanese();
  };
  if($("#jpSavedOnly"))$("#jpSavedOnly").onclick=toggleJapaneseSavedOnly;
  if($("#jpSearch")){
    $("#jpSearch").onkeydown=function(e){if(e.key==="Enter")applyJapaneseSearch()};
    $("#jpSearch").onchange=applyJapaneseSearch;
  }
  if($("#jpModeSeg"))$$("#jpModeSeg [data-mode]").forEach(function(b){b.onclick=function(){setJapaneseMode(b.dataset.mode)}});
  if($("#jpOrderSeg"))$$("#jpOrderSeg [data-order]").forEach(function(b){b.onclick=function(){setJapaneseOrder(b.dataset.order)}});
  if($("#jpCount"))$("#jpCount").onchange=function(e){jpState.count=+e.target.value};
  if($("#jpStart"))$("#jpStart").onclick=function(){startJapanesePractice()};
  if($("#jpMore"))$("#jpMore").onclick=function(){jpState.limit+=120;renderJapanese()};
  $$(".jp-card[data-jp-char]").forEach(function(b){b.onclick=function(){startJapanesePractice(b.dataset.jpChar)}});
  if($("#jpAtlasMore"))$("#jpAtlasMore").onclick=function(){jpState.atlasLimit+=160;renderJapanese()};
  $$(".jp-atlas-card[data-jp-atlas]").forEach(function(b){b.onclick=function(){openJapaneseAtlasDetail(b.dataset.jpAtlas)}});
  $$("#jpWordTier [data-tier]").forEach(function(b){b.onclick=function(){jpState.wordTier=b.dataset.tier;jpState.wordRound=0;renderJapanese()}});
  if($("#jpWordCount"))$("#jpWordCount").onchange=function(e){jpState.wordCount=+e.target.value;jpState.wordRound=0;renderJapanese()};
  if($("#jpWordOrder"))$("#jpWordOrder").onchange=function(e){jpState.wordOrder=e.target.value};
  $$("#jpWordRounds [data-round]").forEach(function(b){b.onclick=function(){jpSetWordRound(+b.dataset.round)}});
  if($("#jpWordStart"))$("#jpWordStart").onclick=startJapaneseWordPractice;
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
  h+="<div class='drill-session-shell'><div class='drill-session-top'><div class='drill-status-row'><span class='drill-status-pill accent'>"+(item.set==="joyo"?"常用":"表外")+"</span><span class='drill-status-pill'>"+(st.index+1)+"/"+st.list.length+"</span><span class='drill-status-pill'>"+pct+"%</span></div><div class='drill-top-actions'><button class='btn drill-icon-btn drill-settings-btn' id='jpExit'>목록</button></div></div>";
  h+="<div class='drill-stage write-stage'><section class='drill-question-pane jp-practice-question'><div class='prompt'>"+(st.mode==="memory"?"모양을 외운 뒤 직접 써보세요.":"보면서 천천히 따라 써보세요.")+"</div>";
  h+="<div class='jp-memory-target' id='jpMemoryTarget' lang='ja'>"+esc(item.char)+"</div><div class='jp-memory-sub' id='jpMemoryHint'>"+(st.mode==="memory"?"2초 동안 글자 모양을 기억하세요":"정답을 보면서 형태를 익히세요")+"</div>"+jpMetaPillsHtml(item);
  if(st.mode==="memory")h+="<button class='btn jp-memory-again' id='jpShowAgain' style='visibility:hidden'>2초 다시 보기</button>";
  h+="<div id='jpFeedback' class='feedback'></div></section>";
  h+="<section class='drill-canvas-pane'><div class='drill-canvas-wrap'><canvas id='jpCanvas' width='600' height='600'></canvas><div id='jpAnswerPeek' class='drill-answer-overlay jp-answer-overlay' lang='ja' hidden>"+esc(item.char)+"</div></div>";
  h+="<div class='drill-bottom-nav'><button class='btn' id='jpPrev' "+(st.index===0?"disabled":"")+">← 이전 한자</button><button class='btn' id='jpNext'>"+(st.index===st.list.length-1?"처음으로":"다음 한자 →")+"</button></div>";
  h+="<div class='drill-write-controls'><button class='btn' id='jpClear'>지우기</button><button class='btn' id='jpReveal'>정답 보기</button><button class='btn "+(saved?"saved":"")+"' id='jpUnknownBtn'>"+(saved?"★ 저장됨":"☆ 모름 저장")+"</button><button class='btn primary' id='jpCheck'>채점</button></div></section></div></div>";
  $("#jp").innerHTML=h;

  setupAnyCanvas("#jpCanvas");
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
function jpClearWordCanvases(){
  const w=jpState.wordList[jpState.wordIndex];if(!w)return;
  [...w.word].forEach(function(_,i){clearAnyCanvas("#jpWordCanvas"+i)});
  const fb=$("#jpWordFeedback");if(fb){fb.className="feedback jp-word-feedback";fb.innerHTML=""}
}
function jpToggleWordAnswer(){
  const overlays=$$(".jp-word-answer");
  const show=overlays.some(function(x){return x.hidden});
  overlays.forEach(function(x){x.hidden=!show});
  const b=$("#jpWordReveal");if(b){b.textContent=show?"정답 숨기기":"정답 보기";b.classList.toggle("primary",show)}
}
function jpGradeWord(){
  const w=jpState.wordList[jpState.wordIndex];if(!w)return;
  const chars=[...w.word];
  for(let i=0;i<chars.length;i++){
    const c=$("#jpWordCanvas"+i);
    if(!c||!(c._strokeCount>0)){toast((i+1)+"번째 칸을 먼저 써 주세요");return}
  }
  const results=[];
  chars.forEach(function(ch,i){
    const meta=jpItemMap.get(ch),strokes=meta?meta.strokes:0;
    autoGradeHandwriting("#jpWordCanvas"+i,ch,strokes||0,function(ok,score,label){results.push({ch:ch,ok:ok,score:score,label:label})});
  });
  if(results.length!==chars.length)return;
  const allOk=results.every(function(r){return r.ok}),avg=Math.round(results.reduce(function(a,b){return a+b.score},0)/results.length);
  jpState.wordChecked=true;jpWordRecord(w,allOk);
  const fb=$("#jpWordFeedback");
  if(fb){
    fb.className="feedback jp-word-feedback "+(allOk?"ok":"no");
    fb.innerHTML=(allOk?"단어 전체 통과":"다시 확인해보세요")+" · 평균 형태 일치도 <b>"+avg+"%</b><br>"+
      results.map(function(r){return "<span class='jp-char-score "+(r.ok?"ok":"no")+"'><b lang='ja'>"+esc(r.ch)+"</b> "+r.score+"%</span>"}).join("")+
      "<br><span class='small'>정답: <b lang='ja'>"+esc(w.word)+"</b>（"+esc(w.reading)+"） · "+esc(w.meaning)+"</span>";
  }
}
function renderJapaneseWordCard(){
  const w=jpState.wordList[jpState.wordIndex];
  if(!w){exitJapanesePractice();return}
  const chars=[...w.word],pct=Math.round((jpState.wordIndex+1)/jpState.wordList.length*100);
  syncDrillViewport();document.body.classList.add("drill-active");
  if(window._drillViewportFit)window.visualViewport&&window.visualViewport.removeEventListener("resize",window._drillViewportFit);
  window._drillViewportFit=function(){syncDrillViewport()};
  window.visualViewport&&window.visualViewport.addEventListener("resize",window._drillViewportFit,{passive:true});

  let canvases="";
  chars.forEach(function(ch,i){
    canvases+="<div class='jp-word-box'><canvas id='jpWordCanvas"+i+"' width='320' height='320'></canvas><div class='jp-word-answer' lang='ja' hidden>"+esc(ch)+"</div></div>";
  });
  let h="<div class='drill-session-shell'><div class='drill-session-top'><div class='drill-status-row'><span class='drill-status-pill accent'>"+(jpState.wordRound+1)+"회차</span><span class='drill-status-pill'>"+(jpState.wordIndex+1)+"/"+jpState.wordList.length+"</span><span class='drill-status-pill'>"+pct+"%</span></div><div class='drill-top-actions'><button class='btn drill-icon-btn drill-settings-btn' id='jpWordExit'>목록</button></div></div>";
  h+="<div class='jp-word-stage'><section class='jp-word-question'><span class='drill-official'>읽기 + 예문 → 한자쓰기</span><div class='jp-word-reading'>"+esc(w.reading)+"</div><div class='jp-word-meaning'>"+esc(w.meaning)+"</div><div class='jp-word-example'>"+esc(w.sentence)+"</div><div class='jp-word-translation'>"+esc(w.translation)+"</div><div id='jpWordFeedback' class='feedback jp-word-feedback'></div></section>";
  h+="<section class='jp-word-canvas-pane'><div class='jp-word-canvas-grid' style='--word-len:"+chars.length+"'>"+canvases+"</div><div class='jp-word-nav'><button class='btn' id='jpWordPrev' "+(jpState.wordIndex===0?"disabled":"")+">← 이전 단어</button><button class='btn' id='jpWordNext'>"+(jpState.wordIndex===jpState.wordList.length-1?"회차 완료 →":"다음 단어 →")+"</button></div><div class='jp-word-controls'><button class='btn' id='jpWordClear'>지우기</button><button class='btn' id='jpWordReveal'>정답 보기</button><button class='btn primary' id='jpWordCheck'>채점</button></div></section></div></div>";
  $("#jp").innerHTML=h;
  chars.forEach(function(_,i){setupAnyCanvas("#jpWordCanvas"+i)});
  $("#jpWordExit").onclick=exitJapanesePractice;
  $("#jpWordPrev").onclick=function(){if(jpState.wordIndex>0){jpState.wordIndex--;jpState.wordChecked=false;renderJapaneseWordCard()}};
  $("#jpWordNext").onclick=function(){
    if(jpState.wordIndex===jpState.wordList.length-1){
      toast((jpState.wordRound+1)+"회차를 마쳤습니다");
      exitJapanesePractice();
      return;
    }
    jpState.wordIndex++;jpState.wordChecked=false;renderJapaneseWordCard();
  };
  $("#jpWordClear").onclick=jpClearWordCanvases;
  $("#jpWordReveal").onclick=jpToggleWordAnswer;
  $("#jpWordCheck").onclick=jpGradeWord;
}

/* atlas */
function jpFindItem(ch){return jpItemMap.get(ch)||null}
function jpRelatedWords(ch){
  return jpWords.filter(function(w){return w.word.includes(ch)}).slice(0,24);
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
  cells.push(["분류",item.set==="joyo"?"常用漢字":"表外漢字"]);
  if(item.set==="joyo")cells.push(["배정",jpGradeLabel(item.grade)]);
  if(item.strokes)cells.push(["총획",item.strokes+"획"]);
  if(item.radical)cells.push(["부수",item.radical]);
  if(item.old)cells.push(["旧字体",item.old]);
  if(item.variants&&item.variants.length)cells.push(["이체·간이자",item.variants.join(" · ")]);
  return cells.map(function(c){return "<div class='jp-atlas-cell'><span>"+esc(c[0])+"</span><b lang='ja'>"+esc(c[1])+"</b></div>"}).join("");
}
async function openJapaneseAtlasDetail(ch){
  closeJapaneseAtlasDetail();
  const item=jpFindItem(ch);if(!item)return;
  const words=jpRelatedWords(ch),saved=!!jpUnknown[jpKey(item)];
  const backdrop=document.createElement("div");backdrop.id="jpAtlasBackdrop";backdrop.className="jp-atlas-backdrop";backdrop.onclick=closeJapaneseAtlasDetail;
  const sheet=document.createElement("div");sheet.id="jpAtlasSheet";sheet.className="jp-atlas-sheet";
  sheet.innerHTML="<div class='jp-atlas-head'><div class='jp-atlas-big' lang='ja'>"+esc(ch)+"</div><div class='jp-atlas-title'><b>"+jpSetLabel(item.set)+" 도감</b><small>"+esc(jpCardMeta(item))+"</small></div><button class='jp-atlas-close' id='jpAtlasClose'>×</button></div>"+
    "<div class='jp-atlas-data'>"+jpAtlasLocalCells(item)+"<div class='jp-atlas-cell'><span>음독</span><b id='jpAtlasOn' class='jp-atlas-loading'>불러오는 중…</b></div><div class='jp-atlas-cell'><span>훈독</span><b id='jpAtlasKun' class='jp-atlas-loading'>불러오는 중…</b></div><div class='jp-atlas-cell'><span>한국어 뜻·훈음</span><b id='jpAtlasMeaning'>"+esc(jpKoreanHanjaMeaning(item)||"한국 훈음 데이터 확인 중")+"</b></div></div>"+
    "<div class='app-section-title' style='margin-top:13px'>연관 단어</div><div class='jp-atlas-words'>"+(words.length?words.map(function(w){return "<div class='jp-atlas-word'><b lang='ja'>"+esc(w.word)+"</b><div>"+esc(w.reading)+" · "+esc(w.meaning)+"<small>"+esc(w.sentence)+"</small></div></div>"}).join(""):"<div class='jp-empty'>현재 예문 데이터에 연결된 단어가 없습니다.</div>")+"</div>"+
    "<div class='jp-atlas-actions'><button class='btn "+(saved?"primary":"")+"' id='jpAtlasSave'>"+(saved?"★ 저장됨":"☆ 모름 저장")+"</button><button class='btn primary' id='jpAtlasPractice'>이 글자 연습</button></div>";
  document.body.appendChild(backdrop);document.body.appendChild(sheet);
  $("#jpAtlasClose").onclick=closeJapaneseAtlasDetail;
  $("#jpAtlasSave").onclick=function(){toggleJpUnknown(item)};
  $("#jpAtlasPractice").onclick=function(){closeJapaneseAtlasDetail();jpState.view="practice";startJapanesePractice(ch)};
  const data=await jpFetchKanjiApi(ch);
  if(!document.getElementById("jpAtlasSheet"))return;
  const on=$("#jpAtlasOn"),kun=$("#jpAtlasKun"),meaning=$("#jpAtlasMeaning");
  const ko=jpKoreanHanjaMeaning(item);
  if(meaning)meaning.textContent=ko||"한국어 훈음 데이터 없음";
  if(data){
    if(on){on.className="";on.textContent=(data.on_readings||[]).join(" · ")||"—"}
    if(kun){kun.className="";kun.textContent=(data.kun_readings||[]).join(" · ")||"—"}
  }else{
    [on,kun].forEach(function(x){if(x){x.className="";x.textContent="온라인 읽기 정보 없음"}});
  }
}
