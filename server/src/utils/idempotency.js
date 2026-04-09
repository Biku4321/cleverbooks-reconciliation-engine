const crypto = require("crypto");
const store = new Map(); 
function generateKey(parts) {
  const raw = parts.map(String).join("|");
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Check if a key already exists in the store.
 * If not, reserve it (set a placeholder) so concurrent callers see it.
 *
 * @param {string}  key
 * @param {number}  ttlMs  How long to remember the key (default 24 h)
 * @returns {{ isDuplicate: boolean, cachedResult: any|null }}
 */
function check(key, ttlMs = 24 * 60 * 60 * 1000) {
  const now = Date.now();

  // Evict expired entries lazily
  for (const [k, v] of store) {
    if (v.expiresAt < now) store.delete(k);
  }

  if (store.has(key)) {
    const entry = store.get(key);
    if (entry.expiresAt > now) {
      return { isDuplicate: true, cachedResult: entry.result ?? null };
    }
    store.delete(key); // expired
  }

  // Reserve the slot (result = undefined until commit)
  store.set(key, { result: undefined, expiresAt: now + ttlMs });
  return { isDuplicate: false, cachedResult: null };
}

/**
 * Commit a result for a key so future replays get the same value.
 *
 * @param {string} key
 * @param {any}    result   Anything JSON-serialisable
 * @param {number} ttlMs
 */
function commit(key, result, ttlMs = 24 * 60 * 60 * 1000) {
  const expiresAt = Date.now() + ttlMs;
  store.set(key, { result, expiresAt });
}

/**
 * Higher-order helper: run `fn` once and cache its return value.
 * On replay, returns the cached value without calling `fn` again.
 *
 * @param {string}            key      Idempotency key
 * @param {() => Promise<T>}  fn       Async work to do once
 * @param {number}            ttlMs
 * @returns {Promise<{ result: T, replayed: boolean }>}
 *
 * @example
 *   const { result, replayed } = await withIdempotency(
 *     generateKey([awbNumber, "upload", batchId]),
 *     () => Settlement.create(doc),
 *   );
 */
async function withIdempotency(key, fn, ttlMs = 24 * 60 * 60 * 1000) {
  const { isDuplicate, cachedResult } = check(key, ttlMs);

  if (isDuplicate) {
    return { result: cachedResult, replayed: true };
  }

  try {
    const result = await fn();
    commit(key, result, ttlMs);
    return { result, replayed: false };
  } catch (err) {
    store.delete(key);
    throw err;
  }
}

function idempotencyMiddleware(ttlMs = 24 * 60 * 60 * 1000) {
  return (req, res, next) => {
    const key = req.headers["x-idempotency-key"];
    if (!key) return next(); 

    req.idempotencyKey = key;

    const { isDuplicate, cachedResult } = check(key, ttlMs);
    if (isDuplicate && cachedResult !== undefined) {
      return res.status(200).json({ ...cachedResult, _replayed: true });
    }

    // Intercept res.json to cache the response body
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        commit(key, body, ttlMs);
      }
      return originalJson(body);
    };

    next();
  };
}


module.exports = { generateKey, check, commit, withIdempotency, idempotencyMiddleware };