import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const safeName = (value: unknown) => typeof value === "string" ? value.trim().replace(/[<>]/g, "").replace(/\s+/g, " ").slice(0, 48) : "";
const validCode = (value: unknown) => typeof value === "string" && /^CQ-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(value);
const makeCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(bytes, byte => alphabet[byte % alphabet.length]).join("");
  return `CQ-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8)}`;
};

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return reply({ error: "Método no permitido" }, 405);
  const raw = await request.text();
  if (raw.length > 2_000) return reply({ error: "Solicitud demasiado grande" }, 413);
  let payload: { action?: string; code?: unknown; display_name?: unknown };
  try { payload = JSON.parse(raw || "{}"); } catch { return reply({ error: "JSON inválido" }, 400); }

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  if (payload.action === "verify") {
    if (!validCode(payload.code)) return reply({ error: "Código de certificado inválido" }, 400);
    const { data, error } = await admin.from("codequest_certificates")
      .select("certificate_code,display_name,completed_missions,issued_at,status")
      .eq("certificate_code", payload.code).eq("status", "active").maybeSingle();
    if (error) return reply({ error: "No se pudo verificar el certificado" }, 500);
    return data ? reply({ certificate: data }) : reply({ error: "Certificado no encontrado" }, 404);
  }

  if (payload.action !== "issue") return reply({ error: "Acción inválida" }, 400);
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return reply({ error: "Sesión requerida" }, 401);
  const token = authorization.slice(7);
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return reply({ error: "Sesión inválida" }, 401);

  const name = safeName(payload.display_name);
  if (!name) return reply({ error: "Escribe un nombre válido" }, 400);
  const { count: completed, error: progressError } = await admin.from("codequest_mission_completions")
    .select("mission_index", { count: "exact", head: true }).eq("user_id", user.id);
  if (progressError) return reply({ error: "No se pudo comprobar el progreso" }, 500);
  if (completed !== 131) return reply({ error: `Completa las 131 misiones verificadas. Llevas ${completed || 0}.` }, 403);

  const { data: existing } = await admin.from("codequest_certificates")
    .select("certificate_code,display_name,completed_missions,issued_at,status")
    .eq("user_id", user.id).maybeSingle();
  if (existing) return reply({ certificate: existing });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = makeCode();
    const { data, error } = await admin.from("codequest_certificates").insert({ certificate_code: code, user_id: user.id, display_name: name })
      .select("certificate_code,display_name,completed_missions,issued_at,status").single();
    if (!error && data) return reply({ certificate: data }, 201);
    if (error?.code !== "23505") return reply({ error: "No se pudo emitir el certificado" }, 500);
  }
  return reply({ error: "No se pudo generar un código único" }, 500);
});
