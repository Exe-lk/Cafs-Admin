import LoginToBookPanel from "@/components/LoginToBookPanel";

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

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const authErrorMessage = getAuthErrorMessage(params.auth_error);

  return (
    <div className="min-h-screen bg-dark-surface text-white flex">
      <LoginToBookPanel
        backHref="/"
        oauthNext="/admin"
        googleEndpoint="/api/auth/admin/google"
        initialErrorMessage={authErrorMessage}
      />
    </div>
  );
}
