const express = require('express');
const { AppError, asyncHandler } = require('../utils/errors');
const { validateEvent } = require('../utils/validation');
const { createUuid } = require('../utils/uuid');
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
      if (type === 'evidence_collected' && data.linked_hypothesis_id && !db.findSuggestion(sessionId, data.linked_hypothesis_id)) {
        throw new AppError(400, 'linked_hypothesis_id does not belong to this session.', 'invalid_suggestion');
      }
      // Evidence IDs are assigned at the persistence boundary, never by a client.
      // The ID is stored with this canonical evidence event and returned to the caller.
      const persistedData = type === 'evidence_collected'
        ? { ...data, evidence_id: createUuid() }
        : data;
      const event = db.appendEvent(sessionId, type, persistedData);
      if (type === 'suggestion_verified') db.updateSession(sessionId, { verification_completed: 1 });
      return { event, evidenceId: persistedData.evidence_id || null };
    });
    res.status(201).json({ success: true, event_id: result.event.id, ...(result.evidenceId ? { evidence_id: result.evidenceId } : {}) });
  }));
  return router;
}

module.exports = { createEventRouter };
