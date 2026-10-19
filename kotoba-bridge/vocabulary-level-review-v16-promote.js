/* High-confidence upward difficulty corrections, from initial beginner/mid placements.
 * Do not relabel all words with a blanket grammar/frequency heuristic.
 */
(function(){'use strict';
const levels=['L0','L1','L2','L3','L4','L5','L6','L7','L8'];
const proposed={"눈썹":"L2","몸무게":"L2","이모":"L2","고모":"L2","개찰구":"L3","직진하다":"L3","확실하다":"L3","특이하다":"L3","독특하다":"L3","입금하다":"L3","의심하다":"L3","불확실하다":"L4","부자연스럽다":"L4","충격적이다":"L4","분석하다":"L4","주장하다":"L4","표본집단":"L5","비교분석":"L5","결과분석":"L5"};
const byKo=new Map((window.KB_VOCAB||[]).map(w=>[w.ko,w]));
const changes=[],notFound=[];
for(const [ko,to] of Object.entries(proposed)){
 const w=byKo.get(ko);
 if(!w){notFound.push(ko);continue;}
 if(levels.indexOf(w.level)<levels.indexOf(to)){
   changes.push({id:w.id,ko,from:w.level,to});
   w.level=to;
   w.gradeReview='curated-2026-v16';
 }
}
window.KB_GRADE_PROMOTION={proposals:Object.keys(proposed).length,applied:changes.length,changes,notFound};
})();
