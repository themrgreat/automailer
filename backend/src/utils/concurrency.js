async function runWithConcurrency(items, limit, worker) {
  let index = 0;
  async function next() {
    const i = index++;
    if (i >= items.length) return;
    try {
      await worker(items[i]);
    } catch (err) {
      console.error("runWithConcurrency worker error:", err);
    }
    return next();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
}

module.exports = { runWithConcurrency };
