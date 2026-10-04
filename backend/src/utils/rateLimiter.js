// In-process sliding-window rate limiter for outbound email sends. The app is a single
// Express process with no job queue, so a module-level timestamp list is enough — no
// Redis/distributed state needed at this scale.
const sendTimestamps = [];
const WINDOW_MS = 60_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Blocks (without spinning) until a send is allowed under `limitPerMinute`.
// 0/falsy = unlimited, i.e. today's actual behavior.
async function waitForSendSlot(limitPerMinute) {
  if (!limitPerMinute || limitPerMinute <= 0) return;

  for (;;) {
    const now = Date.now();
    while (sendTimestamps.length && now - sendTimestamps[0] >= WINDOW_MS) sendTimestamps.shift();

    if (sendTimestamps.length < limitPerMinute) {
      sendTimestamps.push(now);
      return;
    }
    await sleep(WINDOW_MS - (now - sendTimestamps[0]) + 10);
  }
}

module.exports = { waitForSendSlot };
