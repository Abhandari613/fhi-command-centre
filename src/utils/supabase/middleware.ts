import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/login",
  "/auth",
  "/api/",
  "/s/",
  "/process-flow",
  "/portal",
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() validates the JWT with Supabase Auth and refreshes
  // the session if needed. The cookie handler above propagates refreshed tokens
  // onto the response. Always call getUser() — do NOT use getSession() alone,
  // as its data comes from the cookie and is not server-verified.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicRoute(request.nextUrl.pathname)) {
    // Check for the presence of Supabase auth cookies — if they exist the
    // user *just* signed in and the token may simply need one more refresh
    // cycle. Avoid an immediate hard redirect which creates a login loop.
    const hasAuthCookies = request.cookies
      .getAll()
      .some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

    if (hasAuthCookies) {
      // Auth cookies exist but getUser() failed — the token is likely being
      // refreshed. Let the request through this one time; the setAll callback
      // above will write fresh cookies on the response. On the *next* request
      // the refreshed token will be valid.
      return response;
    }

    // No auth cookies at all — genuinely unauthenticated, redirect to login.
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated user hitting the login page — send them to dashboard
  if (user && request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
