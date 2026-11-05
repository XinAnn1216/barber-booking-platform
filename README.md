# Barber Booking Platform

Barberly: a Vite + React single-page app with Supabase auth.

## Development

You need Node.js and npm.

```sh
npm install
npm run dev
```

## Build

```sh
npm run build   # outputs static files to dist/
npm run preview
```

## Routes

Client-side routing uses `react-router-dom`:

- `/` — landing page
- `/login` — sign in / sign up (Customer or Barber)
- `/barbers` — signed-in home

## Deploying to Vercel

Import the repo in Vercel with the **Vite** framework preset (build command `npm run build`, output directory `dist`).
`vercel.json` rewrites every path to `/index.html`, so deep links like `/login` and `/barbers` load the SPA instead of returning 404.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the Vercel project's environment variables (or keep them in `.env`).
