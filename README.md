# ReQuiz

Guess the term. Learn the concept.

ReQuiz is a short web quiz for memorising terms. You see a description that is gradually revealed, and you guess the term it describes. Add your own terms (course vocab, jargon, definitions), then quiz yourself until they stick.

Built for a hackathon with an education theme: make studying easier.

# Homepage
<img width="1512" height="857" alt="Screenshot 2026-10-03 at 6 10 18 pm" src="https://github.com/user-attachments/assets/e3860358-41e2-4509-8746-4be35cfb7df3" />

# Add Word Page
<img width="1512" height="858" alt="Screenshot 2026-10-03 at 6 10 28 pm" src="https://github.com/user-attachments/assets/85ef40d5-d9be-443f-9388-867d08e866ac" />

# Flashcard Page 
## Theme: Black and Gold
<img width="1512" height="857" alt="Screenshot 2026-10-03 at 6 11 01 pm" src="https://github.com/user-attachments/assets/2f613c08-ead7-4bd8-85c7-84813cafc0ac" />
 
# Theme: Classic
<img width="1512" height="856" alt="Screenshot 2026-10-03 at 6 15 20 pm" src="https://github.com/user-attachments/assets/1e280442-1476-494c-929c-25cbba1add5d" />


## How it works

- **Play (MAIN `/`):** a random term from your library is picked. You see the first chunk of its description and have 6 lives. Each wrong guess costs a life and reveals the next chunk. A correct guess reveals the full description. Run out of lives (or press Skip) and the term and full description are shown.
- **Add terms (SUBMIT WORD `/submit`):** add a term and a description to your library.
- **Review (RECORDS `/records`):** browse your library as flip cards (term on the front, description on the back) and delete terms you no longer want.

There is no need for a login. Each browser gets its own private library, tracked by an anonymous cookie, so one person's terms never appear in another person's quiz. New libraries start with 5 seed terms so the first visit is playable.

## How to run

Requirements: Docker.

```bash
docker compose up --build
```

Open http://localhost:3000. Node, npm, Postgres, Prisma generate, and migrations all run inside Docker. One command is enough.

Stop with `docker compose down`.

For live reload against the same Postgres, install lockfile dependencies inside the container (Linux `node_modules`) and run Next in watch mode:

```bash
docker compose --profile dev up --build db migrate dev
```

`dev` runs `npm ci` on start, so new packages in `package-lock.json` are installed in the `requiz_node_modules` volume without copying host binaries.

To develop on the host instead (Node 20+):

```bash
npm install
cp .env.example .env
docker compose up -d db
npx prisma migrate deploy
npm run dev
```

### Environment variables

```
DATABASE_URL=postgresql://requiz:requiz@localhost:5432/requiz
COOKIE_SECURE=false
```

Never commit `.env`. On Vercel, set `DATABASE_URL` (Neon) and omit `COOKIE_SECURE` so the cookie is Secure on HTTPS.

Local Docker sets `COOKIE_SECURE=false` so the httpOnly `library_id` cookie works on `http://localhost:3000`.

## Game rules

| Situation | Lives | Result |
|---|---|---|
| Correct guess | stop | Full description and term shown |
| Wrong guess, lives remain | -1 | Next chunk of the description revealed |
| Wrong guess, lives reach 0 | 0 | Term and full description shown |
| Duplicate guess this round | unchanged | Warning: "You already tried that word!" |
| Skip | n/a | Term and full description shown |

**Guess matching:** guesses are normalised before comparing: Unicode NFKC, trimmed, spaces collapsed, lowercased, and symbols, digits and punctuation stripped. A guess is correct only if it equals the normalised term exactly. Multi-word terms such as "software engineer" work.

**Reveal chunks:** the description is split into up to 6 chunks of roughly equal size. Sentences are grouped evenly when there are two or more; otherwise the description is split by words.

## Submit rules

- Term: letters and spaces only, not blank, max 80 characters. Case is preserved for display.
- Description: required, max 4000 characters.
- Terms must be unique within a library (case-insensitive).
- Maximum 500 terms per library.
- No AI moderation in v1. Libraries are private to a cookie, so spam does not affect other users.

## Tech stack

| Layer | Choice |
|---|---|
| App | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL (local Docker, then Neon) |
| ORM | Prisma |
| Hosting | Vercel |
| Identity | `library_id` cookie (httpOnly, sameSite=lax; Secure in production) |

## Data model

```
libraries
  id          uuid PK
  created_at  timestamptz

terms
  id          uuid PK
  library_id  uuid FK -> libraries (ON DELETE CASCADE)
  word        text NOT NULL
  word_key    text NOT NULL        -- lowercased word, for uniqueness
  description text NOT NULL
  created_at  timestamptz
  UNIQUE (library_id, word_key)
```

Round state (lives, guesses, revealed chunks) lives in the browser only. Refreshing `/` starts a new round.

## API

All routes are scoped to the library in the `library_id` cookie. A missing or unknown cookie creates a new library and inserts the five seed terms.

| Method | Path | Behaviour |
|---|---|---|
| GET | `/api/terms/random?excludeId=` | One random term `{ id, word, description }` |
| GET | `/api/terms` | All terms in this library |
| POST | `/api/terms` | Create a term. 400 on validation error, 409 on duplicate |
| DELETE | `/api/terms/:id` | Delete a term. 404 if not in this library |

## Deploying

1. Push the repo to GitHub.
2. Import it in Vercel.
3. Add `DATABASE_URL` under Project Settings, Environment Variables (Neon).
4. Apply production migrations: `npx prisma migrate deploy` against that database.

## Project structure

```
app/
  page.tsx                 # MAIN: game (P3)
  submit/page.tsx          # SUBMIT WORD (P4)
  records/page.tsx         # RECORDS (P5)
  api/terms/route.ts       # GET list, POST create
  api/terms/random/route.ts
  api/terms/[id]/route.ts  # DELETE
  components/Nav.tsx
lib/                       # domain + Prisma helpers
prisma/                    # schema and migrations
docker-compose.yml         # Postgres 16 + Next.js app
.env.example               # DATABASE_URL template
```

## Seed terms

New libraries start with: software engineer, hackathon, database, algorithm, API.

## Definition of done

- A new incognito window gets a cookie and 5 seeds and is playable immediately.
- A wrong guess costs a life, reveals more text, and clears the input.
- A duplicate guess shows a warning and costs no life.
- Correct, 0 lives, or Skip shows the full description and term; Next resets to 6 lives.
- A new term appears in Records and can be drawn in play.
- Duplicate terms are rejected.
- Deleting a term removes it from Records and the quiz.
- A second browser profile sees a different library.

## Out of scope for v1

Describe-the-term mode, login or sync across devices, AI moderation or grading, leaderboards and streaks, study history, and admin tools.

## Known tradeoff

Clearing cookies or site data creates a new, empty library (re-seeded). Old terms remain in the database as orphans unless a cleanup job is added later.
