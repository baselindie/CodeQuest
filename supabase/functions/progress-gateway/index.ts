import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const allowedOrigin = "https://basel-code-lab.baselindie.chatgpt.site";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

const windows = new Map<string, { started: number; count: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function allowedRequest(key: string) {
  const now = Date.now();
  const current = windows.get(key);
  if (!current || now - current.started >= WINDOW_MS) {
    windows.set(key, { started: now, count: 1 });
    return true;
  }
  if (current.count >= MAX_REQUESTS) return false;
  current.count += 1;
  return true;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "Método no permitido" }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return response({ error: "Sesión requerida" }, 401);

  const raw = await request.text();
  if (raw.length > 150_000) return response({ error: "Solicitud demasiado grande" }, 413);

  let payload: { action?: string; progress?: unknown };
  try { payload = JSON.parse(raw); } catch { return response({ error: "JSON inválido" }, 400); }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return response({ error: "Sesión inválida" }, 401);

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowedRequest(`${user.id}:${forwarded}`)) return response({ error: "Demasiadas solicitudes; espera un minuto" }, 429);

  if (payload.action === "load") {
    const { data, error: loadError } = await userClient
      .from("codequest_progress")
      .select("progress,client_updated_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (loadError) return response({ error: "No se pudo cargar el progreso" }, 500);
    return response(data || null);
  }

  if (payload.action !== "save" || !payload.progress || typeof payload.progress !== "object" || Array.isArray(payload.progress)) {
    return response({ error: "Datos de progreso inválidos" }, 400);
  }
  const progressText = JSON.stringify(payload.progress);
  if (progressText.length > 100_000) return response({ error: "El progreso supera el tamaño permitido" }, 413);

  const stamp = new Date().toISOString();
  const { error: saveError } = await userClient.from("codequest_progress").upsert({
    user_id: user.id,
    progress: payload.progress,
    client_updated_at: stamp
  }, { onConflict: "user_id" });
  if (saveError) return response({ error: "No se pudo guardar el progreso" }, 500);
  return response({ client_updated_at: stamp });
});
