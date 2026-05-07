import LoginToBookPanel from "@/components/LoginToBookPanel";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await searchParams;

  return (
    <div className="min-h-screen bg-dark-surface text-white flex">
      <LoginToBookPanel
        backHref="/"
        oauthNext="/admin"
        googleEndpoint="/api/auth/admin/google"
      />
    </div>
  );
}
