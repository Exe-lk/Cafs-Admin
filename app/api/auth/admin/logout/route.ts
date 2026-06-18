import { NextResponse, type NextRequest } from "next/server";
import { getSiteUrl } from "@/lib/auth/request-origin";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

export async function GET(request: NextRequest) {
  const origin = getSiteUrl(request);
  const supabase = await createSupabaseRouteHandlerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", origin));
}
