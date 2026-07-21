require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mission = require('./mission/mission.json');
const missionCodebase = require('../frontend/src/data/novaCommerceCodebase.json');
const { createDatabase } = require('./db/db');
const { createAiService } = require('./utils/gemini');
const { createSessionLock } = require('./utils/session-lock');
const { errorHandler } = require('./utils/errors');
const { createSessionRouter } = require('./routes/session');
const { createChatRouter } = require('./routes/chat');
const { createEventRouter } = require('./routes/event');
const { createSubmissionRouter } = require('./routes/submission');
const { createReceiptRouter } = require('./routes/receipt');

function createApp({ db = createDatabase(), ai = createAiService(), sessionLock = createSessionLock(), codebase = missionCodebase } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '64kb' }));

  app.use('/api/session', createSessionRouter({ db, mission }));
  app.use('/api/chat', createChatRouter({ db, mission, codebase, ai, sessionLock }));
  app.use('/api/event', createEventRouter({ db, sessionLock }));
  app.use('/api/submission', createSubmissionRouter({ db, sessionLock }));
  app.use('/api/receipt', createReceiptRouter({ db, mission, ai, sessionLock }));
  app.use((req, res) => res.status(404).json({ error: true, message: 'Endpoint not found.' }));
  app.use(errorHandler);
  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 5000;
  createApp().listen(port, () => console.log(`WORKTRACE backend listening on http://localhost:${port}`));
}

module.exports = { createApp };
