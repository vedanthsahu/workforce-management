import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtDecode } from "jwt-decode";
 
interface AccessTokenClaims {
  role?: string;
}
 
export function middleware(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value;
  const { pathname } = req.nextUrl;
 
  if (!token) {
    if (pathname === "/login") return NextResponse.next();
    // Refresh token still present — access_token cookie just expired (browser removed it).
    // Let the page through; the axios interceptor will call /auth/refresh and retry.
    if (req.cookies.get("refresh_token")?.value) return NextResponse.next();
    return NextResponse.redirect(new URL("/login", req.url));
  }
 
  let role: string | undefined;
  try {
    role = jwtDecode<AccessTokenClaims>(token).role;
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
 
  if (pathname === "/" || pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
 
  if (pathname.startsWith("/admin") && role !== "TENANT_ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname.startsWith("/front_office") && role !== "FRONT_OFFICE") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}
 
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.ico$|.*\\.webp$).*)"],
};

