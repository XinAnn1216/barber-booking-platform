# Barber Booking Platform

Implement exactly the screenshot and nothing else

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cb7d48fc-5b30-4e08-bd7e-1c8684fdc100).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Build and deploy (Vercel)

The app is a static Vite + React single-page app with client-side routing (React Router):
`/`, `/sign-in`, `/sign-up` and `/app` (signed-in only). `npm run build` writes the site to
`dist/`, and `vercel.json` rewrites every path to `/index.html` so deep links like `/app`
load the SPA. Supabase is configured through the `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` variables in `.env` (or in the Vercel project settings).
