# WorkTrace

> **AI changed how people create work. WorkTrace changes how we evaluate it.**

**Built during OpenAI Build Week 2026.**  
**Developed by Yusra Tariq (Solo Builder).**

WorkTrace evaluates the investigation process rather than only the final answer. It captures competency evidence for AI-native work: how a person investigates a problem, works with AI, checks suggestions, makes decisions, and explains their reasoning.

## 30-Second TL;DR

| Traditional assessment | WorkTrace |
| --- | --- |
| Grades final answers | Evaluates the investigation process |
| Ignores or bans AI | Captures and verifies AI interaction |
| Produces one score | Produces an evidence-grounded Competency Receipt |

## What Makes WorkTrace Different?

AI tools can generate answers. WorkTrace looks for the human work around them: careful investigation, critical evaluation of AI input, independent decisions, evidence collection, and reasoning.

**WorkTrace evaluates the process, not just the result.**

## The Problem

AI makes polished output easier to produce. That makes traditional assessment less reliable when it measures only the final result.

A strong answer alone cannot show whether someone understood the problem, checked the evidence, verified the AI output, or made the decision themselves. Final-answer-only assessment misses the work that led to the answer.

## The Idea

WorkTrace turns the process behind AI-assisted work into structured evidence.

The learner investigates a realistic mission in a provided codebase. They can ask an AI teammate for help, evaluate an AI suggestion, collect evidence, submit a solution, and give an independent explanation of their reasoning.

At the end, WorkTrace produces a **Competency Receipt**. It is an evidence-grounded evaluator assessment linked to the recorded investigation timeline. It is not a claim of objective truth about a person. It is a transparent record of the evidence used for the assessment.

The core insight: work that is usually invisible can become evidence a reviewer can inspect.

## Why Now?

AI-native work is becoming normal. Technical hiring, enterprise AI upskilling, and AI-native education all need better evidence of how people work with AI, not only what they produce.

WorkTrace fits where human judgment still matters: when someone must investigate carefully, test an AI suggestion, and explain a decision.

## How It Works

```text
Home
  → Mission Entry
  → Investigation Workspace
  → Code investigation
  → AI Teammate
  → AI Suggestion
  → Learner Decision
  → Evidence Collection
  → Final Solution
  → Independent Explanation
  → Evaluation
  → Competency Receipt
```

The learner can inspect the mission's supplied files, ask the AI teammate grounded questions, accept or reject an AI suggestion, verify that decision, collect evidence, submit a final solution, and answer a follow-up question independently.

## The Five Competency Dimensions

- **Problem Framing**: how the learner investigates the problem and selects relevant evidence.
- **AI Verification**: how the learner accepts or rejects an AI suggestion and verifies that decision.
- **Independent Judgment**: how the learner explains their own decision after the investigation.
- **Technical Execution**: how the learner proposes a final solution.
- **Communication**: how clearly the learner communicates the solution and independent explanation.

## The Competency Receipt

The Competency Receipt is generated from the completed investigation timeline.

Each competency mapping points to persisted event IDs and ordered event sequences. The backend validates that every dimension has the required learner-owned evidence before it stores a receipt.

The core trust principle is simple:

> AI responses provide context. Learner-owned actions provide evidence.

AI suggestions and chat responses do not count as learner competency evidence. The evaluator must ground its mappings in recorded learner actions, such as selected evidence, decisions, verification, the final solution, and the independent explanation. The public receipt returns a backend-sanitized timeline.

## Product Flow

The current application has five major screens:

- **Home**: the public entry page. Its investigation actions open the internal flow at `#/investigate`.
- **MissionEntry**: loads the real public mission preview before a session is created. The learner acknowledges the mission and starts one investigation session.
- **InvestigationWorkSpace**: the full internal workspace for code review, AI chat, suggestions, decisions, verification, evidence, final submission, and follow-up explanation.
- **EvaluationTransition**: shows real evaluation status. It requests receipt generation once the follow-up answer is successfully persisted and supports retry after an evaluator failure.
- **CompetencyReceipt**: renders the backend-provided receipt, competency evidence mappings, and sanitized event timeline.

An active in-progress session can be restored from browser session storage. A completed receipt is restored separately and takes precedence over the public entry flow.

## Technical Architecture

WorkTrace is a small full-stack application. I developed it during OpenAI Build Week with Codex and GPT-5.6 as development collaborators.

- The frontend is React and Vite.
- Redux Toolkit manages the client workflow state and async requests.
- The backend is Node.js and Express.
- SQLite, through `better-sqlite3`, persists sessions, ordered decision events, submissions, follow-up answers, and competency receipts.
- The frontend and backend communicate through REST APIs.

The backend writes investigation events with a per-session sequence number. Evidence IDs are assigned at the backend persistence boundary. This creates a canonical event timeline for evaluation and receipt generation.

The product AI has two separate responsibilities:

- **AI teammate**: Google Gemini (`gemini-3.1-flash-lite`) receives the supplied mission context, code files, and visible conversation. It returns a structured chat message and, when appropriate, a structured AI suggestion for the learner to evaluate.
- **Evaluator**: Google Gemini (`gemini-3.1-flash-lite`) returns structured evaluation data. The backend validates it against strict JSON and evidence-mapping contracts before a Competency Receipt can be stored.

The evaluation pipeline separates the AI provider call from backend validation and receipt generation. The validation layer is model-agnostic: it checks the same JSON contract and persisted evidence mappings before any model output can become a receipt.

The receipt API exposes a public receipt contract and a backend-sanitized timeline. It does not expose the evaluator prompt or private evaluation metadata.

### Development Tools

I used Codex and GPT-5.6 as development collaborators during the build. They are not the in-product evaluator.

### Product AI

Google Gemini, through the Gemini API, powers the in-product AI teammate and evaluator.

## How Codex and GPT-5.6 Helped

I used Codex and GPT-5.6 as hands-on development collaborators to build and refine the project. They helped me with:

- building the React/Vite and Node/Express application flow;
- connecting frontend screens to REST endpoints and Redux Toolkit state;
- implementing session restoration and receipt restoration behavior;
- debugging API contracts for persisted evidence IDs and suggestion decisions;
- separating editable follow-up drafts from submitted follow-up answers;
- debugging the evaluator contract so independent judgment maps to persisted learner-owned follow-up evidence;
- adding strict parsing and validation around evaluator output;
- fixing state, persistence, and navigation edge cases;
- connecting the Competency Receipt to real backend receipt data rather than hardcoded values;
- writing and updating frontend and backend tests; and
- running builds and regression checks while iterating on the final end-to-end flow.

## Challenges

### Keeping the Timeline Ordered

I needed a trustworthy sequence for the receipt. The backend assigns an increasing sequence number to every event within a session and reads the timeline in that order.

### Separating Context From Evidence

I treated AI output as useful context, not proof of learner competency. Suggestion and chat events are attributed to the AI. The evaluator requires learner-owned anchors for each competency dimension.

### Grounding Evaluator Output

I needed the evaluator to return machine-readable data. The backend validates scores, dimensions, event IDs, unique mappings, and evidence requirements. Invalid output is retried once and then rejected without generating a receipt.

### Preserving Work When Evaluation Fails

I made sure an evaluator failure does not erase the learner's submitted investigation. The completed submission and follow-up answer remain stored, and the EvaluationTransition provides a retry path.

### Keeping the Receipt Backend-Driven

I kept the receipt backend-driven. The frontend renders only the public receipt returned by the backend. Scores, evidence mappings, timestamps, and timeline events are not hardcoded in the receipt view.

## What I Learned

- In an AI-native world, the final answer is only one part of the signal.
- What a person investigated matters.
- The evidence they selected matters.
- How they handled AI input matters.
- What they accepted or rejected matters.
- How they explained their decision matters.

## Future Work

- More investigation missions.
- Role-specific competency frameworks.
- Richer evidence types.
- Team and hiring workflows.
- Share functionality.
- Export functionality.

Share and Export are currently visible in the receipt UI as disabled future actions. They do not yet perform sharing or export behavior.

My long-term goal is to make AI-native competency portable, so people can carry trusted evidence of how they work, not only what they produce.

## Tech Stack

- JavaScript
- React 19
- Vite
- Redux Toolkit
- React Redux
- Framer Motion
- Tailwind CSS
- Monaco Editor
- Node.js
- Express
- SQLite
- better-sqlite3
- Google Gemini API (`@google/genai`)
- Axios
- REST APIs
- Vitest and Node's built-in test runner

## Getting Started

### Prerequisites

- Node.js 18 or later.
- A Google Gemini API key.

### Install dependencies

Install the backend and frontend dependencies separately:

```bash
cd backend
npm install

cd ../frontend
npm install
```

### Configure the backend

Copy the example environment file and set a real Gemini key:

```bash
cd backend
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Set these values in `backend/.env`:

```dotenv
PORT=5000
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-3.1-flash-lite
```

Do not commit `.env` or a real API key. `GEMINI_MODEL` is optional; the backend uses `gemini-3.1-flash-lite` by default.

### Start the application

In one terminal, start the backend:

```bash
cd backend
npm run dev
```

In a second terminal, start the frontend:

```bash
cd frontend
npm run dev
```

Vite proxies `/api` requests to `http://localhost:5000`. Open the local URL printed by Vite, then use `#/` for the public page or `#/investigate` for the internal product flow.

### Run tests

```bash
cd backend
npm test

cd ../frontend
npm test
```

### Build the frontend

```bash
cd frontend
npm run build
```

## How to Test WorkTrace

1. Start the backend and frontend.
2. Open the application.
3. Choose **See an Investigation** or **Request Access** to enter the mission flow.
4. Review the mission and start the investigation.
5. Inspect the supplied code files in the Investigation Workspace.
6. Ask the AI teammate a grounded question about the mission.
7. When an AI suggestion is offered, accept or reject it.
8. Record verification for the decision when appropriate.
9. Mark a file or item as selected evidence.
10. Submit a final solution and justification.
11. Answer the independent follow-up question and submit it.
12. Wait for the EvaluationTransition to finish receipt generation.
13. Open the Competency Receipt and use **View full timeline**.

## Demo Video

**YouTube demo URL:** `TODO: add final demo URL`

The demo should show:

- what WorkTrace is;
- the investigation flow;
- the AI teammate;
- learner judgment; and
- the final Competency Receipt.

## OpenAI Build Week

WorkTrace was built for OpenAI Build Week.

I used Codex and GPT-5.6 throughout development to implement the full-stack product, connect and test the frontend and backend, debug state and persistence problems, tighten the evaluator contract, and verify the final flow from mission entry to receipt. Google Gemini remains the product AI used by the in-app teammate and evaluator.

## Submission Checklist

- **Demo Video URL:** `https://www.youtube.com/watch?v=nfjeNNilBqA`
- **Repository URL:** `https://github.com/Yusra230/WorkTrace`
- **Codex /feedback Session ID:** `019f7648-45db-7f62-b48c-db7777143993`

