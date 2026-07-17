const express = require('express');
const { AppError, asyncHandler } = require('../utils/errors');
const { validateSubmission, validateFollowUp } = require('../utils/validation');

const FOLLOW_UP_QUESTION = 'Why did you choose this solution, and how did you decide whether to trust or reject the AI teammate\'s suggestion?';

function requireSession(db, sessionId) {
  const session = db.getSession(sessionId);
  if (!session) throw new AppError(404, 'Session not found.', 'session_not_found');
  return session;
}

function createSubmissionRouter({ db, sessionLock }) {
  const router = express.Router();

  router.post('/', asyncHandler(async (req, res) => {
    const { sessionId, solution, justification } = validateSubmission(req.body);
    await sessionLock.run(sessionId, async () => {
      const session = requireSession(db, sessionId);
      if (session.status !== 'active' || session.submission_completed) {
        throw new AppError(409, 'A final solution has already been submitted or the session is not active.', 'invalid_state');
      }
      db.saveSubmission(sessionId, solution, justification);
      db.appendEvent(sessionId, 'submission', { solution, justification });
      db.appendEvent(sessionId, 'follow_up_question', { question: FOLLOW_UP_QUESTION });
      db.updateSession(sessionId, { submission_completed: 1, status: 'submitted' });
    });
    res.json({ success: true, follow_up_question: FOLLOW_UP_QUESTION });
  }));

  router.post('/follow-up', asyncHandler(async (req, res) => {
    const { sessionId, answer } = validateFollowUp(req.body);
    await sessionLock.run(sessionId, async () => {
      const session = requireSession(db, sessionId);
      if (session.status !== 'submitted' || !session.submission_completed || session.follow_up_completed) {
        throw new AppError(409, 'The follow-up answer cannot be submitted in the current session state.', 'invalid_state');
      }
      db.saveFollowUp(sessionId, FOLLOW_UP_QUESTION, answer);
      db.appendEvent(sessionId, 'follow_up_answer', { answer });
      db.updateSession(sessionId, { follow_up_completed: 1 });
    });
    res.json({ success: true, ready_for_evaluation: true });
  }));

  return router;
}

module.exports = { createSubmissionRouter, FOLLOW_UP_QUESTION };
