/* Central connection settings for the Khalasa web applications. */
window.KhalasaApi = (() => {
  const baseUrl = 'https://khalasa-api.onrender.com/v1';
  const storageKey = 'khalasaCustomerSession';
  const session = () => { try { return JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch { return null; } };
  const saveSession = value => localStorage.setItem(storageKey, JSON.stringify(value));
  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
    const token = session()?.token;
    if (token) headers.set('authorization', `Bearer ${token}`);
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'API_REQUEST_FAILED');
    return payload;
  }
  return { baseUrl, session, saveSession, request };
})();
