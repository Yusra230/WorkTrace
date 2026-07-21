const express = require('express');
const { createUuid } = require('../utils/uuid');
const { AppError, asyncHandler } = require('../utils/errors');

function publicMission(mission) {
  const { id, company, role, title, brief, context, codebase_files, seed_data } = mission;
  return { id, company, role, title, brief, context, codebase_files, seed_data };
}

function createSessionRouter({ db, mission }) {
  const router = express.Router();
  router.get('/mission', (req, res) => {
    res.json({ mission: publicMission(mission) });
  });

  router.post('/start', asyncHandler(async (req, res) => {
    if (req.body && (typeof req.body !== 'object' || Array.isArray(req.body))) {
      throw new AppError(400, 'Request body must be a JSON object.', 'validation_error');
    }
    const id = createUuid();
    db.createSession(id, mission.id);
    db.appendEvent(id, 'session_started', { mission_id: mission.id });
    res.status(201).json({ session_id: id, mission: publicMission(mission) });
  }));
  return router;
}

module.exports = { createSessionRouter, publicMission };
