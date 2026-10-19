# ことばの橋 / Kotoba Bridge — Alpha v0.2.0

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
