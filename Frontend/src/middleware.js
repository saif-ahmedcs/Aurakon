import { NextResponse } from "next/server";

/**
 * Next.js Edge Middleware – proxies all /api/* requests to the Express backend.
 *
 * BACKEND_INTERNAL_URL must be set in the Vercel project's environment
 * variables to the Back4App backend URL, e.g.:
 *   BACKEND_INTERNAL_URL=https://aurakonbackend-ojzhznso.b4a.run
 */
export function middleware(request) {
  const backendUrl = process.env.BACKEND_INTERNAL_URL?.trim();

  if (process.env.NODE_ENV === "production" && !backendUrl) {
    const errorMsg =
      "[middleware] FATAL: BACKEND_INTERNAL_URL is not defined in production environment. " +
      "Configure BACKEND_INTERNAL_URL in Vercel project settings to point to the backend service.";
    console.error(errorMsg);
    return NextResponse.json(
      { error: "Backend not configured. Contact the administrator." },
      { status: 503 },
    );
  }

  const resolvedBackendUrl = (
    backendUrl || "http://localhost:3000"
  ).replace(/\/+$/, "");

  const incoming = new URL(request.url);
  const destination = new URL(
    `${resolvedBackendUrl}${incoming.pathname}${incoming.search}`,
  );

  return NextResponse.rewrite(destination);
}

export const config = {
  matcher: "/api/:path*",
};
