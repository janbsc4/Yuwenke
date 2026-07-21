# Chinese Class Notes Experiment

This repository is a personal experiment using notes from my Chinese class. I am exploring how handwritten class material can be transformed into structured data for a flashcard web app.

The dataset includes Mandarin vocabulary, phrases, grammar points, character concepts, pinyin with tone marks, and explanations in Spanish. The source material has been organized into individual flashcard rows so it can be filtered, reviewed, or imported into an application.

## Files

- `chino_flashcards.csv` - the structured flashcard dataset.
- `scripts/build_flashcards.mjs` - the script used to generate the CSV.
- `Notas Clase Chino Lei.pdf` - the original local class notes. This large source file is intentionally excluded from Git.

## CSV structure

Each row is a word, phrase, or concept. The columns contain:

- a unique ID and card type;
- topic and tags;
- Mandarin characters and pinyin;
- a Spanish meaning and explanation;
- an example in Mandarin, pinyin, and Spanish;
- the page number from the original notes.

## Regenerating the dataset

With Node.js installed, run:

```sh
node scripts/build_flashcards.mjs
```

This overwrites `chino_flashcards.csv` with the dataset defined in the script.

## Note

This is an experimental learning project, not an authoritative Mandarin reference. The content is based on personal class notes and may continue to change as I learn and refine the material.
