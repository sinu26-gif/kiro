# Himova — Quickstart

Get the app running end-to-end in under 10 minutes.

## 1. Apply the database schema (one-time)

1. Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/bezdcjjkobhykjqngegj/sql/new).
2. Open `supabase/all.sql` from this repo.
3. Copy its full contents, paste into the editor, click **Run**.
4. (Optional) Repeat with `supabase/seed.sql` to insert sample categories, products, variants, and set types.

You should see "Success. No rows returned." for each.

## 2. Create the first admin user (one-time)

Supabase Auth users cannot be created from the app — you must create the very first admin manually:

1. Open [Supabase Authentication > Users](https://supabase.com/dashboard/project/bezdcjjkobhykjqngegj/auth/users).
2. Click **Add user > Create new user**.
3. Enter your admin email + a strong password. Tick "Auto Confirm User".
4. Copy the `User UID` from the new row.
5. Back in the [SQL Editor](https://supabase.com/dashboard/project/bezdcjjkobhykjqngegj/sql/new), run:

   ```sql
   insert into public.profiles (id, role, full_name)
   values ('<paste-the-uid-here>', 'admin', 'Your Name');
   ```

That's it — you can now log in at `/login` (Admin tab) with that email + password.

## 3. Run locally

From the `himova/` folder:

```bash
npm install
npm run dev
```

The app boots at http://localhost:3000.

## 4. Try the full flow

1. Go to **/login**, switch to the Admin tab, log in with your admin email.
2. You land on `/admin`. Click **Shopkeepers** in the sidebar.
3. Click **Add shopkeeper**, fill in shop name, owner name, and a 10-digit Nepali mobile (e.g. `9841234567`). Submit.
4. Log out (top-right).
5. Go to **/login**, stay on the Shopkeeper tab, enter the phone number you just registered. The initial password is the **same phone number** (e.g. `9841234567`).
6. You land on **/shop/welcome**. Set a new password.
7. After saving, you reach the shopkeeper home page.

## 5. Common gotchas

- **"Wrong phone or password"** even though it should work? Make sure the phone matches what was registered. The system normalises both sides to E.164 (`977XXXXXXXXXX`).
- **Admin login fails** with a profile error? You probably forgot step 2.5 — the `insert into profiles` for the admin UID.
- **Empty pages everywhere**? Schema not applied yet (step 1).
- **Service-role key concerns?** Rotate it after Phase 1 testing in Supabase Dashboard > Settings > API.

## Useful scripts

```bash
npm run dev          # local dev server
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
npm run build        # production build
npm run format       # prettier --write .
```
