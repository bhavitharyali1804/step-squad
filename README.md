# Step Squad

A mobile-friendly shared step competition for **Mini, Bunny, Honey and Chinnu**.

## What it does

- Each member enters their steps every day.
- All four members see the same shared data.
- The app automatically identifies the daily winner.
- Ties are shown as a tie and do not award a win.
- A leaderboard counts completed daily wins.
- Recent history shows previous days.
- Dates use the device's local date, so the app does not switch days unexpectedly around midnight.

## Publish it

### 1. Create a Supabase project
Create a project in Supabase.

### 2. Create the table
Open the Supabase SQL Editor and run the complete contents of `supabase.sql`.

### 3. Get the browser-safe credentials
Copy:
- Project URL
- Supabase Publishable Key

Create a `.env` file from `.env.example`:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxx
```

### 4. Test locally

```bash
npm install
npm run dev
```

### 5. Deploy
Deploy this Vite project to Vercel or Netlify and add the same two environment variables in the hosting provider's project settings.

## Important security note

This starter is intentionally simple for a small private squad. Its database policies allow the public browser client to read and write step records.

For a production/private app, add Supabase Authentication and restrict writes to authenticated users. Do not put a Supabase service-role/secret key in this browser app.
