const express = require('express');
const { AppError, asyncHandler } = require('../utils/errors');
const { validateEvent } = require('../utils/validation');
const { requireActiveSession } = require('./chat');

function createEventRouter({ db, sessionLock }) {
  const router = express.Router();
  router.post('/log', asyncHandler(async (req, res) => {
    const { sessionId, type, data } = validateEvent(req.body);
    const result = await sessionLock.run(sessionId, async () => {
      requireActiveSession(db, sessionId);
      if (type.startsWith('suggestion_') && !db.findSuggestion(sessionId, data.suggestion_id)) {
        throw new AppError(400, 'suggestion_id does not belong to this session.', 'invalid_suggestion');
      }
      const event = db.appendEvent(sessionId, type, data);
      if (type === 'suggestion_verified') db.updateSession(sessionId, { verification_completed: 1 });
      return event;
    });
    res.status(201).json({ success: true, event_id: result.id });
  }));
  return router;
}

module.exports = { createEventRouter };
