
let jpJoyo=[];
let jpHyogai=[];
let jpDataLoading=false;
let jpDataError="";
let jpState={set:"joyo",grade:"all",query:"",savedOnly:false,limit:120,mode:"memory",order:"source",count:20,list:[],index:0,phase:"memorize",checked:false};
let jpStats=JSON.parse(localStorage.getItem("jpHanjaStatsV1")||"{}");
let jpUnknown=JSON.parse(localStorage.getItem("jpHanjaUnknownV1")||"{}");
let jpHideTimer=null;

function jpSetLabel(s){return s==="joyo"?"常用漢字":"表外漢字"}
function jpGradeLabel(g){return g==="S"?"中高":("小"+g)}
function jpKey(item){return (item.set||jpState.set)+"|"+item.char}
function saveJpProgress(){
  localStorage.setItem("jpHanjaStatsV1",JSON.stringify(jpStats));
  localStorage.setItem("jpHanjaUnknownV1",JSON.stringify(jpUnknown));
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
async function loadJapaneseData(){
  if(jpJoyo.length&&jpHyogai.length)return true;
  if(jpDataLoading)return false;
  jpDataLoading=true;jpDataError="";
  try{
    const pair=await Promise.all([
      fetch("./data/japanese/joyo.tsv",{cache:"no-store"}),
      fetch("./data/japanese/hyogai.txt",{cache:"no-store"})
    ]);
    if(!pair[0].ok||!pair[1].ok)throw Error("HTTP "+pair[0].status+"/"+pair[1].status);
    jpJoyo=parseJoyoData(await pair[0].text());
    const joyoSet=new Set(jpJoyo.map(function(x){return x.char}));
    jpHyogai=parseHyogaiData(await pair[1].text(),joyoSet);
    if(jpJoyo.length!==2136||jpHyogai.length<800)throw Error("일본 한자 데이터 수가 비정상입니다.");
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
function jpCardMeta(x){
  if(x.set==="joyo"){
    const old=x.old?(" · 舊 "+x.old):"";
    return jpGradeLabel(x.grade)+" · "+x.strokes+"획 · "+(x.radical||"—")+old;
  }
  return x.variants&&x.variants.length?("표외 · 이체 "+x.variants.join("·")):"표외 핵심";
}
function setJapaneseSet(s){
  jpState.set=s==="hyogai"?"hyogai":"joyo";
  jpState.grade="all";jpState.query="";jpState.savedOnly=false;jpState.limit=120;
  renderJapanese();
}
function setJapaneseGrade(g){jpState.grade=g;jpState.limit=120;renderJapanese()}
function setJapaneseMode(m){jpState.mode=m==="copy"?"copy":"memory";renderJapanese()}
function setJapaneseOrder(o){jpState.order=o==="random"?"random":"source";renderJapanese()}
function toggleJapaneseSavedOnly(){jpState.savedOnly=!jpState.savedOnly;jpState.limit=120;renderJapanese()}
function applyJapaneseSearch(){
  jpState.query=($("#jpSearch")&&$("#jpSearch").value)||"";
  jpState.limit=120;renderJapanese();
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
}
function jpGradeChipsHtml(){
  const a=[["all","전체"],["1","小1"],["2","小2"],["3","小3"],["4","小4"],["5","小5"],["6","小6"],["S","中高"]];
  return a.map(function(v){
    return "<button class='jp-filter-chip "+(jpState.grade===v[0]?"active":"")+"' data-grade='"+v[0]+"'>"+v[1]+"</button>";
  }).join("");
}
function jpCardsHtml(rows){
  return rows.map(function(x){
    const saved=!!jpUnknown[jpKey(x)];
    return "<button class='jp-card "+(saved?"saved":"")+"' data-jp-char='"+esc(x.char)+"'>"+
      "<div class='jp-card-char'>"+esc(x.char)+"</div>"+
      "<div class='jp-card-meta'>"+(saved?"★ ":"")+esc(jpCardMeta(x))+"</div></button>";
  }).join("");
}
async function renderJapanese(){
  clearTimeout(jpHideTimer);jpHideTimer=null;
  document.body.classList.remove("drill-active");
  const el=$("#jp");if(!el)return;
  if(!jpJoyo.length||!jpHyogai.length){
    el.innerHTML="<div class='app-screen'><section class='app-section'><div class='prompt'>日本漢字 데이터 불러오는 중…</div><div class='sub'>常用漢字 · 表外漢字 목록을 준비하고 있습니다.</div></section></div>";
    const ok=await loadJapaneseData();
    if(typeof mode!=="undefined"&&mode!=="jp")return;
    if(!ok){
      el.innerHTML="<div class='app-screen'><section class='app-section'><div class='prompt'>일본 한자 데이터를 불러오지 못했습니다.</div><div class='sub'>"+esc(jpDataError||"네트워크 상태를 확인해 주세요.")+"</div><button class='btn primary' id='jpRetry' style='margin-top:12px'>다시 시도</button></section></div>";
      $("#jpRetry").onclick=function(){jpDataError="";renderJapanese()};
      return;
    }
  }
  const all=jpCurrentPool(),p=jpProfile(),shown=all.slice(0,jpState.limit);
  const setTotal=jpState.set==="joyo"?jpJoyo.length:jpHyogai.length;
  const sourceSub=jpState.set==="joyo"?
    "학년별 배정과 중·고교 상용한자를 분리해서 볼 수 있습니다.":
    "2000 표외한자자체표의 인쇄표준자 1,022자에서 현재 상용 147자를 제외한 핵심 모음입니다.";
  const modeNote=jpState.mode==="memory"?
    "정답 글자를 2초만 보여 준 뒤 가립니다. 읽기 하나만 보고 글자를 맞히는 방식보다 동음자가 많은 일본어에서 공정하게 ‘글자 형태 기억’을 연습할 수 있습니다.":
    "정답 글자를 옆에 둔 채 따라 씁니다. 처음 접하는 표외 한자나 획이 복잡한 글자에 적합합니다.";
  const nStart=Math.min(jpState.count||all.length,all.length);
  let h="";
  h+="<div class='jp-screen'>";
  h+="<section class='jp-hero'><div class='jp-kicker'>DOKI 漢字 · JAPANESE LAB</div><h2>日本漢字</h2><p>한국 한자 급수와 분리해서 일본의 상용한자와 표외 한자를 모아 보고, 글자 형태를 손으로 익힙니다.</p>";
  h+="<div class='jp-set-seg'><button class='"+(jpState.set==="joyo"?"active":"")+"' data-jp-set='joyo'>常用漢字<small>상용 2,136자</small></button>";
  h+="<button class='"+(jpState.set==="hyogai"?"active":"")+"' data-jp-set='hyogai'>表外漢字<small>표외 핵심 "+jpHyogai.length.toLocaleString()+"자</small></button></div></section>";
  h+="<div class='jp-metrics'><div class='jp-metric'><b>"+setTotal.toLocaleString()+"</b><span>"+(jpState.set==="joyo"?"현재 상용 목록":"현재 표외 핵심")+"</span></div>";
  h+="<div class='jp-metric'><b>"+p.attempted.toLocaleString()+"</b><span>연습한 글자 · "+p.accuracy+"%</span></div><div class='jp-metric'><b>"+p.saved.toLocaleString()+"</b><span>모름 저장</span></div></div>";
  h+="<section class='app-section'><div class='app-section-head'><div><div class='app-section-title'>"+jpSetLabel(jpState.set)+" 모음</div><div class='app-section-sub'>"+sourceSub+"</div></div><span class='badge'>"+all.length.toLocaleString()+"자</span></div>";
  if(jpState.set==="joyo")h+="<div class='jp-filter-row' id='jpGradeRow'>"+jpGradeChipsHtml()+"</div>";
  h+="<div class='jp-search-row'><input id='jpSearch' type='text' value='"+esc(jpState.query)+"' placeholder='"+(jpState.set==="joyo"?"한자 · 구자체 · 부수 검색":"한자 · 이체자 검색")+"'><button class='btn jp-saved-toggle "+(jpState.savedOnly?"primary":"")+"' id='jpSavedOnly'>★ 저장만</button></div></section>";
  h+="<section class='app-section'><div class='app-section-head'><div><div class='app-section-title'>손글씨 연습</div><div class='app-section-sub'>한 글자의 모양 자체를 익히는 전용 모드</div></div><span class='badge good'>"+(jpState.mode==="memory"?"암기 쓰기":"보고 쓰기")+"</span></div>";
  h+="<div class='jp-practice-grid'><div class='jp-field'><span>쓰기 방식</span><div class='jp-mode-seg' id='jpModeSeg'><button data-mode='memory' class='"+(jpState.mode==="memory"?"active":"")+"'>2초 암기 → 쓰기</button><button data-mode='copy' class='"+(jpState.mode==="copy"?"active":"")+"'>보고 따라쓰기</button></div></div>";
  h+="<div class='jp-field'><span>순서</span><div class='jp-mode-seg' id='jpOrderSeg'><button data-order='source' class='"+(jpState.order==="source"?"active":"")+"'>목록순</button><button data-order='random' class='"+(jpState.order==="random"?"active":"")+"'>랜덤</button></div></div>";
  h+="<label class='jp-field'><span>분량</span><select id='jpCount'><option value='20' "+(jpState.count===20?"selected":"")+">20자</option><option value='50' "+(jpState.count===50?"selected":"")+">50자</option><option value='100' "+(jpState.count===100?"selected":"")+">100자</option><option value='0' "+(jpState.count===0?"selected":"")+">현재 목록 전체</option></select></label></div>";
  h+="<div class='jp-mode-note'>"+modeNote+"</div><button class='btn primary app-start' id='jpStart' style='width:100%;margin-top:10px' "+(all.length?"":"disabled")+">현재 범위로 연습 시작 · "+nStart.toLocaleString()+"자</button></section>";
  h+="<section class='app-section'><div class='app-section-head'><div><div class='app-section-title'>한자 목록</div><div class='app-section-sub'>글자를 누르면 그 글자부터 연습을 시작합니다.</div></div></div>";
  if(shown.length){
    h+="<div class='jp-grid'>"+jpCardsHtml(shown)+"</div>";
    if(all.length>shown.length)h+="<button class='btn jp-more' id='jpMore'>더 보기 · "+shown.length.toLocaleString()+"/"+all.length.toLocaleString()+"</button>";
  }else h+="<div class='jp-empty'>조건에 맞는 한자가 없습니다.</div>";
  h+="<details class='compact-settings' style='margin-top:10px'><summary>데이터 기준</summary><div class='jp-source-note'>常用漢字는 2010년 현행 2,136자 목록을 기준으로 합니다. 表外漢字는 2000년 표외한자자체표 인쇄표준자 1,022자의 기본자를 사용하되, 이후 상용한자에 들어간 147자는 중복 학습을 막기 위해 제외합니다. 괄호 안 간이·이체 표기는 별도 글자로 세지 않고 카드 보조정보로 표시합니다.</div></details></section>";
  h+="</div>";
  el.innerHTML=h;

  $$("[data-jp-set]").forEach(function(b){b.onclick=function(){setJapaneseSet(b.dataset.jpSet)}});
  $$("#jpGradeRow [data-grade]").forEach(function(b){b.onclick=function(){setJapaneseGrade(b.dataset.grade)}});
  $$("#jpModeSeg [data-mode]").forEach(function(b){b.onclick=function(){setJapaneseMode(b.dataset.mode)}});
  $$("#jpOrderSeg [data-order]").forEach(function(b){b.onclick=function(){setJapaneseOrder(b.dataset.order)}});
  $("#jpCount").onchange=function(e){jpState.count=+e.target.value};
  $("#jpSavedOnly").onclick=toggleJapaneseSavedOnly;
  $("#jpSearch").onkeydown=function(e){if(e.key==="Enter")applyJapaneseSearch()};
  $("#jpSearch").onchange=applyJapaneseSearch;
  $("#jpStart").onclick=function(){startJapanesePractice()};
  if($("#jpMore"))$("#jpMore").onclick=function(){jpState.limit+=120;renderJapanese()};
  $$(".jp-card[data-jp-char]").forEach(function(b){b.onclick=function(){startJapanesePractice(b.dataset.jpChar)}});
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
  if(jpState.count>0&&!startChar)list=list.slice(0,jpState.count);
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
  const target=$("#jpMemoryTarget"),hint=$("#jpMemoryHint");
  if(target){target.classList.remove("hidden");target.textContent=item?item.char:""}
  if(hint)hint.textContent="2초 동안 모양을 기억하세요";
  jpHideTimer=setTimeout(function(){
    jpState.phase="write";
    const t=$("#jpMemoryTarget"),h=$("#jpMemoryHint");
    if(t){t.classList.add("hidden");t.textContent="?"}
    if(h)h.textContent="이제 기억해서 써보세요";
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
  h+="<div class='drill-stage write-stage'><section class='drill-question-pane'><span class='drill-official'>"+(item.set==="joyo"?"✓ 常用漢字":"◇ 表外漢字")+"</span><div class='prompt'>"+(st.mode==="memory"?"모양을 외운 뒤 직접 써보세요.":"보면서 천천히 따라 써보세요.")+"</div>";
  h+="<div class='jp-memory-target' id='jpMemoryTarget'>"+esc(item.char)+"</div><div class='jp-memory-sub' id='jpMemoryHint'>"+(st.mode==="memory"?"2초 동안 모양을 기억하세요":"정답을 보면서 형태를 익히세요")+"</div><div class='jp-memory-sub'>"+esc(jpCardMeta(item))+"</div>";
  if(st.mode==="memory")h+="<button class='btn jp-memory-again' id='jpShowAgain'>2초 다시 보기</button>";
  h+="<div id='jpFeedback' class='feedback'></div></section>";
  h+="<section class='drill-canvas-pane'><div class='drill-canvas-wrap'><canvas id='jpCanvas' width='600' height='600'></canvas><div id='jpAnswerPeek' class='drill-answer-overlay jp-answer-overlay' hidden>"+esc(item.char)+"</div></div>";
  h+="<div class='drill-bottom-nav'><button class='btn' id='jpPrev' "+(st.index===0?"disabled":"")+">← 이전 한자</button><button class='btn' id='jpNext'>"+(st.index===st.list.length-1?"처음으로":"다음 한자 →")+"</button></div>";
  h+="<div class='drill-write-controls'><button class='btn' id='jpClear'>지우기</button><button class='btn' id='jpReveal'>정답 보기</button><button class='btn "+(saved?"saved":"")+"' id='jpUnknownBtn'>"+(saved?"★ 저장됨":"☆ 모름 저장")+"</button><button class='btn primary' id='jpCheck'>채점</button></div></section></div></div>";
  $("#jp").innerHTML=h;

  setupAnyCanvas("#jpCanvas");
  $("#jpExit").onclick=exitJapanesePractice;
  $("#jpPrev").onclick=function(){if(st.index>0){st.index--;st.checked=false;renderJapanesePracticeCard()}};
  $("#jpNext").onclick=function(){st.index=st.index===st.list.length-1?0:st.index+1;st.checked=false;renderJapanesePracticeCard()};
  $("#jpClear").onclick=function(){clearAnyCanvas("#jpCanvas");const fb=$("#jpFeedback");if(fb){fb.className="feedback";fb.innerHTML=""}};
  const peek=$("#jpAnswerPeek"),rev=$("#jpReveal");
  rev.onclick=function(){
    const show=peek.hidden;peek.hidden=!show;rev.textContent=show?"정답 숨기기":"정답 보기";rev.classList.toggle("primary",show);
  };
  $("#jpUnknownBtn").onclick=function(){toggleJpUnknown(item)};
  $("#jpCheck").onclick=function(){
    autoGradeHandwriting("#jpCanvas",item.char,item.strokes||0,function(ok,score,label){
      st.checked=true;showHandwritingResult("#jpFeedback",item.char,ok,score,label);jpRecord(item,ok);
    });
  };
  if($("#jpShowAgain"))$("#jpShowAgain").onclick=jpScheduleHide;
  if(st.mode==="memory")jpScheduleHide();
}
