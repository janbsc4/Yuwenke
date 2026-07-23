# GitHub Pages Flashcard App

## Summary

Build a Spanish-language flashcard app using Astro with one React/TypeScript client island. GitHub Pages will host the static site, the repository CSV will remain the card source, and Firebase Authentication plus Firestore will synchronize progress.

This fits the free tiers: GitHub Pages supports static HTML/CSS/JavaScript from public repositories, while Firestore currently includes 1 GiB storage, 50,000 reads/day, and 20,000 writes/day at no cost. [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [Firestore quotas](https://firebase.google.com/docs/firestore/quotas)

Google Sheets will not be used in v1. The existing 139-card CSV is small, versioned, reviewable, and does not need a live content database.

## Product behavior

- Provide three views:
  - `Estudiar`: all filtered units currently marked `learning`.
  - `Descubrir`: unseen card-direction units, where users can choose `Añadir a aprendizaje`, `Ya la sé`, or skip.
  - `Dominadas`: known units with an option to return them to learning.
- Treat each card direction independently:
  - Hanzi → Spanish.
  - Spanish → Hanzi.
- Shuffle all matching units at session start without repetition. A base card may appear once in each direction.
- Front/back display:
  - Hanzi prompt reveals pinyin, Spanish, explanation, and examples.
  - Spanish prompt reveals hanzi, pinyin, explanation, and examples.
- Include search across hanzi, pinyin, Spanish, tags, and explanations; filters for topic and card type; queue counts and session progress.
- Allow immediate guest study. Guest progress remains local until Google sign-in.
- Use a mobile-first, keyboard-accessible interface with reduced-motion support and system Chinese fonts.

## Architecture and interfaces

- Use Astro for the static shell and a `client:load` React island for deck state, filters, authentication, and synchronization. Astro officially supports React islands and static GitHub Pages deployment. [Astro islands](https://docs.astro.build/en/concepts/islands/), [Astro GitHub Pages deployment](https://v4.docs.astro.build/en/guides/deploy/github/)
- Parse `chino_flashcards.csv` during the Astro build with schema validation; fail the build for duplicate IDs, missing required fields, or invalid card types. Pass validated cards to the React island as static JSON.
- Preserve the existing `Flashcard` fields: `id`, `tipo`, `tema`, `hanzi`, `pinyin`, `espanol`, explanations, examples, page, and tags.
- Add these application types:
  - `StudyDirection = "hanzi-es" | "es-hanzi"`
  - `ProgressStatus = "learning" | "known"`; absence means unseen.
  - `ProgressEntry = { cardId, direction, status, clientUpdatedAt, serverUpdatedAt, schemaVersion }`
- Store authenticated entries at `users/{uid}/progress/{cardId}_{direction}`.
- Store guest entries locally under a versioned browser key. On sign-in:
  - Merge guest, device, and cloud entries per card-direction.
  - Keep the entry with the newest `clientUpdatedAt`; cloud wins exact timestamp ties.
  - Upload local winners in a Firestore batch.
  - Clear guest data only after successful synchronization.
- Mirror authenticated changes locally for immediate UI updates, retry dirty writes when connectivity returns, and consume Firestore updates so other devices appear automatically.
- On sign-out, stop cloud listeners and remove the account-specific local snapshot; begin a fresh guest session.

## Security and deployment

- Use Firebase Google sign-in, with popup authentication and redirect fallback on mobile.
- Firestore rules must allow users to read and modify only their own progress path and reject unexpected fields, directions, statuses, or value types.
- Treat Firebase web configuration as public project identification; authorization relies on Authentication and Security Rules, not hiding the Firebase API key. [Firebase API key guidance](https://firebase.google.com/docs/projects/api-keys), [Firebase rules basics](https://firebase.google.com/docs/rules/basics)
- Configure Astro with:
  - `site: "https://janbsc4.github.io"`
  - `base: "/Yuwenke"`
- Add Firebase settings through `PUBLIC_FIREBASE_*` variables, document them in `.env.example`, and configure the same GitHub repository variables for deployment.
- Add an official Astro/GitHub Pages workflow triggered by pushes to `main` and manual dispatch. It must install from the committed lockfile, run tests, build, and deploy `dist`.
- Firebase setup must enable Google Authentication, create Firestore, and authorize `janbsc4.github.io` plus the local development origin.
- Update the README with local development, Firebase setup, testing, deployment, and CSV editing instructions.

## Test plan

- Unit-test CSV parsing, schema failures, filters, search normalization, shuffle uniqueness, direction generation, state transitions, and timestamp-based merging.
- Component-test both card directions, flip/rating controls, empty learning queues, Discover behavior, Spanish labels, authentication states, and responsive keyboard interaction.
- Test Firestore rules with the emulator: unauthenticated denial, own-user access, cross-user denial, invalid payload denial, and valid progress writes.
- Add end-to-end tests for guest persistence, Discover → Learning → Known flow, reload behavior, filters, `/Yuwenke` asset paths, sign-in merge, sign-out cleanup, and mobile layout.
- Acceptance requires all 139 cards to load, guest study to work without Firebase, authenticated progress to synchronize across two sessions, and the deployed Pages URL to load without broken assets or routes.

## Assumptions

- Use Astro + React + TypeScript with npm and a committed lockfile.
- Keep the repository and GitHub Pages site public.
- Use Google sign-in only; no email/password accounts.
- No spaced repetition, audio, streaks, analytics, card editor, Google Sheets integration, or installable PWA in v1.
- Firebase stores only authentication identity and study progress; flashcard content remains static in Git.
