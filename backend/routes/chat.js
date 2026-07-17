const express = require('express');
const { AppError, asyncHandler } = require('../utils/errors');
const { validateChat, isCauseQuestion } = require('../utils/validation');
const { createUuid } = require('../utils/uuid');
const { getPublicTimeline, buildTeammateHistory } = require('../utils/timeline');

function requireActiveSession(db, sessionId) {
  const session = db.getSession(sessionId);
  if (!session) throw new AppError(404, 'Session not found.', 'session_not_found');
  if (session.status !== 'active') throw new AppError(409, 'Session is no longer active.', 'invalid_state');
  return session;
}

function createChatRouter({ db, mission, ai, sessionLock }) {
  const router = express.Router();

  router.post('/', asyncHandler(async (req, res) => {
    const { sessionId, message } = validateChat(req.body);
    const payload = await sessionLock.run(sessionId, async () => {
      const session = requireActiveSession(db, sessionId);
      const nextMessageCount = session.message_count + 1;
      db.updateSession(sessionId, { message_count: nextMessageCount });
      db.appendEvent(sessionId, 'user_prompt', { message });

      const shouldOfferSuggestion = !session.flawed_suggestion_offered && (
        nextMessageCount === 5 || isCauseQuestion(message)
      );
      const trigger = nextMessageCount === 5 ? 'fifth_message' : 'cause_question';
      const history = buildTeammateHistory(getPublicTimeline(db, sessionId));
      const teammateReply = await ai.teammate(history, message);

      let aiResponse = teammateReply;
      let suggestionId = null;
      if (shouldOfferSuggestion) {
        suggestionId = createUuid();
        aiResponse = `${teammateReply}\n\nOne hypothesis to consider: ${mission.flawed_suggestion}`;
      }
      db.appendEvent(sessionId, 'ai_response', { message: aiResponse });

      if (suggestionId) {
        db.updateSession(sessionId, { flawed_suggestion_offered: 1 });
        db.appendEvent(sessionId, 'suggestion_offered', {
          suggestion_id: suggestionId,
          suggestion: mission.flawed_suggestion,
          trigger
        });
      }

      return {
        ai_response: aiResponse,
        suggestion_offered: Boolean(suggestionId),
        suggestion_id: suggestionId,
        verification_required: Boolean(suggestionId)
      };
    });
    res.json(payload);
  }));

  return router;
}

module.exports = { createChatRouter, requireActiveSession };
