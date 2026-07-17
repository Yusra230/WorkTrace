const { AppError } = require('./errors');

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function retryAI(operation, attempts = 2) {
  let retryCount = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      const status = error && (error.status || error.statusCode);
      if (status === 429 && retryCount < attempts) {
        retryCount += 1;
        await sleep(2000);
        continue;
      }
      if (status === 429) {
        throw new AppError(429, 'AI service is rate limited. Please try again shortly.', 'ai_rate_limited');
      }
      throw new AppError(503, 'AI service temporarily unavailable.', 'ai_unavailable');
    }
  }
}

module.exports = { retryAI, sleep };
