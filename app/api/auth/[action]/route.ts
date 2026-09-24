import { authenticate, clearCookies, clientIp, json, limited, sameOrigin, sessionCookies, strongPassword, supabase, supabaseHeaders } from "../../_lib/server-auth";

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  if (!sameOrigin(request)) return json({ error: "Origen no permitido" }, 403);
  const { action } = await context.params;
  if (limited(`${action}:${clientIp(request)}`, action === "login" ? 10 : 20)) return json({ error: "Demasiados intentos; espera unos minutos" }, 429);
  const raw = await request.text();
  if (raw.length > 20_000) return json({ error: "Solicitud demasiado grande" }, 413);
  let data: Record<string, any> = {};
  try { data = JSON.parse(raw || "{}"); } catch { return json({ error: "JSON inválido" }, 400); }
  if (action === "login") {
    if (typeof data.email !== "string" || typeof data.password !== "string") return json({ error: "Datos inválidos" }, 400);
    const result = await supabase("/auth/v1/token?grant_type=password", { method: "POST", headers: supabaseHeaders(), body: JSON.stringify({ email: data.email.trim(), password: data.password }) });
    if (!result.response.ok) return json({ error: result.body.error_description || "Correo o contraseña incorrectos" }, 401);
    return json({ user: result.body.user, authenticated: true }, 200, sessionCookies(result.body.access_token, result.body.refresh_token, result.body.expires_in));
  }
  if (action === "signup") {
    if (typeof data.email !== "string" || !/^\S+@\S+\.\S+$/.test(data.email) || !strongPassword(data.password)) return json({ error: "Usa 12 caracteres con mayúscula, minúscula, número y símbolo" }, 400);
    const redirect = `${new URL(request.url).origin}/?view=account`;
    const result = await supabase(`/auth/v1/signup?redirect_to=${encodeURIComponent(redirect)}`, { method: "POST", headers: supabaseHeaders(), body: JSON.stringify({ email: data.email.trim(), password: data.password }) });
    if (!result.response.ok) return json({ error: result.body.msg || result.body.error_description || "No se pudo crear la cuenta" }, 400);
    const cookies = result.body.access_token ? sessionCookies(result.body.access_token, result.body.refresh_token, result.body.expires_in) : [];
    return json({ user: result.body.user, authenticated: Boolean(result.body.access_token) }, 200, cookies);
  }
  if (action === "adopt") {
    if (typeof data.access_token !== "string" || typeof data.refresh_token !== "string") return json({ error: "Enlace inválido" }, 400);
    const verified = await supabase("/auth/v1/user", { headers: supabaseHeaders(data.access_token) });
    if (!verified.response.ok) return json({ error: "Enlace vencido o inválido" }, 401);
    return json({ user: verified.body, authenticated: true }, 200, sessionCookies(data.access_token, data.refresh_token, Number(data.expires_in) || 3600));
  }
  if (action === "recover") {
    if (typeof data.email !== "string") return json({ error: "Correo inválido" }, 400);
    const redirect = `${new URL(request.url).origin}/?view=account`;
    const result = await supabase(`/auth/v1/recover?redirect_to=${encodeURIComponent(redirect)}`, { method: "POST", headers: supabaseHeaders(), body: JSON.stringify({ email: data.email.trim() }) });
    return result.response.ok ? json({ sent: true }) : json({ error: "No se pudo enviar el correo" }, 400);
  }
  if (action === "resend") {
    if (typeof data.email !== "string") return json({ error: "Correo inválido" }, 400);
    const redirect = `${new URL(request.url).origin}/?view=account`;
    const result = await supabase(`/auth/v1/resend?redirect_to=${encodeURIComponent(redirect)}`, { method: "POST", headers: supabaseHeaders(), body: JSON.stringify({ type: "signup", email: data.email.trim() }) });
    return result.response.ok ? json({ sent: true }) : json({ error: "No se pudo reenviar la confirmación" }, 400);
  }
  if (action === "session") {
    const session = await authenticate(request);
    return session ? json({ user: session.user, authenticated: true }, 200, session.cookies) : json({ authenticated: false }, 200, clearCookies());
  }
  if (action === "password") {
    if (!strongPassword(data.password)) return json({ error: "Usa 12 caracteres con mayúscula, minúscula, número y símbolo" }, 400);
    const session = await authenticate(request);
    if (!session) return json({ error: "Sesión requerida" }, 401, clearCookies());
    const result = await supabase("/auth/v1/user", { method: "PUT", headers: supabaseHeaders(session.access), body: JSON.stringify({ password: data.password }) });
    return result.response.ok ? json({ updated: true }, 200, session.cookies) : json({ error: "No se pudo cambiar la contraseña" }, 400, session.cookies);
  }
  if (action === "logout") {
    const session = await authenticate(request);
    if (session) await supabase("/auth/v1/logout", { method: "POST", headers: supabaseHeaders(session.access) }).catch(() => null);
    return json({ signedOut: true }, 200, clearCookies());
  }
  if (action === "delete") {
    const session = await authenticate(request);
    if (!session) return json({ error: "Sesión requerida" }, 401, clearCookies());
    const result = await supabase("/functions/v1/delete-account", { method: "POST", headers: supabaseHeaders(session.access), body: "{}" });
    return result.response.ok ? json({ deleted: true }, 200, clearCookies()) : json({ error: "No se pudo eliminar la cuenta" }, 500, session.cookies);
  }
  return json({ error: "Acción no encontrada" }, 404);
}
