import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigin = "https://basel-code-lab.baselindie.chatgpt.site";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Método no permitido" }), { status: 405, headers: corsHeaders });

  const authorization = request.headers.get("Authorization");
  if (!authorization) return new Response(JSON.stringify({ error: "Sesión requerida" }), { status: 401, headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } }
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return new Response(JSON.stringify({ error: "Sesión inválida" }), { status: 401, headers: corsHeaders });

  const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteError) return new Response(JSON.stringify({ error: "No se pudo eliminar la cuenta" }), { status: 500, headers: corsHeaders });

  return new Response(JSON.stringify({ deleted: true }), { status: 200, headers: corsHeaders });
});
