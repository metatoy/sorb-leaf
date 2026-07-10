// bridgeAuth.js — hosted-bridge Authorization header (Plugin-UX U4).
//
// Sorb's hosted bridge (https://bridge.sorbcloud.com) requires
// `Authorization: Bearer <key>` on every route except /health. The key is a
// read-only publishable `sorb_pk_…` (safe to ship in a distributable; 403s on
// writes). Local `sorb dev` runs with NO auth, so when no key is configured we
// send NO header and the localhost path is byte-for-byte unchanged.
//
// One place builds the header so both fetch sites (TokenProvider preview poll +
// verify.js) stay consistent. Pure + node:test-able; no DOM, no fetch.

/**
 * Build the request headers for a hosted-bridge call, merging in the bearer
 * `Authorization` header only when a non-empty key is configured.
 *
 * @param {string} [key]   The configured bearer key (`config.preview.key`), if any.
 * @param {Record<string,string>} [base]   Base headers to extend (e.g. Content-Type).
 * @returns {Record<string,string>}
 */
export const bridgeHeaders = (key, base) => {
  const headers = base ? { ...base } : {}
  if (typeof key === 'string' && key.trim() !== '') {
    headers.Authorization = `Bearer ${key.trim()}`
  }
  return headers
}
