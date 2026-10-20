# ことばの橋 / Kotoba Bridge — Alpha v1.14.0

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

## v0.9.0 — Major balanced vocabulary and contextual examples
- **4,427 unique Korean entries** (up from 3,714): **713 new nonduplicate entries** in L1–L8, each with a Korean contextual sample sentence and a Japanese translation.
- Stage totals: **L0 40, L1 387, L2 507, L3 472, L4 699, L5 711, L6 727, L7 474, L8 410**. L7/L8 remain independently designed unofficial enrichment levels above TOPIK 6, not recognized exam levels.
- L7 **474 words**: 180 nouns, 100 verbs, 78 adjectives, 64 adverbs, 52 expressions. L8 **410 words**: 91 nouns, 91 verbs, 83 adjectives, 79 adverbs, 66 expressions. L8 is now substantially more balanced among major parts of speech; L7 remains specialist noun-heavy.
- L4–L6 gained new intermediate-advanced modifiers, academic collocations, policy and public-affairs reading phrases; POS balance is still work in progress due to the large legacy noun banks.
- **Example-bearing entries: 2,285 / 4,427** (+898 since v0.8: 713 examples on new entries and 185 matched previously uncovered dictionary entries). **2,142 entries still need examples**. Examples are independently authored; they are not verified extracts from official past exams.
- Vocabulary memorization now displays example coverage and a **「例文未収録のみ」** filter to locate the remaining gaps. Preserves saved cards and progress under existing localStorage IDs; no reset or migration.
- Existing **234 grammar references**, **56 course lessons** and **428 practice questions** remain available.
- All additional scripts are included in the v0.9.0 PWA offline precache; cached-site reload may be needed to see the new lexicon.
- Editorial caution: Although code validation checks uniqueness and structural integrity, not every gloss, level estimate or usage example has undergone exhaustive independent native-speaker review. Never assume every entry has actually appeared in TOPIK; TOPIK has no official L7 or L8 grade.

## v1.0.0 — Progressive upper-level vocabulary and example completion
- **4,823 distinct Korean entries**, **396 newly added** (+43 L4, +54 L5, +63 L6, +100 L7, +136 L8). All new entries have full Korean usage sentence + Japanese translation. Growth *increment* rises with difficulty; absolute L7/L8 counts still need further expansion.
- By level: **L0 40, L1 387, L2 507, L3 472, L4 742, L5 765, L6 790, L7 574, L8 546**. L7/L8 are **unofficial post-TOPIK enrichment levels**.
- Examples now available for **3,009 of 4,823** words, up by **724** from v0.9.0 (396 new-word examples and 328 hand-curated examples on previously uncovered entries).
- Still without a full Korean/Japanese example pair: **1,814 entries** (not presented as complete coverage).
- New lexical themes: L4 public administration and practical procedures; L5 economics, public policy, demographics; L6 advanced legal/academic inference; L7 linguistics, epistemology, methodology; L8 literary prose, expressive verbs, mimetics and idioms.
- New files are loaded before the independent original and backfill example modules, preserving previous entries and long-lived localStorage keys. v1.0.0 scripts are included in the scoped service worker cache.
- Prior original curriculum **234 grammar reference cards / 56 lessons / 428 practice questions** retained.
- Editorially authored material: grade assignment is heuristic, Japanese glosses and usage sentences are not guaranteed to be native-proofread or official TOPIK exam appearances. Very rare forms in L7/L8 are meant for reading recognition rather than ordinary conversation.

## v1.1.0 — Scaled difficulty ladder through L8
- **5,440 distinct vocabulary cards**, +617 new entries. Breakdown new: L3 +60, L7 +253, L8 +304. Each added card has an authored Korean example and Japanese translation. Existing words are not duplicated.
- Per stage, increasingly larger pools: **L0 40 · L1 387 · L2 507 · L3 532 · L4 742 · L5 765 · L6 790 · L7 827 · L8 850**. L7 and L8 finally exceed the L6 word count.
- Usage sentences now included for **3,670 of 5,440 vocabulary cards** (+661: 617 added terms plus 44 genuine previously missing examples). **1,770 remaining entries are still missing complete bilingual examples**.
- L7 additions: experimental methods, quantitative analysis, philosophy, linguistics, philology, literary criticism. L8 additions: Korean nature and traditional scenery, nuanced psychological verbs, introspective narrative expressions, literary nouns and idioms.
- Filled L3 gaps with genuine campus/academic scheduling, communication and digital-life vocabulary to make stage sizes monotonically increasing.
- All additions are original educational content, **not a claim that every card appeared in a past TOPIK examination**. L7–L8 are unofficial post-TOPIK tiers and contain rare academic and literary registers, intended chiefly for reading recognition. Japanese glosses, level assignments, and sentences are not all independently native-checked.
- Existing **234 grammar references, 56 lessons, and 428 practice questions** remain unchanged. Local saved review data keys and progress identifiers remain stable. PWA precache has been versioned to v1.1.0 and includes all six new script files.

## v1.2.0 — L1–L6 contextual examples, Japanese grammar comparisons, and local QA
- Added **201 original Korean/Japanese example-pair candidates** targeting existing L1–L6 vocabulary cards. The supplemental script fills **only entries without both example fields**, so the number of newly covered cards may be lower than 201; it never overwrites an existing pair.
- Added **18 independent grammar comparison cards** across L1–L6, covering giving/receiving, desire, permission, difficulty, indirect questions, contrast, concession, cause, argumentation, and academic prose. They include Korean contextual examples, Japanese translations, usage, form and comparisons. This raises the grammar reference bank from **234 to 252**, with unchanged lesson and quiz counts.
- New `audit-data.cjs` computes **actual** example coverage, grade/POS distributions, duplicate Korean entries and IDs, and incomplete bilingual pairs from the exact script order in `index.html`. Run **`node kotoba-bridge/audit-data.cjs`** after cloning the repository (or append `--json` for machine-readable results).
- App boot sequence includes the new modules; scoped service-worker cache and asset query versions updated to **v1.2.0** to pick up data updates. Existing localStorage keys, vocabulary IDs, and learning records are preserved.
- Educational data is original/editorially curated, not guaranteed to appear in an actual TOPIK paper; L7/L8 are not official TOPIK levels. Further manual review, especially naturalness and vocabulary-grade placement, remains necessary.

## v1.3.0 — Targeted L1–L6 example remediation & L4–L6 POS balance
- **177 additional, independently authored Korean/Japanese contextual example candidates**. The new module applies examples to already-existing entries **only if neither example field is populated**. Existing example pairs and progress IDs are not overwritten; some candidates overlap old content and therefore will not all result in an increase.
- **63 proposed POS-balanced L4–L6 vocabulary entries**, 21 per stage with emphasis on verbs, adjectives, and adverbs, each with an example/translation. The expansion loader deduplicates by Korean spelling; the precise number of new unique cards should be read from the audit script's `v13Vocabulary.added` output rather than inferred from the candidate count.
- `audit-data.cjs` now tracks the two new modules' applied counts, full-level example coverage, POS counts, structural anomalies, and assets missing from the PWA offline precache. To see the actual numbers: `node kotoba-bridge/audit-data.cjs --json`.
- Added v1.3 scripts to `index.html` and `sw.js`, and bumped script cache-busting versions + PWA cache to **v1.3.0**. Stable saved progress keys and existing vocabulary IDs remain unchanged.
- **Editorial caution**: All proposed vocabulary gradings are estimates. Native-speaker proofreading, usage-sense checks, and true TOPIK exam matching are not completed. L7–L8 are unofficial extension tiers.

## v1.4.0 — Example-gap backfill and accurate diagnostics
- Added **349 independently authored Korean/Japanese contextual example pairs as candidates**, selected against previously missing vocabulary headwords from existing beginner, intermediate and advanced banks. As in prior content packs, **only cards without both existing examples are filled**; the resulting increase must be read from the runtime audit's `v14Examples.applied`, not equated automatically with 349.
- Covered high-priority learner verbs and daily-life nouns at L1–L2, technology/communication and study vocabulary at L3, social/economics data at L4, formal reporting/argumentation at L5 and L6 reading phrases.
- Improved `audit-data.cjs`: fixed PWA-cache script detection (previously over-escaped regular expression) and added `--missing` for an exhaustive list of currently unillustrated words by level, along with precise v1.4 application statistics in normal and `--json` output.
- Updated page script versions and the scoped service-worker cache to v1.4.0. Existing vocabulary and grammar item IDs, progress localStorage namespaces, and previous bilingual examples remain unchanged.
- **Important:** the full end-to-end audit has to be run in the repository's Node environment and native-speaker proofreading is ongoing. These educational levels are not individually certified TOPIK word grades. L7 and L8 are independently designed post-TOPIK reading extension tiers.

## v1.5.0 — L1–L6 headword example completion and coverage instrumentation
- Added **249 original Korean/Japanese contextual example candidates**, in two modules: **162** in `vocabulary-v15-core-completion.js` (L1–L3) and **87** in `vocabulary-v15-advanced-completion.js` (L4–L6). These focus on headwords previously identified as lacking illustrated usage in major baseline vocabulary banks.
- The new backfills only populate empty Korean+Japanese example pairs; they do **not** overwrite a pre-existing example, modify saved vocabulary IDs, or increase counts by inventing duplicate cards. Because other modules may have supplied an example earlier, the *actual applied counts may be lower* than the candidate totals.
- The updated offline-scoped PWA includes both new modules and bumps all asset versions to **v1.5.0**. The Epicenter project registry was updated.
- The local Node audit `node kotoba-bridge/audit-data.cjs --json` reports **actual** unique vocabulary card count, grammar card count, global bilingual example coverage (percent), per-level counts and parts-of-speech distribution, missing bilingual pairs, and the applied counts of all v1.2–v1.5 content packs. Use `node kotoba-bridge/audit-data.cjs --missing` for the exact remaining Korean words without examples by level.
- **Editorial caution:** Grade mapping is a study difficulty estimate, and new Korean/Japanese pairs have not all been independently native-proofread. L7/L8 are custom, unofficial reading-enrichment levels beyond official TOPIK 6.

## v1.5.1 — Learner-facing per-level coverage dashboard
- Added a compact, **collapsed-by-default** bilingual example coverage table to the vocabulary atlas (`vocab-ui.js`). It derives each stage's total vocabulary, complete Korean/Japanese example pairs and remaining uncovered cards directly from loaded runtime data. No hardcoded or outdated totals.
- Released all cache-busted assets at **v1.5.1** (including `vocab-ui.js`) and bumped the service worker cache, so existing offline installs can pick up the new coverage display without resetting study progress.
- CI audit now checks the syntax of every Kotoba Bridge root JS file and publishes both the exact per-level audit and missing-lemma JSON as artifacts, with a readable summary in the GitHub Actions run when successful.
- The source-level code and cache declarations have been checked; actual browser interaction testing and the execution of CI results have not been independently verified in this development pass.

## v1.6.1 — Whole-bank grade calibration and contextual-meaning review (2026-10-20)
- Replayed **all 48 vocabulary data modules** in the same order as the deployed page, including de-duplication, grade patches and example backfills. The resulting bank is **5,463 unique vocab cards** with no duplicate Korean spelling or card ID and no missing basic Japanese gloss.
- Applied **263 downward** and **19 upward** level corrections (**282** total) while preserving original card IDs, example content and local study progress. The rules distinguish early everyday words from academic/technical terms and avoid treating all words used in literary prose as L8 words. There is **no official word-to-TOPIK-level authority** for each entry. L7/L8 remain unofficial extension stages.
- Applied **149 newly authored bilingual Korean/Japanese example pairs** to genuinely uncovered words. Current complete coverage: **4,489 / 5,463 cards (82.17%)**. Remaining **974**: L4 **232**, L5 **356**, L6 **386**; all other levels have complete example fields.
- Added **16 targeted polysemy notes** and contrast examples in Japanese, visible in vocabulary list and flashcards (e.g. `차`, `말`, `눈`, `사과`).
- Added more data-quality reporting in `audit-data.cjs`: actual level changes, upward review, polysemy coverage, full POS and grade distributions, suspicious dictionary-form fields, normalized spacing collisions, and actual v1.6 example additions. CI checks all JavaScript syntax and archives machine-readable reports.
- Versioned page references + PWA precache as **v1.6.1**. All existing localStorage namespaces and progress IDs are unchanged.
- Full reproducible summary: [Quality Audit 2026-10-20](./QUALITY-AUDIT-2026-10-20.md). Naturalness of every Japanese translation and textbook matching still requires further human editorial review.

## v1.7.0 — Verified L4–L6 bilingual example coverage expansion
- Added **270 hand-authored Korean/Japanese contextual usage pairs** across L4 (**98**), L5 (**89**), and L6 (**83**). A complete reproduction of the app's vocabulary script order confirmed **all 270 applied**, without overwriting previous examples.
- The live effective lexicon remains **5,463 unique Korean headwords** with no duplicate IDs, duplicate Korean headwords or half-translated example pairs.
- Current fully illustrated vocabulary: **4,759 / 5,463 (87.11%)**, an increase from **4,489 (82.17%)** at v1.6.1. Missing pairs are now **704**: L4 **134**, L5 **267**, L6 **303**. All L0–L3 and L7–L8 vocab cards have complete example fields.
- The new scripts are `vocabulary-v17-l4-context.js`, `vocabulary-v17-l5-context.js`, and `vocabulary-v17-l6-context.js`; `index.html` and the scoped PWA cache version have been updated to **v1.7.0**.
- The local quality audit includes `v17L4`, `v17L5`, and `v17L6` applied counters. Run `node kotoba-bridge/audit-data.cjs --json` and `node kotoba-bridge/audit-data.cjs --missing` to reproduce the current statistics.
- This material is editorially authored; grade placements are estimated for learning rather than official TOPIK word-by-word labels. Complete example fields do **not** imply independent native-speaker validation of every example or Japanese translation.

## v1.8.0 — All L4 example fields complete, further L5–L6 remediation
- Audited exact missing Korean-Japanese pairs and added **341 fully authored bilingual example pairs**, all verified to be assigned to genuinely missing source cards: **L4 134**, **L5 99**, **L6 108**. Old examples and stable study IDs are untouched.
- Complete example fields now cover **5,100 / 5,463 cards (93.36%)**, up from 4,759 (87.11%). **L4 is now 844/844 (100%)**, alongside L0–L3 and L7–L8. Remaining **363** unillustrated cards: **L5 168**, **L6 195**.
- Modules: `vocabulary-v18-l4-completion.js`, `vocabulary-v18-l5-research.js`, `vocabulary-v18-l6-social-theory.js`. Page, script cache-busters and offline service-worker cache upgraded to **v1.8.0**.
- The repo audit and GitHub Actions summary track the actual applied counts of all v1.8 files. An explicit regression guard rejects future introduction of example-free cards in levels already completed (L0–L4 and L7–L8).
- Confirmed no duplicate base Korean headwords, no duplicate card IDs, and no one-sided bilingual example pairs after loading the entire data pipeline. Some bilingual pairs and level labels remain pending native editorial proofreading; L7 and L8 are not official TOPIK grades.
- Detailed reproducible report: [QUALITY-AUDIT-v1.8.0.md](./QUALITY-AUDIT-v1.8.0.md).

## v1.9.0 — Bilingual example field completion across the entire bank
- **All 5,463 vocabulary entries now have a Korean and Japanese usage example** (100% field coverage, 0 missing). L0 through L8 are all complete on the loaded runtime data.
- Authored and actually applied **363 contextual bilingual pairs** for the outstanding L5 and L6 vocabulary, in five modules: `vocabulary-v19-l5-argument.js` (101), `vocabulary-v19-l5-language.js` (67), `vocabulary-v19-l6-diplomacy.js` (48), `vocabulary-v19-l6-research-health.js` (75), `vocabulary-v19-l6-social-change.js` (72).
- Runtime application validated against the prior 363 missing headwords: no missing or duplicated candidates, all 363 applied to previously empty cards. Original IDs, previously authored translations, and study storage keys are preserved.
- The content audit now treats *any* incomplete bilingual pair in *any* level as a CI regression and also checks blank Japanese glosses, with all five v1.9 applied counts in its JSON output and GitHub Actions summary.
- Page script URLs, app registry, and PWA offline cache bumped to **v1.9.0**. The learner's example coverage breakdown is derived from live data.
- **100% here means fields are populated, not that all examples have been independently native-proofread.** Further work includes reviewing Korean spacing and citation forms, matching Japanese translations against intended senses and corpus frequency, and confirming study-level suitability. Custom L7–L8 are unofficial extensions beyond TOPIK 6.
- See [QUALITY-AUDIT-v1.9.0.md](./QUALITY-AUDIT-v1.9.0.md) for measured results and explicit quality follow-ups.

## v1.10.0
- 78 learner-facing Korean spacing adjustments, without replacing saved vocabulary IDs.
- Consolidated one repeated card; now 5,462 vocabulary items, with bilingual examples for all.
- Improved flashcards, search, writing answers and migrated existing progress and favorites.
- Added offline integration tests and a full data report in QUALITY-AUDIT-v1.10.0.md.
- Further dictionary verification and native translation review remain necessary.

## v1.11.0 — Korean homonym senses and Japanese interpretation QA
- Manually reviewed 15 high-leverage learner headwords, clarifying core Japanese glosses, grammatical roles and contrasting examples. The most important repair differentiates `유의하다` (有意하다, adjective: statistically significant) from `유의하다` (留意하다, verb: take note), so an L6 learner does not memorize mixed POS/example senses.
- Updated `유의미하다` and `공시` Japanese translations, `감사` homonym support, and academic/technical terms including `기인되다`, `대두하다`, `귀속하다`, `상관관계` and `인과추론` with explicit Japanese meaning or usage notes.
- Added `vocabulary-v21-sense-quality.js`, integrated into the v1.11 loading order after the prior orthography review. Show Japanese sense notes and contrast examples in flashcards **and** four-choice/typing quiz feedback.
- Replay of content scripts confirmed **15/15 review patches applied**, all **5,462 vocabulary cards still have both Korean and Japanese usage examples**, no duplicate IDs or display headwords, and no missing baseline Japanese glosses. Search rendering was also checked for the reviewed homonym.
- Extended QA reporting, CI summaries and offline tests to flag incomplete contrast-example pairs and verify the distinction between primary and alternate meanings.
- Updated `index.html`, `sw.js`, and all versioned assets to **v1.11.0**; existing learning history remains compatible.
- Quality audit: [QUALITY-AUDIT-v1.11.0.md](./QUALITY-AUDIT-v1.11.0.md). These edits are targeted, not a full native-speaker proofread or official word-by-word TOPIK level certification.

## v1.12.0 — Verified part-of-speech labels and high-impact beginner homonyms
- Edited **23 existing vocabulary cards** for Japanese-first POS precision and contrasting Korean/Japanese usage examples. Key corrected categories: `이번` → noun, `-쯤` → suffix, and `불가분의` → phrase rather than an independent determiner.
- Clarified the different verbs `맞추다` (to align/compare) and **new** `맞히다` (to answer correctly or hit a target). Added one L2 entry with both Korean and Japanese example sentences, without changing existing progress IDs.
- Expanded paired, meaning-specific usage notes for early words such as `싸다`, `바람`, `못`, `안`, `타다`, `열다`, `표` and `한편`.
- Replaying the actual JS data-module order after v1.12 yielded **5,463** unique cards and **5,463 complete bilingual example pairs (100%)**; no duplicate IDs, displayed Korean headwords, or missing basic Japanese glosses.
- Added POS/semantic assertions to `audit-data.cjs` and `test-vocab-quality.cjs`; updated versioned scripts and the offline service-worker cache, retaining previous study progress.
- Full results and government dictionary references: [QUALITY-AUDIT-v1.12.0.md](./QUALITY-AUDIT-v1.12.0.md).
- **Caveat:** The 23-card review does not certify every one of the 5,463 cards. A complete native-speaker translation review and live site testing remain outstanding.

## v1.13.0 — Distinct senses, argumentation verbs, and updated POS labels
- Added `vocabulary-v22-contrast-review.js` to distinguish **44** Korean/Japanese meaning or grammar pairs. Key correction: the main `유의하다` entry now explicitly represents the **留意하다 (動詞 / to pay attention)** sense, with statistical **有意하다** explained and contrasted separately.
- The previous v1.12 corrections remain: 23 reviewed early-learner cards, `이번` as noun, `-쯤` as bound suffix, `불가분의` as phrase, and newly added `맞히다` contrasted with `맞추다`.
- Verified the full vocabulary JS chain **including both v1.12 and v1.13 modules**: **5,463 unique cards**, **5,463 bilingual example pairs**, no duplicate cards, displayed headwords, or missing base Japanese glosses. The versioned PWA and project directory are aligned to **v1.13.0**.
- Updated quality audits and regression checks for common verb-pair and homonym mistakes. The work is *targeted editorial review*, not a full dictionary certification or native-speaker proofreading of all 5,463 entries.

Full source-level audit and dictionary references: [QUALITY-AUDIT-v1.13.0.md](./QUALITY-AUDIT-v1.13.0.md).

## v1.14.0 — Full-bank editorial learning-grade review
- Reviewed **all 5,463 loaded vocabulary cards' level/POS distributions**, and applied **656 curated learning-stage corrections**: **639 downward, 17 upward**; the existing card IDs, `ko` lookup values and local progress remain untouched.
- The staged learning progression differentiates early everyday vocabulary from abstract/social reading, technical research, and rare literature. Common words formerly pushed into L7/L8 by their literary context now appear earlier; genuinely technical vocabulary remains in L6–L8 as appropriate.
- Final L0–L8 distribution: **40 / 383 / 516 / 684 / 1,060 / 1,001 / 695 / 699 / 385**. The complete bilingual example rate remains **5,463 / 5,463 (100%)** with no duplicate IDs, duplicate displayed Korean labels, or missing Japanese glosses.
- Added targeted Japanese POS/gloss detail to seven words including `보통` and `어불성설이다`. Earlier v1.11–v1.13 corrections of `유의하다`, `유의미하다` and other polysemous words remain authoritative and were not overwritten.
- Extended `audit-data.cjs` and `test-vocab-quality.cjs` with level QA and regression assertions; the source-linked PWA cache and hub version are both **v1.14.0**.
- Each changed headword's original/new learning tier and rationale is in [LEVEL-CHANGES-v1.14.0.json](./LEVEL-CHANGES-v1.14.0.json); see [QUALITY-AUDIT-v1.14.0.md](./QUALITY-AUDIT-v1.14.0.md).
- These are **pedagogical estimates**, not official TOPIK word-by-word grades. The official TOPIK scale is 1–6, and L7/L8 are custom extensions. Full corpus verification and native-speaker proofreading remain future quality work.
