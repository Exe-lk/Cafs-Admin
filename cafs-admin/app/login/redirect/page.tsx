import LoginToBookPanel from "@/components/LoginToBookPanel";

type SearchParams = {
  service?: string;
  meta?: string;
  date?: string;
  time?: string;
  price?: string;
};

export default async function RedirectLoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
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

