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

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Entraverse Sandbox on Vercel

Deploy only the frontend app in this directory (`entraverse`) as a Vercel project.

Required setup:

- Set the Vercel project root directory to `entraverse`
- Keep framework detection as `Next.js`
- Provide `NEXT_PUBLIC_API_URL` for preview/production if you need API-backed flows
  Example: `https://api.entraverse.com/api`

Notes:

- If `NEXT_PUBLIC_API_URL` is not set in production, the app now falls back to a safe placeholder origin instead of `127.0.0.1`
- That means the sandbox can still build on Vercel, but API-dependent pages and actions will fail until the backend is reachable publicly
- The Laravel API in `entraverse-api` is intentionally out of scope for this Vercel sandbox phase
- For the production API cutover checklist, see `../docs/api-entraverse-migration.md`
