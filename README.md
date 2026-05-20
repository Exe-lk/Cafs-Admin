This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Auth / OAuth (admin Google sign-in)

Admin OAuth redirect URLs are built from `NEXT_PUBLIC_SITE_URL` in `.env`, not from the Supabase dashboard **Site URL**. That lets you run local development on localhost while keeping production as the canonical Site URL in Supabase.

| Setting | Local development | Deployed environment |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Your deployed app URL (e.g. `https://your-app.example`) |
| `AUTH_REDIRECT_ALLOWLIST` (optional) | `http://localhost:3000` | Comma-separated allowed origins; must include `NEXT_PUBLIC_SITE_URL` when set |
| Supabase **Redirect URLs** | `http://localhost:3000/api/auth/admin/callback` | `{NEXT_PUBLIC_SITE_URL}/api/auth/admin/callback` |

**Notes**

- Restart the dev server (`yarn dev`) after changing any `NEXT_PUBLIC_*` variable.
- Supabase **Site URL** can remain your production URL; the app passes an explicit `redirectTo` from `NEXT_PUBLIC_SITE_URL` (no query string on that URL).
- The post-login path (`/admin`) is stored in a short-lived cookie, not on `redirectTo`, so Supabase allowlist matching stays exact.
- List callback URLs **without** `?next=...` in the Supabase dashboard. Optional wildcard: `http://localhost:3000/api/auth/admin/callback**`
- Admin sign-in uses a full-page GET to `/api/auth/admin/google?next=...` (not `fetch`) so PKCE cookies are set before Google redirects.
- Both localhost and production callback URLs must be listed under Supabase **Redirect URLs** if you use both environments against the same Supabase project.
- In development, the google route logs `[admin-oauth] redirectTo:` with the resolved callback URL.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
