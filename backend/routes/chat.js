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

function createGroundedMissionContext(mission, codebase) {
  const availablePaths = new Set(mission.codebase_files || []);
  const workspaceFiles = (codebase?.files || [])
    .filter((file) => availablePaths.has(file.path))
    .map(({ path, language, content }) => ({ path, language, content }));

  return {
    mission: {
      id: mission.id,
      company: mission.company,
      role: mission.role,
      title: mission.title,
      brief: mission.brief,
      context: mission.context,
      seed_data: mission.seed_data
    },
    workspace_files: workspaceFiles
  };
}

function normalizeTeammateReply(reply) {
  if (typeof reply === 'string') return { message: reply, suggestion: null };
  if (!reply || typeof reply.message !== 'string') {
    throw new AppError(503, 'AI service temporarily unavailable.', 'ai_empty_response');
  }
  return {
    message: reply.message,
    suggestion: typeof reply.suggestion === 'string' && reply.suggestion.trim() ? reply.suggestion.trim() : null
  };
}

function createChatRouter({ db, mission, codebase, ai, sessionLock }) {
  const router = express.Router();

  router.post('/', asyncHandler(async (req, res) => {
    const { sessionId, message } = validateChat(req.body);
    const payload = await sessionLock.run(sessionId, async () => {
      const session = requireActiveSession(db, sessionId);
      const nextMessageCount = session.message_count + 1;
      db.updateSession(sessionId, { message_count: nextMessageCount });
      db.appendEvent(sessionId, 'user_prompt', { message });

      const shouldOfferSeededSuggestion = !session.flawed_suggestion_offered && (
        nextMessageCount === 5 || isCauseQuestion(message)
      );
      const history = buildTeammateHistory(getPublicTimeline(db, sessionId));
      const groundedMissionContext = createGroundedMissionContext(mission, codebase);
      const teammateReply = normalizeTeammateReply(await ai.teammate(history, message, groundedMissionContext));

      const shouldOfferStructuredSuggestion = !session.flawed_suggestion_offered && Boolean(teammateReply.suggestion);
      const suggestion = shouldOfferStructuredSuggestion ? teammateReply.suggestion : (shouldOfferSeededSuggestion ? mission.flawed_suggestion : null);
      const trigger = shouldOfferStructuredSuggestion ? 'teammate_structured' : (nextMessageCount === 5 ? 'fifth_message' : 'cause_question');
      let suggestionId = null;
      if (suggestion) {
        suggestionId = createUuid();
      }
      db.appendEvent(sessionId, 'ai_response', { message: teammateReply.message });

      if (suggestionId) {
        db.updateSession(sessionId, { flawed_suggestion_offered: 1 });
        db.appendEvent(sessionId, 'suggestion_offered', {
          suggestion_id: suggestionId,
          suggestion,
          trigger
        });
      }

      return {
        ai_response: teammateReply.message,
        suggestion_offered: Boolean(suggestionId),
        suggestion_id: suggestionId,
        suggestion,
        verification_required: Boolean(suggestionId)
      };
    });
    res.json(payload);
  }));

  return router;
}

module.exports = { createChatRouter, createGroundedMissionContext, normalizeTeammateReply, requireActiveSession };
