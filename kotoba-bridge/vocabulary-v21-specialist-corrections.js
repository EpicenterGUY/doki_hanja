/* v2.1 carefully scoped upward correction of truly technical early-stage entries.
 * Does not affect IDs or saved user progress. */
(function(){'use strict';
const proposals={"합리적이다":{"to":"L4","reason":"Abstract evaluative adjective beyond basic social conversation"},"부적절하다":{"to":"L4","reason":"Formal negative evaluation common in advanced expository contexts"},"강의계획서":{"to":"L4","reason":"Academic course-document terminology"},"졸업요건":{"to":"L4","reason":"University administrative requirement"},"초기화하다":{"to":"L4","reason":"Technical reset operation rather than general daily verb"},"유효기간":{"to":"L4","reason":"Administrative validity-period term"},"협의하다":{"to":"L4","reason":"Formal collaborative negotiation register"},"채권":{"to":"L5","reason":"Financial or legal bond/credit sense"},"증권":{"to":"L5","reason":"Financial securities terminology"},"인플레이션":{"to":"L5","reason":"Macroeconomic technical vocabulary"},"시장경제":{"to":"L5","reason":"Economic-system terminology"},"관료제":{"to":"L6","reason":"Political-administrative theory terminology"},"임상시험":{"to":"L6","reason":"Specialized medical research procedure"},"유전자변형":{"to":"L6","reason":"Technical biotechnology modifier"},"생명공학":{"to":"L6","reason":"Specialized biotechnology discipline"},"국정감사":{"to":"L6","reason":"Korean legislative oversight procedure"},"산업재해":{"to":"L5","reason":"Occupational-safety institutional term"},"해석학":{"to":"L7","reason":"Specialized philosophical discipline"},"표준편차":{"to":"L6","reason":"Statistical dispersion measure"},"신뢰구간":{"to":"L6","reason":"Statistical inference concept"}},order=['L0','L1','L2','L3','L4','L5','L6','L7','L8'];
const byKo=new Map((window.KB_VOCAB||[]).map(w=>[w.ko,w]));
const changed=[],notChanged=[],notFound=[];
for(const [ko,cfg] of Object.entries(proposals)){
 const w=byKo.get(ko);
 if(!w){notFound.push(ko);continue;}
 if(order.indexOf(w.level)<order.indexOf(cfg.to)){
    changed.push({id:w.id,ko,from:w.level,to:cfg.to,reason:cfg.reason});
    w.level=cfg.to;w.gradeReview='editorial-v21';w.gradeReason=cfg.reason;
 }else notChanged.push(ko);
}
window.KB_V21_SPECIALIST_STATS={proposed:Object.keys(proposals).length,applied:changed.length,changed,notChanged,notFound};
})();
