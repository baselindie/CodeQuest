import { authenticate, clearCookies, json, sameOrigin, supabase, supabaseHeaders } from "../_lib/server-auth";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Origen no permitido" }, 403);
  const session = await authenticate(request);
  if (!session) return json({ error: "Sesión requerida" }, 401, clearCookies());
  const raw = await request.text();
  if (raw.length > 5_000) return json({ error: "Solicitud demasiado grande" }, 413, session.cookies);
  let data: Record<string, any> = {};
  try { data = JSON.parse(raw || "{}"); } catch { return json({ error: "JSON inválido" }, 400, session.cookies); }
  const categories = new Set(["contenido", "validacion", "visual", "otro"]);
  if (!Number.isInteger(data.mission_index) || data.mission_index < 0 || data.mission_index > 130 || !categories.has(data.category) || typeof data.message !== "string" || data.message.trim().length < 10 || data.message.length > 600) return json({ error: "Reporte inválido" }, 400, session.cookies);
  const result = await supabase("/rest/v1/mission_reports", { method: "POST", headers: { ...supabaseHeaders(session.access), Prefer: "return=minimal" }, body: JSON.stringify({ user_id: session.user.id, mission_index: data.mission_index, category: data.category, message: data.message.trim() }) });
  return result.response.ok ? json({ saved: true }, 200, session.cookies) : json({ error: "No se pudo guardar el reporte" }, 500, session.cookies);
}
