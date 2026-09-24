import { authenticate, clearCookies, json, sameOrigin, supabase, supabaseHeaders } from "../../_lib/server-auth";

const allowedStatuses = new Set(["new", "in_review", "resolved"]);

async function isAdmin(access: string, userId: string) {
  const result = await supabase(`/rest/v1/codequest_admins?user_id=eq.${encodeURIComponent(userId)}&select=user_id&limit=1`, {
    headers: supabaseHeaders(access),
  });
  return result.response.ok && Array.isArray(result.body) && result.body.length === 1;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Origen no permitido" }, 403);
  const session = await authenticate(request);
  if (!session) return json({ error: "Inicia sesión" }, 401, clearCookies());
  const userId = String(session.user.id || "");
  if (!userId || !(await isAdmin(session.access, userId))) return json({ error: "Acceso reservado al administrador" }, 403, session.cookies);

  const raw = await request.text();
  if (raw.length > 1000) return json({ error: "Solicitud demasiado grande" }, 413, session.cookies);
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(raw || "{}"); } catch { return json({ error: "JSON inválido" }, 400, session.cookies); }
  const action = String(data.action || "check");

  if (action === "check") return json({ admin: true }, 200, session.cookies);
  if (action === "list") {
    const result = await supabase("/rest/v1/codequest_beta_feedback?select=id,feedback_type,message,page,status,created_at,updated_at&order=created_at.desc&limit=200", { headers: supabaseHeaders(session.access) });
    if (!result.response.ok || !Array.isArray(result.body)) return json({ error: "No se pudieron cargar los reportes" }, 500, session.cookies);
    return json({ admin: true, reports: result.body }, 200, session.cookies);
  }
  if (action === "status") {
    const id = Number(data.id), status = String(data.status || "");
    if (!Number.isSafeInteger(id) || id < 1 || !allowedStatuses.has(status)) return json({ error: "Actualización inválida" }, 400, session.cookies);
    const result = await supabase(`/rest/v1/codequest_beta_feedback?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...supabaseHeaders(session.access), Prefer: "return=representation" },
      body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
    });
    if (!result.response.ok || !Array.isArray(result.body) || result.body.length !== 1) return json({ error: "No se pudo actualizar el reporte" }, 500, session.cookies);
    return json({ saved: true }, 200, session.cookies);
  }
  return json({ error: "Acción no permitida" }, 400, session.cookies);
}
