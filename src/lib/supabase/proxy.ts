import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getOwnerOnboardingState } from "@/lib/owner-onboarding";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (request.nextUrl.pathname !== "/dashboard/settings") {
    const userId =
      typeof data.claims.sub === "string" ? data.claims.sub : null;
    if (userId) {
      const onboarding = await getOwnerOnboardingState(supabase, userId);
      if (!onboarding.complete) {
        const settingsUrl = request.nextUrl.clone();
        settingsUrl.pathname = "/dashboard/settings";
        settingsUrl.search = "";
        return NextResponse.redirect(settingsUrl);
      }
    }
  }

  return response;
}
