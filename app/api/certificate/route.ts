import { authenticate, clearCookies, json, sameOrigin, supabase, supabaseHeaders } from "../_lib/server-auth";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Origen no permitido" }, 403);
  const raw = await request.text();
  if (raw.length > 2_000) return json({ error: "Solicitud demasiado grande" }, 413);
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(raw || "{}"); } catch { return json({ error: "JSON inválido" }, 400); }

  if (data.action === "verify") {
    const result = await supabase("/functions/v1/certificate-gateway", { method: "POST", headers: supabaseHeaders(), body: JSON.stringify({ action: "verify", code: data.code }) });
    return json(result.body, result.response.status);
  }
  if (data.action !== "issue") return json({ error: "Acción inválida" }, 400);
  const session = await authenticate(request);
  if (!session) return json({ error: "Inicia sesión para emitir tu certificado" }, 401, clearCookies());
  const result = await supabase("/functions/v1/certificate-gateway", { method: "POST", headers: supabaseHeaders(session.access), body: JSON.stringify({ action: "issue", display_name: data.display_name }) });
  return json(result.body, result.response.status, session.cookies);
}
