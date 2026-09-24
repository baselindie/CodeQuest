const ACCESS_COOKIE = "cq_access";
const REFRESH_COOKIE = "cq_refresh";
export type AuthSession = { access: string; refresh: string; user: Record<string, unknown>; cookies: string[] };

export function json(body: unknown, status = 200, cookies: string[] = []) {
  const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" });
  cookies.forEach(value => headers.append("Set-Cookie", value));
  return new Response(JSON.stringify(body), { status, headers });
}
export function sameOrigin(request: Request) { const origin = request.headers.get("Origin"); return !origin || origin === new URL(request.url).origin; }
export function clientIp(request: Request) { return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"; }
const attempts = new Map<string, { start: number; count: number }>();
export function limited(key: string, max = 10, period = 15 * 60_000) { const now = Date.now(), item = attempts.get(key); if (!item || now - item.start >= period) { attempts.set(key, { start: now, count: 1 }); return false; } item.count += 1; return item.count > max; }
export function strongPassword(password: unknown) { return typeof password === "string" && password.length >= 12 && password.length <= 128 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password); }
function parseCookies(request: Request) { return Object.fromEntries((request.headers.get("Cookie") || "").split(";").map(v => v.trim()).filter(v => v.includes("=")).map(v => { const at = v.indexOf("="); return [decodeURIComponent(v.slice(0, at)), decodeURIComponent(v.slice(at + 1))]; })); }
function cookie(name: string, value: string, maxAge: number) { return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`; }
export function sessionCookies(access: string, refresh: string, expiresIn = 3600) { return [cookie(ACCESS_COOKIE, access, Math.max(60, expiresIn)), cookie(REFRESH_COOKIE, refresh, 60 * 60 * 24 * 30)]; }
export function clearCookies() { return [cookie(ACCESS_COOKIE, "", 0), cookie(REFRESH_COOKIE, "", 0)]; }
export function supabaseHeaders(token?: string) { const key = process.env.SUPABASE_PUBLISHABLE_KEY || ""; return { apikey: key, Authorization: `Bearer ${token || key}`, "Content-Type": "application/json" }; }
export async function supabase(path: string, init: RequestInit = {}) { const url = process.env.SUPABASE_URL; if (!url) throw new Error("Supabase no está configurado"); const response = await fetch(`${url}${path}`, init); const body = await response.json().catch(() => ({})); return { response, body }; }
export async function authenticate(request: Request): Promise<AuthSession | null> {
  const stored = parseCookies(request); let access = stored[ACCESS_COOKIE] || "", refresh = stored[REFRESH_COOKIE] || ""; if (!access || !refresh) return null;
  let check = await supabase("/auth/v1/user", { headers: supabaseHeaders(access) });
  if (check.response.ok) return { access, refresh, user: check.body, cookies: [] };
  const renewed = await supabase("/auth/v1/token?grant_type=refresh_token", { method: "POST", headers: supabaseHeaders(), body: JSON.stringify({ refresh_token: refresh }) });
  if (!renewed.response.ok || !renewed.body.access_token) return null;
  access = renewed.body.access_token; refresh = renewed.body.refresh_token; check = await supabase("/auth/v1/user", { headers: supabaseHeaders(access) }); if (!check.response.ok) return null;
  return { access, refresh, user: check.body, cookies: sessionCookies(access, refresh, renewed.body.expires_in) };
}
