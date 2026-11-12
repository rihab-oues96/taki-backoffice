import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = process.env.SESSION_COOKIE ?? "taki_bo_session";

/**
 * Optimistic route protection: without a session cookie there is no point rendering the
 * dashboard. The real check (signature, account still active, permissions) is done by the
 * API on every request; this only avoids a flash of protected UI.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const { pathname, search } = request.nextUrl;

  if (pathname === "/login") {
    return hasSession ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  if (!hasSession) {
    const login = new URL("/login", request.url);
    if (pathname !== "/") login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except the API/uploads rewrites, Next internals and static files.
  matcher: ["/((?!api/|uploads/|_next/|brand/|favicon.ico).*)"],
};
