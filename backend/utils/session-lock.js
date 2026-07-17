function createSessionLock() {
  const tails = new Map();

  async function run(sessionId, operation) {
    const previous = tails.get(sessionId) || Promise.resolve();
    let release;
    const current = new Promise((resolve) => { release = resolve; });
    const tail = previous.then(() => current);
    tails.set(sessionId, tail);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (tails.get(sessionId) === tail) tails.delete(sessionId);
    }
  }

  return { run };
}

module.exports = { createSessionLock };
