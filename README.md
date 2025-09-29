# FocusBrew

<img src="public/icon.svg" alt="FocusBrew icon" width="96" height="96" />

A cozy, pixel‑art focus timer built with React + Vite.

## Main functionality
- Timer with start / pause / reset and a coffee cup that fills as time passes
- Earn cups on completion only:
	- Bronze: less than 30 minutes
	- Silver: at least 30 minutes
	- Gold: at least 60 minutes
	- Diamond: randomly awarded — a lucky bonus
- Cup Shelf to view your collection (hover for details)
- Profile button at the bottom:
	- Signed in: shows username, total cups, and Sign out
	- Signed out: Register, Log in, and Reset password inline
- Works offline: cups persist in localStorage; optional cloud sync if Supabase is configured
- Installable PWA (service worker auto‑registers)

## Local setup
Prerequisites: Node 18+ and npm.

```bash
npm install
npm run dev
```

Build and preview production:

```bash
npm run build
npm run preview
```

Optional auth (Supabase): add a `.env.local` with

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Without these variables the app still runs, just without sign‑in.

## Deployment
FocusBrew is a static site (output in `dist/`). Deploy to any static host:

- Vercel / Netlify:
	- Build command: `npm run build`
	- Output directory: `dist`
	- If using auth, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables

PWA is enabled by default and will register on first load.

## License
MIT
