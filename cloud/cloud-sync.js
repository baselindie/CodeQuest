/* CodeQuest cloud adapter. Activated only after a Supabase project is configured. */
export function createCodeQuestCloud({ url, publishableKey, redirectUrl }) {
  const sessionKey = 'codequest-cloud-session-v1';
  const headers = token => ({
    apikey: publishableKey,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const readSession = () => {
    try { return JSON.parse(localStorage.getItem(sessionKey) || 'null'); }
    catch { localStorage.removeItem(sessionKey); return null; }
  };
  const writeSession = session => session
    ? localStorage.setItem(sessionKey, JSON.stringify(session))
    : localStorage.removeItem(sessionKey);

  async function request(path, options = {}) {
    const response = await fetch(`${url}${path}`, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.msg || body.message || body.error || body.error_description || 'No se pudo conectar');
    return body;
  }

  async function signUp(email, password) {
    const redirect = redirectUrl ? `?redirect_to=${encodeURIComponent(redirectUrl)}` : '';
    return request(`/auth/v1/signup${redirect}`, {
      method: 'POST', headers: headers(publishableKey), body: JSON.stringify({ email, password })
    });
  }

  async function captureRedirectSession() {
    const params = new URLSearchParams(location.hash.replace(/^#/, ''));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (!accessToken || !refreshToken) return null;
    const user = await request('/auth/v1/user', { headers: headers(accessToken) });
    const session = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: Math.floor(Date.now() / 1000) + Number(params.get('expires_in') || 3600),
      token_type: params.get('token_type') || 'bearer',
      auth_event_type: params.get('type') || '',
      user
    };
    writeSession(session);
    history.replaceState(null, '', '/?view=account');
    return session;
  }

  async function signIn(email, password) {
    const session = await request('/auth/v1/token?grant_type=password', {
      method: 'POST', headers: headers(publishableKey), body: JSON.stringify({ email, password })
    });
    writeSession(session);
    return session;
  }

  async function requestPasswordReset(email) {
    const redirect = redirectUrl ? `?redirect_to=${encodeURIComponent(redirectUrl)}` : '';
    return request(`/auth/v1/recover${redirect}`, {
      method: 'POST', headers: headers(publishableKey), body: JSON.stringify({ email })
    });
  }

  async function resendConfirmation(email) {
    const redirect = redirectUrl ? `?redirect_to=${encodeURIComponent(redirectUrl)}` : '';
    return request(`/auth/v1/resend${redirect}`, {
      method: 'POST', headers: headers(publishableKey), body: JSON.stringify({ type: 'signup', email })
    });
  }

  async function updatePassword(password) {
    const session = await activeSession();
    const user = await request('/auth/v1/user', {
      method: 'PUT', headers: headers(session.access_token), body: JSON.stringify({ password })
    });
    const updated = { ...session, user, auth_event_type: '' };
    writeSession(updated);
    return user;
  }

  async function deleteAccount() {
    const session = await activeSession();
    await request('/functions/v1/delete-account', {
      method: 'POST', headers: headers(session.access_token), body: '{}'
    });
    writeSession(null);
  }

  async function refreshSession() {
    const session = readSession();
    if (!session?.refresh_token) throw new Error('La sesión terminó. Inicia sesión otra vez');
    const refreshed = await request('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', headers: headers(publishableKey), body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    writeSession(refreshed);
    return refreshed;
  }

  async function activeSession() {
    const session = readSession();
    if (!session) throw new Error('Inicia sesión para sincronizar');
    return !session.expires_at || session.expires_at * 1000 > Date.now() + 60000
      ? session
      : refreshSession();
  }

  async function signOut() {
    const session = readSession();
    if (session?.access_token) {
      await fetch(`${url}/auth/v1/logout`, { method: 'POST', headers: headers(session.access_token) }).catch(() => {});
    }
    writeSession(null);
  }

  async function saveProgress(progress) {
    const session = await activeSession();
    const result = await request('/functions/v1/progress-gateway', {
      method: 'POST',
      headers: headers(session.access_token),
      body: JSON.stringify({ action: 'save', progress })
    });
    return result.client_updated_at;
  }

  async function loadProgress() {
    const session = await activeSession();
    return request('/functions/v1/progress-gateway', {
      method: 'POST',
      headers: headers(session.access_token),
      body: JSON.stringify({ action: 'load' })
    });
  }

  return { signUp, signIn, signOut, refreshSession, captureRedirectSession, requestPasswordReset, resendConfirmation, updatePassword, deleteAccount, saveProgress, loadProgress, readSession };
}
