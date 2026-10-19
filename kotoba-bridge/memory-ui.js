/* Kotoba Bridge memory atlas v0.3: grammar/Hangul/expressions/numerals + vocabulary hub. */
(function(){
"use strict";
const all=window.KB_MEMORY_CARDS||[];
const map=Object.fromEntries(all.map(x=>[x.id,x]));
const KEY="kotobaBridge.memory.v1";
const mk=()=>({version:1,items:{},favorites:{}});
let saved=mk();
try{let x=JSON.parse(localStorage.getItem(KEY)||"null");if(x&&x.version===1&&x.items&&x.favorites)saved=x;}catch(e){}
const sections=[
{id:"vocab",title:"単語",subtitle:"名詞・動詞・形容詞・副詞など",icon:"語",desc:"品詞・テーマ・レベル別の語彙"},
{id:"grammar",title:"文法",subtitle:"助詞・活用・接続・引用・敬語など",icon:"文",desc:"文法項目・日本語の意味・例文"},
{id:"hangul",title:"ハングル",subtitle:"子音・母音・パッチム・発音規則",icon:"한",desc:"文字と発音変化の基礎"},
{id:"expression",title:"表現",subtitle:"あいさつ・旅行・会話表現",icon:"話",desc:"よく使う短いフレーズと用法"},
{id:"number",title:"数詞",subtitle:"固有数詞・漢数詞・助数詞",icon:"数",desc:"数字の読み方と単位"}
];
const st={section:"overview",category:"all",level:"all",query:"",starOnly:false,page:0,study:null,finished:null};
const el=s=>document.querySelector(s);
const safe=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(saved));}catch(e){console.warn("Unable to save memorization progress",e);}};
function due(x){let p=saved.items[x.id];return !!(p&&p.seen&&p.next<=Date.now());}
function summary(){return {total:all.length,seen:all.filter(x=>saved.items[x.id]&&saved.items[x.id].seen).length,due:all.filter(due).length,mastered:all.filter(x=>saved.items[x.id]&&saved.items[x.id].stage>=3).length};}
function cats(section){return [...new Set(all.filter(x=>x.section===section&&(st.level==="all"||x.level===st.level)).map(x=>x.category))];}
function filtered(){const q=st.query.trim().toLowerCase();return all.filter(x=>x.section===st.section&&(st.level==="all"||x.level===st.level)&&(st.category==="all"||x.category===st.category)&&(!st.starOnly||saved.favorites[x.id])&&(!q||[x.front,x.back,x.category,x.example,x.translation].join(" ").toLowerCase().includes(q)));}
function progress(x,yes){let p=saved.items[x.id]||{seen:0,known:0,stage:0,next:0};p.seen++;if(yes){p.known++;p.stage=Math.min(p.stage+1,5);p.next=Date.now()+[0,1,3,7,14,30][p.stage]*86400000;}else{p.stage=0;p.next=Date.now();}saved.items[x.id]=p;save();}
function header(){return '<div class="memory-breadcrumb"><button class="btn ghost" data-action="mem-overview">← 暗記のホーム</button><span class="small muted">暗記 / '+safe(sections.find(x=>x.id===st.section)?.title||"")+'</span></div>';}
function overview(){let vs=window.KBV&&window.KBV.stats?window.KBV.stats():{total:0,learned:0};
const total=all.length+vs.total,learned=summary().seen+vs.learned;
return '<div class="memory-intro"><span class="eyebrow">MEMORY ATLAS</span><h2>覚えるための、分野別の暗記帳。</h2><p>コースの進み方とは別に、品詞・文法・文字・表現を整理した一覧表とカードで復習できます。</p><div class="memory-overview-stats"><span><strong>'+total+'</strong> 学習項目</span><span><strong>'+learned+'</strong> 学習済み</span></div></div>'+
'<div class="section-heading"><h2>暗記カテゴリを選ぶ</h2><small>5 CATEGORIES</small></div><div class="memory-categories">'+sections.map(x=>{const count=x.id==="vocab"?vs.total:all.filter(y=>y.section===x.id).length;return '<button class="memory-category" data-action="mem-section" data-section="'+x.id+'"><span class="memory-category-icon">'+x.icon+'</span><strong>'+x.title+'</strong><span class="memory-category-desc">'+x.subtitle+'</span><small>'+count+' 項目 · 一覧表と暗記</small><span class="memory-category-arrow">→</span></button>';}).join("")+'</div><div class="panel memory-note"><strong>学習と暗記の使い分け</strong><p>「コース」は順番に学ぶ授業、「暗記」は覚える項目の一覧表、「クイズ」は実力確認です。記憶に残りにくい項目は時間をあけて再出題します。</p></div>';}
function categoryView(){if(st.section==="vocab")return header()+(window.KBV?window.KBV.render():'<p>単語データを読み込めません。</p>');
const cfg=sections.find(x=>x.id===st.section),subset=all.filter(x=>x.section===st.section);
if(!cfg){st.section="overview";return overview();}
const categories=cats(st.section);if(st.category!=="all"&&!categories.includes(st.category))st.category="all";
return header()+'<section class="memory-head"><span class="memory-heading-icon">'+cfg.icon+'</span><div><span class="eyebrow">MEMORY · '+safe(cfg.title)+'</span><h2>'+safe(cfg.title)+'の暗記表</h2><p>'+safe(cfg.subtitle)+' · '+subset.length+'項目</p></div></section>'+
'<div class="panel"><div class="memory-toolbar"><label>レベル<select id="memory-level"><option value="all">すべて</option>'+["L0","L1","L2","L3","L4","L5","L6"].map(l=>'<option value="'+l+'" '+(st.level===l?"selected":"")+'>'+l+'</option>').join("")+'</select></label><label>項目カテゴリ<select id="memory-category"><option value="all">すべて</option>'+categories.map(c=>'<option '+(st.category===c?"selected":"")+'>'+safe(c)+'</option>').join("")+'</select></label></div><div class="memory-tag-row">'+categories.map(c=>'<button class="memory-tag'+(st.category===c?" selected":"")+'" data-action="mem-category" data-category="'+safe(c)+'">'+safe(c)+'</button>').join("")+'</div><input id="memory-search" class="search" type="search" placeholder="日本語・韓国語・カテゴリで検索" value="'+safe(st.query)+'"><div class="memory-toolbar-bottom"><label class="vocab-checkbox"><input type="checkbox" id="memory-star-only" '+(st.starOnly?"checked":"")+'> ★ お気に入りだけ</label><div class="memory-actions"><button class="btn" data-action="mem-start">▣ 暗記カードを開始</button><button class="btn ghost" data-action="mem-start-due">↻ 復習カード</button></div></div></div><div class="section-heading"><h2>一覧表</h2><small>韓国語・意味・例文</small></div><div class="panel memory-list"><div id="memory-rows"></div></div>';}
function renderRows(){const container=el("#memory-rows");if(!container)return;let items=filtered(),pages=Math.ceil(items.length/22);if(st.page>=pages)st.page=Math.max(0,pages-1);const begin=st.page*22;
container.innerHTML='<p class="small muted">'+items.length+' 項目 · '+(items.length?begin+1:0)+'–'+Math.min(begin+22,items.length)+'</p><div class="memory-table-head"><span>韓国語の項目</span><span>日本語の意味</span><span>詳細</span></div>'+
items.slice(begin,begin+22).map(x=>{const p=saved.items[x.id],label=!p?"未学習":p.stage>=3?"定着中":due(x)?"復習待ち":"学習中";
return '<div class="memory-table-item"><div class="memory-term korean"><strong>'+safe(x.front)+'</strong><small>'+safe(x.level)+' · '+safe(x.category)+'</small></div><div class="memory-meaning">'+safe(x.back)+'<div class="memory-example korean">'+safe(x.example)+'<span>'+safe(x.translation)+'</span></div>'+(x.usage||x.contrast?'<details class="grammar-help"><summary>使い方・日本語との違い</summary>'+(x.form?'<p><b>形：</b>'+safe(x.form)+'</p>':"")+(x.usage?'<p>'+safe(x.usage)+'</p>':"")+(x.contrast?'<p><b>比較：</b>'+safe(x.contrast)+'</p>':"")+'</details>':"")+'</div><div class="memory-actions-col"><button class="favorite'+(saved.favorites[x.id]?" active":"")+'" data-action="mem-star" data-id="'+x.id+'" aria-label="お気に入り" aria-pressed="'+(!!saved.favorites[x.id])+'">'+(saved.favorites[x.id]?"★":"☆")+'</button><span class="small muted">'+label+'</span></div></div>';}).join("")+
'<div class="row vocab-pages"><button class="btn ghost" data-action="mem-page" data-step="-1" '+(!st.page?"disabled":"")+'>← 前へ</button><span class="small muted">'+(items.length?st.page+1:0)+' / '+Math.max(1,pages)+'</span><button class="btn ghost" data-action="mem-page" data-step="1" '+((st.page+1)>=pages?"disabled":"")+'>次へ →</button></div>';}
function beginStudy(dueOnly){let pool=filtered();if(dueOnly)pool=pool.filter(due);
if(!pool.length){window.alert(dueOnly?"復習期限になったカードがありません。":"該当する暗記カードがありません。");return;}
const list=[...shuffle(pool.filter(due)),...shuffle(pool.filter(x=>!saved.items[x.id])),...shuffle(pool.filter(x=>saved.items[x.id]&&!due(x)))];
st.study={ids:list.slice(0,12).map(x=>x.id),index:0,flip:false,known:0,missed:0};
st.finished=null;}
function cardView(){let s=st.study,x=s&&map[s.ids[s.index]];
if(!x){st.study=null;return categoryView();}
return '<div class="quiz-shell"><div class="row"><button class="btn ghost" data-action="mem-stop">← 一覧表へ</button><span class="pill">'+safe(sections.find(c=>c.id===st.section).title)+' '+(s.index+1)+' / '+s.ids.length+'</span></div><div class="track" style="margin:15px 0"><div class="fill" style="width:'+((s.index+1)/s.ids.length*100)+'%"></div></div><div class="panel mem-flash"><span class="eyebrow">'+safe(x.category)+' · '+safe(x.level)+'</span><h2 class="korean">'+safe(x.front)+'</h2>'+(s.flip?'<div class="mem-flash-answer"><strong>'+safe(x.back)+'</strong><p class="korean">'+safe(x.example)+'</p><p>'+safe(x.translation)+'</p>'+(x.form?'<p class="grammar-usage">形：'+safe(x.form)+'</p>':"")+(x.usage?'<p class="grammar-usage">'+safe(x.usage)+'</p>':"")+(x.contrast?'<p class="grammar-contrast">日本語比較：'+safe(x.contrast)+'</p>':"")+'</div>':'<p class="muted">日本語の意味と使い方を思い出しましょう。</p>')+(s.flip?'<div class="flash-buttons"><button class="btn ghost" data-action="mem-grade" data-grade="0">↻ もう一度</button><button class="btn" data-action="mem-grade" data-grade="1">✓ 覚えた</button></div>':'<button class="btn wide" data-action="mem-flip">答えを表示</button>')+'</div><p class="small muted">覚えた '+s.known+' · 要復習 '+s.missed+'</p></div>';}
function finishedView(){let r=st.finished;return '<div class="quiz-shell"><div class="panel vocab-end"><div class="vocab-trophy">✓</div><h2>暗記ミッション完了！</h2><div class="stat-number">'+r.known+' / '+r.total+'</div><p class="muted small">記憶状態を保存しました。次回は苦手な項目を優先して学びます。</p><button class="btn" data-action="mem-stop">暗記表に戻る</button></div></div>';}
function render(){return st.study?cardView():st.finished?finishedView():st.section==="overview"?overview():categoryView();}
function click(b){const a=b.dataset.action;
if(a==="mem-overview"){st.section="overview";st.study=null;st.finished=null;return true;}
if(a==="mem-section"){if(!sections.some(x=>x.id===b.dataset.section))return false;st.section=b.dataset.section;st.level="all";st.category="all";st.query="";st.page=0;st.study=null;st.finished=null;return true;}
if(a==="mem-category"){st.category=b.dataset.category;st.page=0;return true;}
if(a==="mem-star"){const id=b.dataset.id;if(!map[id])return false;saved.favorites[id]=!saved.favorites[id];save();return true;}
if(a==="mem-page"){st.page=Math.max(0,st.page+Number(b.dataset.step||0));return true;}
if(a==="mem-start"){beginStudy(false);return true;}
if(a==="mem-start-due"){beginStudy(true);return true;}
if(a==="mem-flip"){if(st.study)st.study.flip=true;return true;}
if(a==="mem-grade"){let s=st.study;if(!s||!s.flip)return false;const x=map[s.ids[s.index]],yes=b.dataset.grade==="1";progress(x,yes);s.known+=yes?1:0;s.missed+=yes?0:1;s.index++;s.flip=false;if(s.index>=s.ids.length){st.finished={known:s.known,missed:s.missed,total:s.ids.length};st.study=null;}return true;}
if(a==="mem-stop"){st.study=null;st.finished=null;return true;}
return false;}
function change(input){switch(input.id){case "memory-level":st.level=input.value;st.category="all";st.page=0;return true;case "memory-category":st.category=input.value;st.page=0;return true;case "memory-star-only":st.starOnly=!!input.checked;st.page=0;return true;default:return false;}}
function input(e){if(e.id!=="memory-search")return false;st.query=e.value;st.page=0;renderRows();return true;}
function goSection(section){if(!sections.some(x=>x.id===section))section="overview";st.section=section;st.study=null;st.finished=null;st.page=0;}
function importData(obj){if(!obj||obj.version!==1||typeof obj.items!=="object"||typeof obj.favorites!=="object")return false;let next=mk();for(let x of all){const f=obj.items[x.id];if(f&&typeof f==="object"){const seen=Math.max(0,Math.min(100000,Number(f.seen)||0));next.items[x.id]={seen,known:Math.max(0,Math.min(seen,Number(f.known)||0)),stage:Math.max(0,Math.min(5,Number(f.stage)||0)),next:Math.max(0,Math.min(9999999999999,Number(f.next)||0))};}if(obj.favorites[x.id]===true)next.favorites[x.id]=true;}saved=next;save();return true;}
window.KBM={render,click,change,input,startDue:section=>{goSection(section);beginStudy(true);},afterRender:()=>{if(st.section==="vocab"){if(window.KBV)window.KBV.afterRender();}else renderRows();},goSection,section:()=>st.section,summary,getData:()=>JSON.parse(JSON.stringify(saved)),importData,reset:()=>{saved=mk();st.section="overview";st.study=null;st.finished=null;save();},dueFor:section=>all.filter(x=>x.section===section&&due(x)).length};
})();