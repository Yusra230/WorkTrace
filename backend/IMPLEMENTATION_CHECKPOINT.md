# WORKTRACE Backend Implementation Checkpoint

**Checkpoint date:** 2026-07-17  
**Provider:** Google Gemini via `@google/genai`  
**Backend location:** `backend/`

## Runtime and configuration

The backend is a CommonJS Express service using SQLite (`better-sqlite3`) and the Gemini Developer API. It targets Node.js 18+ and listens on port 5000 by default.

Create `backend/.env` from `.env.example` and provide a server-side Gemini key:

```env
PORT=5000
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Never expose `GEMINI_API_KEY` to a frontend or commit it to source control.

Start the service:

```powershell
cd backend
npm install
Copy-Item .env.example .env
# Set GEMINI_API_KEY in .env
npm run dev
```

The production-style command is `npm start`; automated tests run with `npm test`.

## API surface

| Endpoint | Purpose | Successful response |
| --- | --- | --- |
| `POST /api/session/start` | Creates an active NovaCommerce session and returns public mission data. | `201` with `session_id` and `mission` |
| `POST /api/chat` | Logs a learner message, calls the Gemini teammate, and deterministically offers the seeded flawed suggestion on a targeted cause question or fifth learner message. | `200` with `ai_response`, `suggestion_offered`, `suggestion_id`, `verification_required` |
| `POST /api/event/log` | Logs `suggestion_accepted`, `suggestion_rejected`, `suggestion_verified`, or `user_decision`. Suggestion events must reference the offered suggestion in the same session. | `201` with `event_id` |
| `POST /api/submission` | Saves the final solution and justification, transitions the session to `submitted`, and returns the fixed follow-up question. | `200` |
| `POST /api/submission/follow-up` | Saves the independent explanation. | `200` with `ready_for_evaluation: true` |
| `POST /api/receipt/generate` | Evaluates the complete sanitized chronological timeline and saves an idempotent Competency Receipt. | `200` with scores, evidence, and event timeline |
| `GET /api/receipt/:session_id` | Fetches a saved Competency Receipt. | `200`, or `404` when none exists |

Errors use `{ "error": true, "message": "..." }`. Expected status classes are `400` validation, `404` missing resource, `409` invalid lifecycle state, `429` provider rate limiting after retry, and `503` unavailable provider/configuration.

## Verified live smoke flow

The Gemini-backed happy path was run successfully against `http://127.0.0.1:5000` with a newly created session.

1. `POST /api/session/start` returned `201` and the fixed NovaCommerce mission.
2. `POST /api/chat` with `What is causing this?` returned `200` with a Gemini investigation response, `suggestion_offered: true`, a valid UUID `suggestion_id`, and `verification_required: true`.
3. `POST /api/event/log` recorded `suggestion_rejected` with `201`.
4. `POST /api/event/log` recorded `suggestion_verified` with `201`.
5. `POST /api/submission` returned `200` and the independent follow-up question.
6. `POST /api/submission/follow-up` returned `200` with `ready_for_evaluation: true`.
7. `POST /api/receipt/generate` returned `200` with five competency scores, five evidence mappings, and a sanitized timeline.
8. `GET /api/receipt/:session_id` returned `200` with the same persisted receipt.

The generated receipt contained 11 sequence-ordered events: session start, learner prompt, Gemini response, suggestion offered, rejection, verification, submission, follow-up question, follow-up answer, evaluation start, and evaluation completion. Evidence entries map each dimension to concrete event IDs and sequence numbers.

## Audit and security behavior

- Every event receives a per-session, transactionally assigned sequence number.
- The evaluator receives the complete ordered, sanitized timeline plus the mission, submission, and follow-up answer.
- Public receipts expose only allowlisted event data. Hidden trigger metadata, prompts, provider responses, API keys, stack traces, and unknown event fields are excluded.
- API-key-like text is redacted from public timeline output.
- Gemini output is reduced to visible teammate text or validated evaluator JSON; raw provider payloads are not persisted.

## Known limitations

- A valid Gemini key, provider network access, and available quota are required for chat and receipt generation. Deterministic session state is preserved if those calls fail, but the endpoint returns a controlled `429` or `503` response.
- The MVP intentionally supports one fixed mission, one teammate, one seeded suggestion, no authentication, and no multi-user ownership model beyond possession of `session_id`.
- SQLite and the in-process session lock are appropriate for this single-process hackathon backend; multi-instance deployment would require shared locking and a production database.
- Mission codebase files and data are descriptive fixed context only. The backend does not execute learner code or provide live filesystem/codebase access.
- Evaluator scores are AI-generated and can vary between successful provider calls, although evidence must reference real persisted event IDs.
- Schema initialization creates fresh tables automatically but does not include a migration framework for databases created by older schema revisions.
