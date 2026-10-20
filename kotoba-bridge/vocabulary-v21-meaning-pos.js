/* Reviewed meaning / part-of-speech usage, preserve stable identity and bilingual examples.
 * Review flags are explicit for unusual forms; avoid declaring a dictionary certification.
 */
(function(){'use strict';
const corrections={"보통":{"ko":"보통","pos":"副詞","posAlternate":"名詞","ja":"ふつう・普段（副詞）／普通（名詞）","note":"例文の「보통 ～하다」は副詞的用法。名詞の「普通」としても使われます。"},"불가분의":{"ko":"불가분의","pos":"表現","note":"「불가분（不可分）」＋助詞「의」。独立した冠形詞ではなく連語表現です。"},"유의미하다":{"ko":"유의미하다","ja":"有意義だ・意味がある／統計では「有意だ」","note":"一般的には「意味がある」。統計の文脈では「統計的に有意だ」を区別します。"},"주관적":{"ko":"주관적","ja":"主観的（な）","note":"「주관적 판단／주관적인 판단」のように名詞的・連体修飾的に用います。"},"종합적":{"ko":"종합적","ja":"総合的（な）","note":"「종합적 검토／종합적인 검토」。語幹に「이다」を付けた用法とも区別します。"},"실증적":{"ko":"실증적","ja":"実証的（な）","note":"「실증적 자료／실증적인 분석」などの連体修飾でよく使います。"},"피상적":{"ko":"피상적","ja":"表面的（な）・浅薄（な）","note":"単に見える表面という意味より、理解が浅いという評価を伴う場合があります。"},"이분법적":{"ko":"이분법적","ja":"二分法的（な）","note":"「이분법적인 판단」のように、二つだけに分けて考える様子を表します。"},"기인되다":{"ko":"기인되다","ja":"起因する（「기인하다」を優先）","note":"「기인하다」が学習上の推奨形。受動形に見える「기인되다」は用法を辞書で再検討中です。","review":true},"귀속하다":{"ko":"귀속하다","ja":"帰属する（法・経済の文章語）","note":"「利益が法人に 귀속하다」のように自動詞的な用法です。対格を伴う場合は「귀속시키다」と区別します。"},"대두하다":{"ko":"대두하다","ja":"台頭する・浮上する（文章語）","note":"「問題が 대두하다／대두되다」。表現の選択は文体やコロケーションによります。"},"어불성설이다":{"ko":"어불성설이다","pos":"表現","ja":"話にならない・道理に合わない","note":"「어불성설（語不成説）」にコピュラが付いた形。形容詞の辞書形と同一視しないでください。","review":true}};
const byKo=new Map((window.KB_VOCAB||[]).map(w=>[w.ko,w]));
const changed=[],notFound=[],review=[];
for(const [ko,c] of Object.entries(corrections)){
 const w=byKo.get(ko);
 if(!w){notFound.push(ko);continue;}
 const previous={pos:w.pos,ja:w.ja};
 if(c.pos)w.pos=c.pos;
 if(c.posAlternate)w.posAlternate=c.posAlternate;
 if(c.ja)w.ja=c.ja;
 w.lexicalNote=c.note;
 w.lexicalReviewed='editorial-v21';
 if(c.review){w.lexicalNeedsDictionaryCheck=true;review.push(ko);}
 changed.push({id:w.id,ko,from:previous,to:{pos:w.pos,ja:w.ja}});
}
window.KB_V21_LEXICAL_STATS={proposed:Object.keys(corrections).length,applied:changed.length,changed,notFound,review};
})();
