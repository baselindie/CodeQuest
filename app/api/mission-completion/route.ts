import { authenticate, clearCookies, json, sameOrigin, supabase, supabaseHeaders } from "../_lib/server-auth";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Origen no permitido" }, 403);
  const session=await authenticate(request);if(!session)return json({error:"Sesión requerida"},401,clearCookies());
  const raw=await request.text();if(raw.length>25_000)return json({error:"Solicitud demasiado grande"},413,session.cookies);
  let data:unknown;try{data=JSON.parse(raw||"{}")}catch{return json({error:"JSON inválido"},400,session.cookies)}
  const result=await supabase("/functions/v1/mission-gateway",{method:"POST",headers:supabaseHeaders(session.access),body:JSON.stringify(data)});
  return json(result.body,result.response.status,session.cookies);
}
