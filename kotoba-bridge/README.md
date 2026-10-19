# ことばの橋 / Kotoba Bridge — Alpha v0.8.0

Japanese-first Korean grammar, vocabulary, and reading learning game, with a white/mint/teal visual system inspired by Hanja Lab. It is a separate application and will not overwrite Hanja Lab files or storage.

Live path: https://epicenterguy.github.io/doki_hanja/kotoba-bridge/

## Included
- 11 playable lessons, 84 independently authored questions, levels L0–L6
- Japanese explanations; grammar, vocabulary, Hangul and reading passage quizzes
- Course progression, 80% clear threshold, XP, daily ten-question missions
- Adaptive review intervals and a fifteen-question mini-exam (not an official TOPIK test)
- Searchable question dictionary, progress stats, local save, JSON export/import
- Responsive mobile, Fold, tablet and desktop layout
- Files: index.html, style.css, data.js, app.js, manifest.webmanifest

## Important limitations
Grade labels are learning goals, not official certificate predictions. Listening/speaking and production grading are deferred. The mini-exam does not cover the whole TOPIK specification. The question bank is a first sample and requires educational review before high-stakes use.

## Future
Complete beginner curricula, add multiple item types and proofread Japanese explanations, expand passages/word lists, add offline service worker and polished install icons. The local save key is different from Hanja Lab's, avoiding progress interference.

## v0.2 updates
- Compact six-tab mobile navigation uses SVG icons and short Japanese labels without forced line breaks.
- Japanese gloss vocabulary bank: 434 unique Korean lemma/phrase entries across L0-L6 and 11 thematic groups.
- Korean-to-Japanese and Japanese-to-Korean flashcard study, 4-choice recall, favorites, text search, topic/level filters.
- Spaced review stages, stored locally under `kotobaBridge.vocab.v1`.
- Combined JSON backup/export and import supports vocabulary state alongside quiz progress.
- Offline cache now includes the vocabulary database and study module.

## v0.2.1 content
- Six additional beginner lessons (48 multiple-choice/reading items), 17 total lessons and 132 questions.
- Better wording in grammar disambiguation; unique vocabulary quiz distractors.

## v0.3.0 UI architecture
- Home: three separate entrances for course study, memorization atlas, independent quiz arena.
- Course screen: level and course-subject filters for Hangul / grammar / vocabulary / reading.
- Memorization atlas: 434 word bank entries by POS (nouns, verbs, adjectives, adverbs, etc.), level and theme; 72 grammar cards by grammar type; 31 Hangul, 34 expression, and 27 numeral/measure cards.
- Each grammar/other category has searchable reference table with Japanese glosses, examples, favorites, and self-rated spaced flashcards.
- Quiz screen: subject and level filters, variable question count, separate vocabulary DB 4-choice and unofficial TOPIK mini drills.
- Grammar memorization state saved in a separate local namespace; JSON backup handles all progress (course, vocabulary, other memory).
- Mobile: six compact tabs, compact course cards, horizontal category chips, no overflowing memorandum tables.

## v0.4.0 content expansion
- Existing 434 vocabulary entries + 1012 deduplicated new entries = **1,446** vocabulary items, Japanese glosses, level and POS tagging.
- 122 curated two-language example sentences attach to dictionary entries (existing 20 were in v0.2, updated overlap counted separately).
- 58 additional grammar memory entries: 130 total, and detailed Japanese comparison notes on 22 frequently confusing grammatical patterns.
- 17 additional curriculum units and 136 handcrafted grammar/vocabulary/reading questions: **34 lessons and 268 practice questions** in total.
- Separate Japanese-to-Korean base-form written input quiz in the independent quiz menu, alongside 4-choice vocabulary practice.
- Versioned offline cache includes all new data. Original local progress keys are unchanged; save export and import continue to work.

Editorial note: the vocabulary size is a database target rather than a declaration of official TOPIK frequency or difficulty bands. Every new lesson and item should be subject to continued naturalness and alternate-answer review.

## v0.5.0 interactive learning
- **42 course units and 316 practice questions** including 8 interactive grammar construction units (24 ordering tasks, 24 target-error correction tasks).
- Sentence-building tokens are selected in order; error correction requires finding the correct replacement. Japanese feedback, results, and question-level spaced review persist in the existing progress save.
- **43 detailed grammar mini-guides** with form, usage and Japanese contrast in the atlas and lesson previews.
- **489 example-bearing word entries** (142 existing + 347 additional), each with Korean usage and Japanese translation. Total Korean vocabulary remains 1,446 items.
- Updated quiz filters include sentence ordering and sentence repair; responsive mobile layout for token board and grammar panels.
- Existing storage schemas and export/import remain backwards compatible. Vocabulary usage examples are not complete for all entries and are subject to continued review.

## v0.6.0 high-level lexicon
- Total Korean-to-Japanese lexical entries: **3,104** unique Korean forms. Levels: **L0 40 · L1 264 · L2 326 · L3 273 · L4 550 · L5 575 · L6 602 · L7 240 · L8 234**.
- L4 +296 news, practical social issues, education, medicine, climate, and culture; L5 +429 economics, public administration, scholarship, and argumentation; L6 +459 policy, scholarly analysis, philosophy, legal and research terms.
- New **L7**: 240 specialized theoretical and academic words; **L8**: 234 literary vocabulary, idioms, fine nuances, and mimetic expressions.
- **L7 and L8 are unofficial enrichment levels, NOT official TOPIK grades. TOPIK has only levels 1–6.** L4–L6 placement is a curated estimate of appropriate reading difficulty, not an official item-by-item TOPIK grade/frequency database or guarantee of actual exam appearance.
- Dynamic level filters with per-level vocabulary counts; L7/L8 introductory courses and 16 extra self-authored quizzes (44 units / 332 questions total); bidirectional flashcards, multiple-choice, typing recall and local progress remain supported.
- Further review of glosses, spacing, usage examples, and estimated grade placement is warranted before treating the content as authoritative lexicography.

## v0.7.0 — Core word gap remediation and grammar expansion
- Added **502 deduplicated** editorially curated Korean-Japanese lexical entries, emphasizing common verbs, modifiers, daily-life words, essay transitions, logic, public notices and quantitative-reading vocabulary. **Total: 3,606** entries.
- By level: L0 **40**, L1 **364**, L2 **465**, L3 **409**, L4 **604**, L5 **615**, L6 **635**, L7 **240**, L8 **234**. L7–L8 are nonofficial enrichment levels, not TOPIK grades.
- Dedicated vocabulary checkbox: **「試験対策の補強語彙」（独自選定）**, to focus the spaced flashcard list on these 502 new terms. This is **not** a set of confirmed past-exam items.
- Added **62 new grammar reference cards** across L1–L6, each with Japanese meaning, Korean example sentence, Japanese translation, conjugation/form, explanation and comparison. **192 total grammar cards**; 92 additional Hangul/expression/numeral cards remain.
- Added **8 original grammar/reading lesson units with 64 original questions**, for **52 total units / 396 questions**.
- Attached 124 additional Korean/Japanese example pairs to selected dictionary words, including a subset of the newly added entries.
- Earlier progress data uses stable IDs, unchanged local storage keys and original JSON backup/restore logic.
- **Source reference**: [National Institute of Korean Language 2003 learner vocabulary inventory](https://korean.go.kr/front/etcData/etcDataView.do?etc_seq=70&mn_id=46&pageIndex=19), **5,965 terms in A/B/C learner bands**; official [TOPIK past-paper practice](https://www.topik.go.kr/). This version uses independently authored glosses and **editorial selection**, not an exhaustive machine-verified difference against all 5,965 words or every TOPIK past paper. NIKL A/B/C bands are NOT mapped one-to-one to TOPIK level 1–6.
- **Editorial QA still needed**: review commonness, morphology, sense divisions, alternate answers, natural examples and past-paper attestations before claiming full coverage.

## v0.8.0 — L7/L8 grammar courses, full super-level examples and modifier expansion
- **3,714 distinct Korean lexical entries** (108 new words; 58 adjectives and 50 adverbs). All existing vocabulary IDs and saved progress keys remain intact.
- Example sentences with Japanese translations: **1,387** entries (previously 668). **L7: 240/240; L8: 234/234; L0: 40/40.** L1–L6 are not fully covered. Their respective example counts: L1 191/364, L2 244/478, L3 149/436, L4 144/628, L5 76/638, L6 69/656.
- Newly authored examples use the Korean term in context rather than merely mentioning its dictionary spelling. Existing authored examples are preserved.
- **42 added detailed grammar cards**: L7 21 academic/administrative argumentation constructions (standards, premises, evidence, exceptions); L8 21 literary, archaic and rhetorical constructions (historical endings, prayer, counterfactual/strong concession). **234 grammar items total**, plus 92 other reference cards.
- Four original L7/L8 grammar courses, 32 new multiple-choice/reading questions: **56 lesson units / 428 questions total**.
- L7 and L8 are **custom enrichment categories beyond TOPIK 6**, not official TOPIK grades. These archaic expressions are presented with register warnings and should not be used indiscriminately in normal conversation.
- Module-based additions keep original file names, progress keys, and PWA scope unchanged. All newly introduced files are added to the versioned service worker precache.
- Editorial QA: further review of individual high-level examples, lexical register, variants, and alternative quiz answers is recommended; example coverage is not complete for L1–L6.
