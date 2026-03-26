import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/auth/login";
  return NextResponse.redirect(url);
}
