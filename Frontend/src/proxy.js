import { NextResponse } from "next/server";

export function proxy(request) {
  const backendUrl = process.env.BACKEND_INTERNAL_URL?.trim();

  if (process.env.NODE_ENV === "production" && !backendUrl) {
    const errorMsg =
      "[proxy] FATAL: BACKEND_INTERNAL_URL is not defined in production environment. " +
      "Configure BACKEND_INTERNAL_URL to point to the backend service.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const resolvedBackendUrl = (backendUrl || "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
  const incoming = new URL(request.url);
  const destination = new URL(
    `${resolvedBackendUrl}${incoming.pathname}${incoming.search}`,
  );

  return NextResponse.rewrite(destination);
}

export const config = {
  matcher: "/api/:path*",
};
