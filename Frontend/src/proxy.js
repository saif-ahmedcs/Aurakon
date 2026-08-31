import { NextResponse } from "next/server";

export function proxy(request) {
  const backendUrl =
    process.env.BACKEND_INTERNAL_URL || "http://localhost:3000";
  const incoming = new URL(request.url);
  const destination = new URL(
    `${backendUrl}${incoming.pathname}${incoming.search}`,
  );

  return NextResponse.rewrite(destination);
}

export const config = {
  matcher: "/api/:path*",
};
