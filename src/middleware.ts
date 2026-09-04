import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "shadesh_admin";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const has = req.cookies.get(COOKIE_NAME)?.value;
    if (!has) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
