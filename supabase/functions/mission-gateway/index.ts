import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const windows = new Map<string, { start: number; count: number }>();
function limited(key: string) { const now=Date.now(),item=windows.get(key);if(!item||now-item.start>60_000){windows.set(key,{start:now,count:1});return false}item.count+=1;return item.count>30 }
function languageFor(index: number) { if(index<4)return "html";if(index<8)return "css";if(index<12)return "js";const n=index<36?index:index<76?index-36:index<106?index-76:index-106;return ["html","css","js"][n%3]; }
function validSolution(index: number, language: string, code: string) {
  if (/<script\b|\bon\w+\s*=|javascript:|document\.cookie|eval\s*\(/i.test(code)) return false;
  const exact = [
    /<h1>\s*hello,? codequest!\s*<\/h1>[\s\S]*<p>\s*i am learning html\.?\s*<\/p>/i,
    /<a\s+href=["']https:\/\/example\.com["'][^>]*>\s*visit website\s*<\/a>/i,
    /<img(?=[^>]*src=["']logo\.png["'])(?=[^>]*alt=["']codequest logo["'])[^>]*>/i,
    /<h1>.+<\/h1>[\s\S]*<p>.+<\/p>[\s\S]*<a\s.+<\/a>/is,
    /p\s*\{[^}]*color\s*:\s*blue/i,
    /button\s*\{(?=[^}]*padding\s*:\s*16px)(?=[^}]*margin\s*:\s*10px)/i,
    /\.container\s*\{(?=[^}]*display\s*:\s*flex)(?=[^}]*justify-content\s*:\s*center)/i,
    /\.card\s*\{(?=[^}]*padding\s*:)(?=[^}]*background\s*:)(?=[^}]*border-radius\s*:)/i,
    /const\s+language\s*=\s*["']javascript["']/i,
    /if\s*\(\s*score\s*>\s*10\s*\)/i,
    /function\s+greet\s*\([^)]*\)\s*\{[^}]*alert\s*\(/is,
    /(let|var)\s+count\s*=\s*0[\s\S]*function\s+add[\s\S]*count\+\+/i
  ];
  if (index < exact.length) return exact[index].test(code);
  const id=index+1;
  if (language === "html") {
    const meaningful=(code.match(/<(?:section|ul|ol|li|a|form|label|input|button|header|main|footer|img|figure|figcaption|table|caption|thead|tbody|tr|th|td|nav|audio|video|head|title|meta|details|summary)\b/gi)||[]).length;
    const closed=/<\/\w+>|<(?:img|input|meta)\b/i.test(code);
    const richSingle=/<a(?=[^>]*href=)(?=[^>]*title=)[^>]*>.+<\/a>/is.test(code)||/<img(?=[^>]*src=)(?=[^>]*alt=)(?=[^>]*width=)(?=[^>]*height=)[^>]*>/is.test(code)||/<button(?=[^>]*aria-label=)[^>]*>.+<\/button>/is.test(code)||/<(?:audio|video)(?=[^>]*src=)(?=[^>]*controls)[^>]*>.+<\/(?:audio|video)>/is.test(code);
    return closed&&(meaningful>=2||richSingle)&&(/>\s*[^<\s][^<]*</s.test(code)||/<(?:img|input|meta)\b/i.test(code));
  }
  if (language === "css") {
    const block=code.match(new RegExp(`\\.quest-${id}(?::hover)?\\s*\\{([^}]*)\\}`,"i"));
    if(!block)return false;
    const declarations=(code.match(/[\w-]+\s*:\s*[^;}{]+/g)||[]).length;
    return declarations>=2&&!/expression\s*\(|url\s*\(\s*["']?javascript:/i.test(code);
  }
  const syntax=/(const|let|function|class|if|forEach|querySelector|localStorage|async|try)\b/.test(code)&&/[;{}()[\]=]/.test(code);
  const missionMarker=new RegExp(`(?:quest-?${id}|Quest${id}|Unlocked ${id})`,"i").test(code);
  const substantial=(code.match(/\b(?:const|let|return|if|function|class|await|forEach|filter|addEventListener|setItem|catch)\b/g)||[]).length>=2;
  const structuralPair=/forEach\s*\([\s\S]*console\.log\s*\(|querySelector\s*\([\s\S]*addEventListener\s*\(|localStorage\.setItem\s*\(|numbers\.filter\s*\(/i.test(code);
  return syntax&&(missionMarker||substantial||structuralPair);
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return reply({ error: "Método no permitido" }, 405);
  const authorization=request.headers.get("Authorization");
  if(!authorization?.startsWith("Bearer "))return reply({error:"Sesión requerida"},401);
  const raw=await request.text();if(raw.length>25_000)return reply({error:"Solicitud demasiado grande"},413);
  let payload:{mission_index?:unknown;language?:unknown;code?:unknown;explanation?:unknown};try{payload=JSON.parse(raw||"{}")}catch{return reply({error:"JSON inválido"},400)}
  const index=payload.mission_index,code=payload.code,explanation=payload.explanation;
  if(!Number.isInteger(index)||Number(index)<0||Number(index)>130||typeof code!=="string"||code.trim().length<12||code.length>20_000||typeof explanation!=="string"||explanation.trim().split(/\s+/).length<5||explanation.length>400)return reply({error:"Prueba de misión inválida"},400);
  const expected=languageFor(Number(index));if(payload.language!==expected||!validSolution(Number(index),expected,code))return reply({error:"La solución no cumple los requisitos de esta misión"},422);
  const url=Deno.env.get("SUPABASE_URL")!,serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,admin=createClient(url,serviceKey,{auth:{persistSession:false}});
  const {data:{user},error:userError}=await admin.auth.getUser(authorization.slice(7));if(userError||!user)return reply({error:"Sesión inválida"},401);
  if(limited(user.id))return reply({error:"Demasiadas comprobaciones; espera un minuto"},429);
  const {count,error:countError}=await admin.from("codequest_mission_completions").select("mission_index",{count:"exact",head:true}).eq("user_id",user.id);if(countError)return reply({error:"No se pudo comprobar el avance"},500);
  const completed=count||0;if(Number(index)>completed)return reply({error:`Primero completa la misión ${completed+1}`},409);
  const {error}=await admin.from("codequest_mission_completions").upsert({user_id:user.id,mission_index:index,language:expected},{onConflict:"user_id,mission_index"});if(error)return reply({error:"No se pudo registrar la misión"},500);
  return reply({verified:true,verified_count:Math.max(completed,Number(index)+1)});
});
