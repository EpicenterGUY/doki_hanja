/* v1.12: verified early-learner POS adjustments and polysemy contrasts.
 * Official NIKL examples: suffix -쯤; grammar of adnominal phrases;
 * Korean education vocabulary "이번" (noun); 맞추다 vs 맞히다.
 * Keep IDs and existing examples; add contrast explanations.
 */
(function(){'use strict';
const reviewed={"이번":{"pos":"名詞","ja":"今回・今度","senseNote":"「이번」は名詞。『이번 주』のように名詞の前にも置けますが、単に冠形詞と分類するのは不正確です。","altExampleKo":"이번에는 꼭 약속을 지킬게요.","altExampleJa":"今回は必ず約束を守ります。"},"쯤":{"pos":"接尾辞","ja":"～ごろ・～くらい","displayKo":"-쯤","senseNote":"接尾辞「-쯤」は名詞・名詞句の後ろに付けて書きます。「내일쯤」「세 시쯤」など。助詞ではありません。","altExampleKo":"세 시쯤 역 앞에서 만나요.","altExampleJa":"三時ごろ駅の前で会いましょう。"},"불가분의":{"pos":"表現","senseNote":"「불가분」という名詞に助詞「의」が付いた連語。名詞を修飾しても、独立した冠形詞とは扱いません。","altExampleKo":"교육과 문화는 불가분의 관계에 있어요.","altExampleJa":"教育と文化は不可分の関係にあります。"},"맞추다":{"ja":"合わせる・調整する・照合する","senseNote":"「맞추다」＝合わせる・調整する・照合する。クイズの正解を当てるのは別の動詞「맞히다」。","altExampleKo":"시험이 끝난 뒤 친구와 답을 맞춰 봤어요.","altExampleJa":"試験後に友達と答えを照合してみました。"},"한편":{"senseNote":"名詞では「片方・一方」。文頭で「一方、～」「その一方で～」と話題を転換する接続表現にもなります。","altExampleKo":"한편, 다른 연구에서는 반대의 결과가 나왔어요.","altExampleJa":"一方、別の研究では反対の結果が出ました。"},"바람":{"ja":"風・願い","senseNote":"「風」の바람と、「願い・望み」を表す바람は同じつづりです。文脈で判断します。","altExampleKo":"가족의 건강이 저의 가장 큰 바람이에요.","altExampleJa":"家族の健康が私の一番の願いです。"},"개":{"senseNote":"このカードの中心義は「犬」。数を数える「～個」の개は、同じ形でも数を表す単位語です。","altExampleKo":"사과 두 개를 샀어요.","altExampleJa":"リンゴを二個買いました。"},"사이":{"ja":"間・仲・関係","senseNote":"場所や時間の「間」のほか、人間関係の「仲」という意味があります。","altExampleKo":"두 친구는 요즘 사이가 좋아졌어요.","altExampleJa":"二人の友達は最近仲が良くなりました。"},"주다":{"ja":"与える・あげる・くれる","senseNote":"「주다」は視点・相手によって「あげる／くれる」。補助動詞「-아/어 주다」は『～してあげる／くれる』。","altExampleKo":"친구가 어려운 문제를 설명해 줬어요.","altExampleJa":"友達が難しい問題を説明してくれました。"},"살다":{"senseNote":"「住む（居住）」と「生きる（生活・生存）」の意味があります。","altExampleKo":"사람은 혼자서만 살 수는 없어요.","altExampleJa":"人は一人だけで生きていくことはできません。"},"잡다":{"ja":"つかむ・取る・決める","senseNote":"物を『つかむ』ほか、『날짜를 잡다』で日程を決めることも表します。","altExampleKo":"다음 모임 날짜를 잡았어요.","altExampleJa":"次の集まりの日程を決めました。"},"놓다":{"ja":"置く・放す","senseNote":"『置く』に加えて、つかんでいたものから手を『放す』という意味があります。","altExampleKo":"위험하니까 그 줄을 놓지 마세요.","altExampleJa":"危ないのでそのロープを放さないでください。"},"싸다":{"senseNote":"このカードは形容詞『安い』です。別の動詞『싸다』には『包む』という意味があります。","altExampleKo":"선물을 예쁜 종이로 쌌어요.","altExampleJa":"プレゼントをきれいな紙で包みました。"},"달다":{"senseNote":"このカードは形容詞『甘い』です。動詞『달다』には『付ける・吊るす』という意味もあります。","altExampleKo":"벽에 작은 시계를 달았어요.","altExampleJa":"壁に小さな時計を取り付けました。"},"쉬다":{"senseNote":"ここでの『쉬다』は『休む』。同形の動詞は『息をする』『声がかれる』にも使われます。","altExampleKo":"감기에 걸려서 목이 쉬었어요.","altExampleJa":"風邪をひいて声がかれました。"},"표":{"ja":"切符・票・表","senseNote":"「切符」「投票の票」のほか、情報を行列にまとめた「表」の意味もあります。","altExampleKo":"표를 보면 연도별 변화가 보여요.","altExampleJa":"表を見ると年ごとの変化が分かります。"},"못":{"senseNote":"このカードは否定の副詞『うまく～できない』。同じつづりの名詞『못』には『釘』という意味があります。","altExampleKo":"벽에 못을 박았어요.","altExampleJa":"壁に釘を打ちました。"},"안":{"senseNote":"このカードの『안』は否定を表す副詞です。名詞の『안』は『内側・中』を意味します。","altExampleKo":"가방 안에 지갑이 있어요.","altExampleJa":"かばんの中に財布があります。"},"밝다":{"senseNote":"光が『明るい』ことに加え、性格・表情が明るいという意味にも使えます。","altExampleKo":"그 학생은 표정이 밝고 친절해요.","altExampleJa":"その学生は表情が明るく親切です。"},"타다":{"senseNote":"このカードは『乗る』です。同形の動詞『타다』には『燃える・焦げる』という意味もあります。","altExampleKo":"오븐에 넣은 빵이 탔어요.","altExampleJa":"オーブンに入れたパンが焦げました。"},"떨어지다":{"ja":"落ちる・落第する","senseNote":"位置から『落ちる』ほか、『시험에 떨어지다』は試験に落ちる・不合格になるという意味です。","altExampleKo":"이번 면접에서 떨어졌어요.","altExampleJa":"今回の面接に落ちました。"},"열다":{"ja":"開ける・開く・開催する","senseNote":"扉を『開ける』ほか、会議や行事を『開催する』ことも表します。","altExampleKo":"학교에서 설명회를 열었어요.","altExampleJa":"学校で説明会を開きました。"},"맞다":{"senseNote":"『正しい・合う』と『当たる』などの用法があります。『맞추다』と『맞히다』も混同しないよう注意。","altExampleKo":"계산 결과가 예상과 맞았어요.","altExampleJa":"計算結果が予想と合っていました。"}};
const words=window.KB_VOCAB||[];
const result={candidates:Object.keys(reviewed).length,applied:0,changes:[],missing:[],addedWords:[]};
for(const [ko,patch] of Object.entries(reviewed)){
 const w=words.find(x=>x.ko===ko);
 if(!w){result.missing.push(ko);continue;}
 const fields=[];
 for(const [k,value] of Object.entries(patch)){
   if(w[k]!==value){w[k]=value;fields.push(k);}
 }
 w.meaningReviewed='v1.12';
 result.changes.push({id:w.id,ko,fields});
 result.applied++;
}
if(!words.some(w=>w.ko==='맞히다')){
 const entry={id:'kbv22-match-answer',ko:'맞히다',ja:'当てる・正解する',pos:'動詞',level:'L2',category:'学習',exKo:'퀴즈에서 정답을 세 개 맞혔어요.',exJa:'クイズで正解を三つ当てました。',sourceClass:'editorial-priority',exampleOrigin:'curated',senseNote:'正解や的を当てる「맞히다」。合わせたり照合したりする「맞추다」と区別します。'};
 words.push(entry);result.addedWords.push(entry.ko);
}
window.KB_V22_POS_SENSE_AUDIT=result;
})();
