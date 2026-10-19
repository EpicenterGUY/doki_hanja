/* Kotoba Bridge Vocabulary Lab v0.2: independent local progress, Japanese-first flashcards. */
(function(){
"use strict";
const words=window.KB_VOCAB||[];
const lookup=Object.fromEntries(words.map(w=>[w.id,w]));
const levels=["L0","L1","L2","L3","L4","L5","L6"];
const KEY="kotobaBridge.vocab.v1";
const fresh=()=>({version:1,cards:{},stars:{}});
let store=fresh();
try{let x=JSON.parse(localStorage.getItem(KEY)||"null");if(x&&x.version===1&&x.cards&&x.stars)store=x;}catch(e){}
const state={level:"all",category:"all",pos:"all",search:"",starOnly:false,page:0,direction:"ko",count:10,view:"browse",session:null,result:null};
const el=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const keep=()=>{try{localStorage.setItem(KEY,JSON.stringify(store));}catch(e){console.warn("vocabulary storage unavailable",e);}};
const sortRandom=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const due=w=>{let x=store.cards[w.id];return !!(x&&x.seen&&x.next<=Date.now());};
const stats=()=>{let learned=0,mastered=0,dueCount=0;for(let w of words){let f=store.cards[w.id];if(f&&f.seen){learned++;if(f.stage>=3)mastered++;if(due(w))dueCount++;}}return {total:words.length,learned,mastered,due:dueCount,stars:Object.keys(store.stars).filter(k=>store.stars[k]&&lookup[k]).length};};
const categories=()=>[...new Set(words.filter(w=>state.level==="all"||w.level===state.level).map(w=>w.category))];
const poses=()=>[...new Set(words.filter(w=>state.level==="all"||w.level===state.level).map(w=>w.pos))];
function filtered(){let q=state.search.trim().toLowerCase();return words.filter(w=>(state.level==="all"||w.level===state.level)&&(state.category==="all"||w.category===state.category)&&(state.pos==="all"||w.pos===state.pos)&&(!state.starOnly||store.stars[w.id])&&(!q||[w.ko,w.ja,w.category,w.level,w.pos,w.exKo||"",w.exJa||""].join(" ").toLowerCase().includes(q)));}
function remember(w,yes){let f=store.cards[w.id]||{seen:0,known:0,stage:0,next:0};f.seen++;if(yes){f.known++;f.stage=Math.min(5,f.stage+1);f.next=Date.now()+[0,1,3,7,14,30][f.stage]*86400000;}else{f.stage=0;f.next=Date.now();}store.cards[w.id]=f;keep();}
function status(w){let f=store.cards[w.id];return !f?"未学習":f.stage>=3?"定着中":due(w)?"復習待ち":"学習中";}
function optionsFor(w,dir){const field=dir==="ko"?"ja":"ko";const used=new Set([w[field]]);const picks=[w];const pool=sortRandom(words.filter(x=>x.id!==w.id&&Math.abs(levels.indexOf(w.level)-levels.indexOf(x.level))<=1)).concat(sortRandom(words.filter(x=>x.id!==w.id)));for(const x of pool){if(!used.has(x[field])){used.add(x[field]);picks.push(x);}if(picks.length===4)break;}return sortRandom(picks);}
function run(mode){const matched=filtered();if(!matched.length){alert("出題対象の単語がありません。検索・フィルターを変更してください。");return;}
const order=[...sortRandom(matched.filter(due)),...sortRandom(matched.filter(w=>!store.cards[w.id])),...sortRandom(matched.filter(w=>store.cards[w.id]&&!due(w)))];
state.session={mode,ids:order.slice(0,state.count).map(w=>w.id),index:0,flip:false,pick:-1,options:[],known:0,missed:0,direction:state.direction};state.result=null;state.view="study";}
function next(yes){const s=state.session;if(!s)return;const w=lookup[s.ids[s.index]];if(!w)return;remember(w,yes);s.known+=yes?1:0;s.missed+=yes?0:1;s.index++;s.flip=false;s.pick=-1;s.options=[];if(s.index>=s.ids.length){state.result={total:s.ids.length,known:s.known,missed:s.missed};state.session=null;state.view="result";}}
function resultView(){let r=state.result;return '<div class="quiz-shell"><div class="panel vocab-end"><div class="vocab-trophy">✓</div><h2>暗記ミッション完了！</h2><div class="stat-number">'+r.known+' / '+r.total+'</div><p class="small muted">覚えられなかった単語は次の復習で優先されます。</p><button class="btn" data-action="vocab-home">単語帳に戻る</button></div></div>';}
function studyView(){let s=state.session,w=s&&lookup[s.ids[s.index]];if(!w)return '<div class="panel"><p>学習セッションがありません。</p><button class="btn" data-action="vocab-home">単語帳へ</button></div>';
const korean=s.direction==="ko",front=korean?w.ko:w.ja,back=korean?w.ja:w.ko;
let body="";
if(s.mode==="flash"){
 body='<div class="flash-card"><div class="small muted">'+(korean?"韓国語を見て日本語を思い出す":"日本語を見て韓国語を思い出す")+'</div><div class="flash-front'+(korean?" korean":"")+'">'+esc(front)+'</div>'+(s.flip?'<div class="flash-reverse'+(korean?"":" korean")+'">'+esc(back)+'</div><div class="small muted">'+esc(w.pos)+' · '+esc(w.category)+'</div>'+(w.exKo?'<div class="flash-example korean">'+esc(w.exKo)+'<span>'+esc(w.exJa)+'</span></div>':""):'<p class="small muted">頭の中で答えてから裏返してください。</p>')+'</div>'+(s.flip?'<div class="flash-buttons"><button class="btn ghost" data-action="vocab-grade" data-grade="again">↻ もう一度</button><button class="btn" data-action="vocab-grade" data-grade="know">✓ 覚えた</button></div>':'<button class="btn wide" data-action="vocab-flip">答えを見る →</button>');
}else{
 if(!s.options.length)s.options=optionsFor(w,s.direction).map(x=>x.id);
 const choices=s.options.map((id,i)=>{let x=lookup[id];let c=s.pick<0?"":id===w.id?" correct":s.pick===i?" wrong":"";return '<button class="option'+c+'" data-action="vocab-pick" data-pick="'+i+'" '+(s.pick>=0?"disabled":"")+'><span class="letter">'+String.fromCharCode(65+i)+'</span><span class="'+(korean?"":"korean")+'">'+esc(korean?x.ja:x.ko)+'</span></button>';}).join("");
 body='<div class="quiz-kind">'+(korean?"韓国語の意味として正しいものは？":"日本語に合う韓国語は？")+'</div><div class="flash-front'+(korean?" korean":"")+'">'+esc(front)+'</div><div class="option-grid">'+choices+'</div>'+(s.pick>=0?'<div class="feedback'+(s.options[s.pick]===w.id?"":" bad")+'"><strong>'+(s.options[s.pick]===w.id?"✓ 正解！":"✕ 正解： "+esc(back))+'</strong><p>'+esc(w.ko)+' — '+esc(w.ja)+'</p>'+(w.exKo?'<p>'+esc(w.exKo)+' / '+esc(w.exJa)+'</p>':"")+'</div><button class="btn wide next-vocab" data-action="vocab-next">次の単語 →</button>':"");
}
return '<div class="quiz-shell"><div class="row"><button class="btn ghost" data-action="vocab-home">← 単語帳</button><span class="pill">'+(s.mode==="flash"?"暗記カード":"4択クイズ")+' · '+(s.index+1)+' / '+s.ids.length+'</span></div><div class="track" style="margin:16px 0"><div class="fill" style="width:'+((s.index+1)/s.ids.length*100)+'%"></div></div><div class="panel quiz-card">'+body+'</div><p class="small muted">覚えた '+s.known+' · もう一度 '+s.missed+' · 残り '+(s.ids.length-s.index)+' 語</p></div>';
}
function rows(){let list=filtered(),pages=Math.ceil(list.length/25);if(state.page>=pages)state.page=Math.max(0,pages-1);const start=state.page*25,part=list.slice(start,start+25);return '<p class="small muted">'+list.length+' 語 · '+(list.length?(start+1)+"–"+Math.min(start+25,list.length):"0")+' 件</p>'+part.map(w=>'<div class="vocab-row"><div class="vocab-word"><strong class="korean">'+esc(w.ko)+'</strong><span>'+esc(w.ja)+'</span><small>'+esc(w.level)+' · '+esc(w.category)+' · '+esc(w.pos)+' · '+status(w)+'</small>'+(w.exKo?'<small class="korean">'+esc(w.exKo)+' — '+esc(w.exJa)+'</small>':"")+'</div><button class="favorite'+(store.stars[w.id]?" active":"")+'" data-action="vocab-star" data-id="'+w.id+'" aria-label="'+esc(w.ko)+' をお気に入り登録" aria-pressed="'+!!store.stars[w.id]+'">'+(store.stars[w.id]?"★":"☆")+'</button></div>').join("")+'<div class="row vocab-pages"><button class="btn ghost" data-action="vocab-page" data-step="-1" '+(state.page===0?"disabled":"")+'>← 前へ</button><span class="small muted">'+(list.length?state.page+1:0)+' / '+Math.max(1,pages)+'</span><button class="btn ghost" data-action="vocab-page" data-step="1" '+(state.page+1>=pages?"disabled":"")+'>次へ →</button></div>';}
function drawRows(){const target=el("#vocab-list");if(target)target.innerHTML=rows();}
function browseView(){const z=stats();let cats=categories();let parts=poses();if(state.pos!=="all"&&!parts.includes(state.pos))state.pos="all";if(state.category!=="all"&&!cats.includes(state.category))state.category="all";
return '<div class="vocab-banner"><div><div class="eyebrow">VOCABULARY LAB · ことばの橋</div><h2>毎日少しずつ、単語を覚えよう。</h2><p>日韓対応の単語帳で暗記・クイズ・間隔復習。</p></div><span class="vocab-banner-mark">語</span></div><div class="grid3 stats-top"><div class="panel"><div class="stat-number">'+z.total+'</div><div class="stat-label">収録単語</div></div><div class="panel"><div class="stat-number">'+z.learned+'</div><div class="stat-label">学習済み</div></div><div class="panel"><div class="stat-number">'+z.due+'</div><div class="stat-label">今日の復習</div></div></div>'+
'<div class="panel"><div class="row"><h3>単語暗記ミッション</h3><span class="pill">定着中 '+z.mastered+' 語</span></div>'+
'<div class="vocab-filters"><label>レベル<select id="vocab-level" aria-label="レベル"><option value="all">すべて</option>'+levels.map(x=>'<option value="'+x+'" '+(state.level===x?"selected":"")+'>'+x+'</option>').join("")+'</select></label>'+
'<label>テーマ<select id="vocab-category" aria-label="テーマ"><option value="all">すべて</option>'+cats.map(x=>'<option '+(state.category===x?"selected":"")+'>'+esc(x)+'</option>').join("")+'</select></label>'+
'<label>品詞<select id="vocab-pos" aria-label="品詞で絞り込む"><option value="all">すべての品詞</option>'+parts.map(x=>'<option '+(state.pos===x?"selected":"")+'>'+esc(x)+'</option>').join("")+'</select></label>'+ '<label>暗記方向<select id="vocab-direction" aria-label="暗記方向"><option value="ko" '+(state.direction==="ko"?"selected":"")+'>韓国語 → 日本語</option><option value="ja" '+(state.direction==="ja"?"selected":"")+'>日本語 → 韓国語</option></select></label></div>'+
'<div class="pos-pills"><button class="pos-pill'+(state.pos==="all"?" active":"")+'" data-action="vocab-pos" data-pos="all">すべて</button>'+parts.map(x=>'<button class="pos-pill'+(state.pos===x?" active":"")+'" data-action="vocab-pos" data-pos="'+esc(x)+'">'+esc(x)+' <small>'+words.filter(w=>w.pos===x&&(state.level==="all"||w.level===state.level)).length+'</small></button>').join("")+'</div>'+ '<div class="vocab-tools"><label class="vocab-checkbox"><input type="checkbox" id="vocab-only-stars" '+(state.starOnly?"checked":"")+'> ★ お気に入りだけ</label><label class="vocab-count">出題数<select id="vocab-count"><option value="10" '+(state.count===10?"selected":"")+'>10語</option><option value="20" '+(state.count===20?"selected":"")+'>20語</option><option value="30" '+(state.count===30?"selected":"")+'>30語</option></select></label></div>'+
'<div class="vocab-actions"><button class="btn" data-action="vocab-start" data-mode="flash">▤ 暗記カード</button><button class="btn ghost" data-action="vocab-start" data-mode="quiz">✦ 4択クイズ</button></div>'+
'<p class="footnote">復習期限になった語を優先し、そのあと未学習の語を表示します。「覚えた」「もう一度」で記憶状態を更新します。</p></div>'+
'<div class="section-heading"><h2>単語データベース</h2><small>お気に入り '+z.stars+' 語</small></div>'+
'<div class="panel"><input class="search" id="vocab-search" value="'+esc(state.search)+'" type="search" placeholder="韓国語・日本語・分野を検索" aria-label="単語検索"><div id="vocab-list"></div></div>'+
'<details class="panel vocab-problem-search"><summary>文法・読解の問題も検索する</summary><div style="margin-top:16px"><input class="search" id="kb-search" placeholder="文法・クイズ問題を検索" autocomplete="off"><div id="dict-results"></div></div></details>';
}
function click(button){const a=button.dataset.action;
if(a==="vocab-start"){run(button.dataset.mode==="quiz"?"quiz":"flash");return;}
if(a==="vocab-pos"){if(a&&button.dataset.pos){state.pos=button.dataset.pos;state.page=0;}return;}
if(a==="vocab-star"){const id=button.dataset.id;if(lookup[id]){store.stars[id]=!store.stars[id];keep();}return;}
if(a==="vocab-page"){state.page=Math.max(0,state.page+Number(button.dataset.step||0));return;}
if(a==="vocab-home"){state.view="browse";state.session=null;return;}
if(a==="vocab-flip"){if(state.session)state.session.flip=true;return;}
if(a==="vocab-grade"){if(state.session&&state.session.flip)next(button.dataset.grade==="know");return;}
if(a==="vocab-pick"){const s=state.session;if(s&&s.mode==="quiz"&&s.pick<0){const n=Number(button.dataset.pick);if(Number.isInteger(n)&&n>=0&&n<s.options.length)s.pick=n;}return;}
if(a==="vocab-next"){let s=state.session;if(s&&s.pick>=0&&s.options.length){next(s.options[s.pick]===s.ids[s.index]);}return;}
}
function change(target){if(!target)return false;switch(target.id){
case "vocab-level":state.level=target.value;state.category="all";state.pos="all";state.page=0;return true;
case "vocab-pos":state.pos=target.value;state.page=0;return true;
case "vocab-category":state.category=target.value;state.page=0;return true;
case "vocab-direction":state.direction=target.value;return true;
case "vocab-count":state.count=[10,20,30].includes(Number(target.value))?Number(target.value):10;return true;
case "vocab-only-stars":state.starOnly=target.checked;state.page=0;return true;
default:return false;}}
function input(target){if(!target||target.id!=="vocab-search")return false;state.search=target.value;state.page=0;drawRows();return true;}
function importData(obj){if(!obj||obj.version!==1||typeof obj.cards!=="object"||typeof obj.stars!=="object")return false;let v=fresh();for(let w of words){const f=obj.cards[w.id];if(f&&typeof f==="object"){let seen=Math.max(0,Math.min(100000,Math.round(Number(f.seen)||0)));let known=Math.max(0,Math.min(seen,Math.round(Number(f.known)||0)));v.cards[w.id]={seen,known,stage:Math.max(0,Math.min(5,Math.round(Number(f.stage)||0))),next:Math.max(0,Math.min(9999999999999,Number(f.next)||0))};}if(obj.stars[w.id]===true)v.stars[w.id]=true;}store=v;keep();return true;}
window.KBV={render:()=>state.view==="browse"?browseView():state.view==="study"?studyView():resultView(),afterRender:drawRows,click,change,input,getData:()=>JSON.parse(JSON.stringify(store)),importData,reset:()=>{store=fresh();state.view="browse";state.session=null;keep();},stats,wordCount:words.length};
})();