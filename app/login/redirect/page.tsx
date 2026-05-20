import LoginToBookPanel from "@/components/LoginToBookPanel";

type SearchParams = {
  service?: string;
  meta?: string;
  date?: string;
  time?: string;
  price?: string;
  auth_error?: string;
};

function getAuthErrorMessage(authError: string | undefined): string | null {
  if (!authError) return null;
  if (authError === "admin_access_denied") {
    return "You do not have admin access for this system.";
  }
  if (authError === "admin_profile_sync_failed") {
    return "We could not complete admin sign-in. Please contact support.";
  }
  return "Sign-in failed. Please try again.";
}

export default async function RedirectLoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const authErrorMessage = getAuthErrorMessage(params.auth_error);

  return (
    <div className="min-h-screen bg-dark-surface text-white flex">
      <LoginToBookPanel
        backHref="/"
        oauthNext="/admin"
        googleEndpoint="/api/auth/admin/google"
        googleOAuthMode="redirect"
        initialErrorMessage={authErrorMessage}
      />
    </div>
  );
}

