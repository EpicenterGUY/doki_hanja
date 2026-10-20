/* v1.11 bilingual meaning disambiguation: explicitly reviewed headword senses.
   Preserve stable ko/id/level, change only pedagogical gloss, sample and notes.
   References: NIKL Korean Basic Dictionary (유의하다 / 대두하다),
   NIKL Online Q&A (2026-04-20), AKS verb corpus (기인되다/기인하다).
 */
(function(){'use strict';
const reviewed={"유의하다":{"ja":"（統計）有意だ／意味がある","pos":"形容詞","exKo":"두 집단의 차이는 통계적으로 유의해요.","exJa":"二つの集団の差は統計的に有意です。","senseNote":"有意하다（形容詞）＝有意だ・意味がある。別語の留意하다（動詞）＝注意する。同じつづりでも品詞と意味が異なります。","altExampleKo":"자료를 해석할 때 한계에 유의해야 해요.","altExampleJa":"資料を解釈する際は限界に留意すべきです。"},"유의미하다":{"ja":"意味がある・意義がある／（統計）有意である","senseNote":"一般には「意味がある・意義がある」。統計の文脈で「統計的に有意」を指すことがあります。","altExampleKo":"이번 프로젝트는 저에게 유의미한 경험이었어요.","altExampleJa":"今回のプロジェクトは私にとって意味のある経験でした。"},"기인하다":{"senseNote":"原因を示す文章語。主に「~에/에서 기인하다」（～に／から起因する）。","altExampleKo":"교통 체증은 갑작스러운 폭우에 기인했어요.","altExampleJa":"交通渋滞は突然の豪雨に起因しました。"},"기인되다":{"senseNote":"「기인하다」と意味が近い受身的な形。辞書・研究資料にも用例があります。書くときは原因を表す助詞も確認しましょう。","altExampleKo":"사고는 관리 부실에서 기인된 것으로 조사됐어요.","altExampleJa":"事故は管理不足に起因したものと調査されました。"},"대두하다":{"senseNote":"「問題・意見などが新たに現れる」を表す動詞。韓国語基礎辞典に掲載されています。","altExampleKo":"새로운 문제가 사회적 쟁점으로 대두했어요.","altExampleJa":"新たな問題が社会的な争点として浮上しました。"},"귀속하다":{"senseNote":"財産・権利・責任などが一定の主体に属すること。「~에 귀속하다」を使います。"},"귀속되다":{"senseNote":"「帰属する」と訳せます。「귀속하다」との文型や用例も比較しましょう。"},"종합적":{"senseNote":"「종합적」は名詞としての用法（総合的なもの）。「종합적이다」は形容詞的な述語形として別カードにあります。"},"주관적":{"senseNote":"「주관적」は名詞としての用法（主観的なもの）。「주관적이다」と表す述語用法とは区別しましょう。"},"공시":{"ja":"（企業）情報開示・（制度）公示","senseNote":"財務情報を公表する場合は「情報開示」、法律や行政の文脈では「公示」など、用途に応じて訳します。","altExampleKo":"관련 규정에 따라 허가 내용을 공시했어요.","altExampleJa":"関連規定に従って許可内容を公示しました。"},"감사":{"ja":"監査","senseNote":"このカードは「감사（監査）」です。同じ表記の「감사（感謝）」とは別義です。","altExampleKo":"도움을 준 분께 감사의 뜻을 전했어요.","altExampleJa":"助けてくれた方に感謝の気持ちを伝えました。"},"기대수명":{"ja":"平均余命・期待寿命","senseNote":"「기대 수명」はある年齢の人が今後生きると期待される年数。出生時について言う場合は平均寿命と近い意味になります。"},"평균수명":{"ja":"平均寿命","senseNote":"多くの場合、出生時の平均余命を指します。単なる算術平均と混同しないようにしましょう。"},"상관관계":{"senseNote":"「相関関係」があっても、それだけで原因と結果（인과관계）が立証されるわけではありません。"},"인과추론":{"senseNote":"データから原因と結果の関係を推論すること。相関だけでは因果を証明できません。"}};
const rows=window.KB_VOCAB||[],seen=new Set(),changes=[],missing=[];
for(const w of rows){
  const patch=reviewed[w.ko];
  if(!patch)continue;
  const edits=[];
  for(const [field,value] of Object.entries(patch)){
    if(w[field]!==value){w[field]=value;edits.push(field);}
  }
  w.meaningReviewed='v1.11';
  seen.add(w.ko);
  changes.push({id:w.id,ko:w.ko,level:w.level,fields:edits});
}
for(const key of Object.keys(reviewed)){if(!seen.has(key))missing.push(key);}
window.KB_V21_SENSE_AUDIT={candidates:Object.keys(reviewed).length,applied:changes.length,changes,missing};
})();
