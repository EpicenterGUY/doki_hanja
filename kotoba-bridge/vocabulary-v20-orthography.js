/* v2.0 targeted spacing review: user-facing spelling, not a rewrite of stable keys.
 * Curated candidates: confirm against reference dictionaries during later native review.
 * A previously duplicated "도덕적해이" card is merged into "도덕적 해이".
 */
(function(){'use strict';
const proposed={"인구감소":"인구 감소","인구이동":"인구 이동","인구밀도":"인구 밀도","평균수명":"평균 수명","기대수명":"기대 수명","에너지효율":"에너지 효율","전력소비":"전력 소비","생태보호":"생태 보호","자연보호":"자연 보호","문화교류":"문화 교류","문화차이":"문화 차이","정신건강":"정신 건강","경쟁력강화":"경쟁력 강화","국내총생산":"국내 총생산","소비자물가":"소비자 물가","금리인상":"금리 인상","금리인하":"금리 인하","물가상승률":"물가 상승률","외환보유액":"외환 보유액","시범사업":"시범 사업","사회안전망":"사회 안전망","임금인상":"임금 인상","근로시간":"근로 시간","근로조건":"근로 조건","노동환경":"노동 환경","기술이전":"기술 이전","정보보호":"정보 보호","정보유출":"정보 유출","지식재산":"지식 재산","지식재산권":"지식 재산권","연구개발":"연구 개발","연구성과":"연구 성과","외국어교육":"외국어 교육","정체성형성":"정체성 형성","언어습관":"언어 습관","언어능력":"언어 능력","언어교육":"언어 교육","언어장벽":"언어 장벽","문화적응":"문화 적응","사례연구":"사례 연구","선행연구":"선행 연구","출처표기":"출처 표기","전문서적":"전문 서적","학술대회":"학술 대회","유전자변형":"유전자 변형","바이오산업":"바이오 산업","정보격차":"정보 격차","디지털격차":"디지털 격차","기술격차":"기술 격차","기초과학":"기초 과학","응용과학":"응용 과학","원천기술":"원천 기술","첨단기술":"첨단 기술","기계학습":"기계 학습","원격근무":"원격 근무","산업구조":"산업 구조","생산가능인구":"생산 가능 인구","타당성검토":"타당성 검토","사생활침해":"사생활 침해","개인정보보호":"개인정보 보호","사회적책임":"사회적 책임","윤리적책임":"윤리적 책임","외교적해법":"외교적 해법","공급망교란":"공급망 교란","통계적유의성":"통계적 유의성","부작용발생":"부작용 발생","연구방법론":"연구 방법론","상대적박탈감":"상대적 박탈감","입증책임":"입증 책임","입증책임전환":"입증 책임 전환","법적구속력":"법적 구속력","절차적정의":"절차적 정의","신뢰보호원칙":"신뢰 보호 원칙","불소급원칙":"불소급 원칙","명확성원칙":"명확성 원칙","베이즈추론":"베이즈 추론","언어이데올로기":"언어 이데올로기","언어상대성":"언어 상대성"};
const words=window.KB_VOCAB||[];
const byKo=new Map(words.map(w=>[w.ko,w]));
const sorted=Object.keys(proposed).sort((a,b)=>b.length-a.length);
const changes=[],notFound=[],collision=[];
let examplesCorrected=0;
for(const old of sorted){
  const target=proposed[old],w=byKo.get(old);
  if(!w){notFound.push(old);continue;}
  if(byKo.has(target)&&byKo.get(target)!==w){collision.push({old,target});continue;}
  w.displayKo=target;
  w.spellingNote='学習用の分かち書き案（辞書照合は継続中）';
  for(const field of ['exKo','altExampleKo']){
    const str=w[field];
    if(typeof str==='string'&&str.includes(old)){w[field]=str.split(old).join(target);examplesCorrected++;}
  }
  changes.push({id:w.id,from:old,to:target,level:w.level});
}
// Duplicate with distinct historical IDs: keep the canonical spaced record,
// migrate progress in the vocabulary UI rather than dropping saved user data.
const old=byKo.get('도덕적해이'),canonical=byKo.get('도덕적 해이');
const merged=[];
if(old&&canonical&&old!==canonical){
 canonical.level='L6';
 const at=words.indexOf(old);if(at>=0)words.splice(at,1);
 window.KB_VOCAB_ID_ALIASES=Object.assign({},window.KB_VOCAB_ID_ALIASES||{},{[old.id]:canonical.id});
 merged.push({fromId:old.id,toId:canonical.id,word:canonical.ko});
}
window.KB_ORTHOGRAPHY_REVIEW={candidates:sorted.length,applied:changes.length,examplesCorrected,changes,notFound,collision,merged};
})();
