import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const connectSources = ["'self'"];
  const configuredSupabaseUrl = process.env.SUPABASE_URL;

  if (configuredSupabaseUrl) {
    try {
      const supabaseOrigin = new URL(configuredSupabaseUrl).origin;
      if (supabaseOrigin.startsWith("https://")) connectSources.push(supabaseOrigin);
    } catch {
      // Ignore malformed configuration instead of weakening the policy.
    }
  }

  response.headers.set("Content-Security-Policy", `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src ${connectSources.join(" ")}; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`);
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  return response;
}

export const config = { matcher: "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|ico|webmanifest)$).*)" };
