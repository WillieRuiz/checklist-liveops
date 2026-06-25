# Niko Onboarding — Setup Guide

Plataforma de onboarding bilingüe (ES) para Customer Success de Niko Energy.

## 1. Database (Supabase)

Open your Supabase project (`gmopwuhqtlpiffuidsbr`) → **SQL Editor** → New query.
Paste the entire contents of `supabase/MIGRATION.sql` and run it.

This creates:
- `profiles`, `user_roles`, `modules`, `comments`, `completions` tables
- `app_role` enum (`student` | `teacher`)
- `has_role()` and `get_my_role()` security-definer functions
- Auto-trigger that creates a profile + role on first login (`@niko.mx` enforced; Dayanna → student, others → teacher)
- RLS policies for all tables
- All 28 modules pre-seeded

## 2. Google OAuth

In Supabase: **Authentication → Providers → Google**
1. Enable Google
2. Add OAuth Client ID & Secret from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
3. Authorized redirect URI in Google Console:
   `https://gmopwuhqtlpiffuidsbr.supabase.co/auth/v1/callback`
4. In Supabase → **Authentication → URL Configuration** → add your app URL (preview + production) under **Site URL** and **Redirect URLs**.

The app passes `hd=niko.mx` to Google to prefilter accounts, and the DB trigger blocks any non-`@niko.mx` signup.

## 3. Edge Function (Resend emails)

Install Supabase CLI if you haven't:
```bash
npm install -g supabase
supabase login
supabase link --project-ref gmopwuhqtlpiffuidsbr
```

Deploy & set the secret:
```bash
supabase functions deploy send-notification --no-verify-jwt
supabase secrets set RESEND_API_KEY=re_YOUR_NEW_KEY
```

> ⚠️ The Resend key shared in chat is now public — **rotate it in Resend dashboard** before setting.

## 4. Done

- Login with `dayanna.gandara@niko.mx` → student view (progress, completions, ask questions)
- Login with any other `@niko.mx` → teacher view (edit assigned modules, approve, reply to Dayanna)

## Roles
The `handle_new_user` trigger assigns:
- `dayanna.gandara@niko.mx` → `student`
- Everyone else (`@niko.mx`) → `teacher`

To change a role manually:
```sql
update public.user_roles set role = 'teacher' where user_id = (select id from auth.users where email = 'someone@niko.mx');
```
