# Supabase Setup Guide for News System

## Overview

This guide explains how to set up Supabase for the Operator X02 Code IDE news/announcement system.

---

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click **"New Project"**
4. Enter project details:
   - **Name:** `operator-x02-news` (or your preferred name)
   - **Database Password:** Create a strong password
   - **Region:** Choose closest to your users
5. Click **"Create new project"**
6. Wait for project to be ready (~2 minutes)

---

## Step 2: Get API Credentials

1. Go to **Settings** > **API** in your project dashboard
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (e.g., `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

3. Update `supabaseClient.ts`:

```typescript
const SUPABASE_URL = 'https://xxxxx.supabase.co';  // Your URL
const SUPABASE_ANON_KEY = 'eyJhbGciOi...';  // Your anon key
```

---

## Step 3: Run Database Schema

1. Go to **SQL Editor** in your project dashboard
2. Click **"New Query"**
3. Copy the entire contents of `supabaseSchema.sql`
4. Paste into the query editor
5. Click **"Run"**
6. You should see: "Success. No rows returned"

---

## Step 4: Enable OAuth Providers

### GitHub OAuth

1. Go to **Authentication** > **Providers** in Supabase
2. Find **GitHub** and enable it
3. Go to [GitHub Developer Settings](https://github.com/settings/developers)
4. Click **"New OAuth App"**
5. Fill in:
   - **Application name:** `Operator X02 Code IDE`
   - **Homepage URL:** `http://localhost:1420` (or your app URL)
   - **Authorization callback URL:** `https://xxxxx.supabase.co/auth/v1/callback`
6. Copy **Client ID** and **Client Secret**
7. Paste into Supabase GitHub provider settings
8. Save

### Google OAuth

1. Go to **Authentication** > **Providers** in Supabase
2. Find **Google** and enable it
3. Go to [Google Cloud Console](https://console.cloud.google.com/)
4. Create a new project or select existing
5. Go to **APIs & Services** > **Credentials**
6. Click **"Create Credentials"** > **"OAuth client ID"**
7. Configure consent screen if prompted
8. Select **"Web application"**
9. Fill in:
   - **Name:** `Operator X02 Code IDE`
   - **Authorized JavaScript origins:** `http://localhost:1420`
   - **Authorized redirect URIs:** `https://xxxxx.supabase.co/auth/v1/callback`
10. Copy **Client ID** and **Client Secret**
11. Paste into Supabase Google provider settings
12. Save

---

## Step 5: Configure Site URL

1. Go to **Authentication** > **URL Configuration** in Supabase
2. Set **Site URL:** `http://localhost:1420` (or your app URL)
3. Add to **Redirect URLs:**
   - `http://localhost:1420`
   - `http://localhost:1420/*`
4. Save

---

## Step 6: Install Supabase Client

In your project directory, run:

```bash
npm install @supabase/supabase-js
```

or

```bash
yarn add @supabase/supabase-js
```

---

## Step 7: Test the Integration

1. Start your app
2. Check the browser console for:
   ```
   [Supabase] ✅ Client initialized
   [NewsSupabase] ✅ Supabase integration enabled
   [NewsService] ✅ Fetched X news items
   ```

3. Click **"Sign In"** in the status bar
4. Try GitHub or Google login
5. After login, your avatar should appear

---

## File Structure

```
src/ide/newsSystem/
├── index.ts                    # Module exports
├── newsTypes.ts                # TypeScript types
├── statusBarNews.ts            # Base UI (local mode)
├── statusBarNewsSupabase.ts    # Supabase integration
├── supabaseClient.ts           # Supabase client config
├── newsService.ts              # API service layer
└── supabaseSchema.sql          # Database schema
```

---

## API Reference

### Initialization

```typescript
// With Supabase (recommended)
import { initStatusBarNewsWithSupabase } from './newsSystem';
await initStatusBarNewsWithSupabase();

// Without Supabase (local mode)
import { initStatusBarNews } from './newsSystem';
initStatusBarNews();
```

### Authentication

```typescript
import { 
  loginWithGitHub, 
  loginWithGoogle, 
  signOut,
  getCurrentUser 
} from './newsSystem';

// Login
await loginWithGitHub();
await loginWithGoogle();

// Logout
await signOut();

// Get current user
const user = await getCurrentUser();
```

### News Management

```typescript
import { 
  fetchNewsItems,
  postNewsItem,
  markNewsAsReadWithSync,
  markAllNewsAsReadWithSync,
  refreshNews
} from './newsSystem';

// Fetch all news
const items = await fetchNewsItems();

// Post new news (admin)
await postNewsItem({
  type: 'update',
  icon: '🚀',
  title: 'New Feature!',
  content: 'Check out our latest update...',
  badge: 'NEW',
});

// Mark as read
await markNewsAsReadWithSync('news_id');
await markAllNewsAsReadWithSync();

// Refresh from server
await refreshNews();
```

### Real-time Updates

```typescript
import { subscribeToNewsUpdates } from './newsSystem';

const unsubscribe = subscribeToNewsUpdates(
  (item) => console.log('New:', item),
  (item) => console.log('Updated:', item),
  (id) => console.log('Deleted:', id)
);

// Later: unsubscribe()
```

---

## Database Tables

### news_items
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| type | VARCHAR(50) | update, feature, tip, warning, etc. |
| icon | VARCHAR(10) | Emoji icon |
| title | VARCHAR(255) | News title |
| content | TEXT | News content |
| badge | VARCHAR(50) | Optional badge (e.g., "NEW") |
| link_text | VARCHAR(100) | Link button text |
| link_url | TEXT | Link URL |
| version | VARCHAR(50) | App version |
| is_pinned | BOOLEAN | Pin to top |
| is_active | BOOLEAN | Soft delete |
| created_at | TIMESTAMPTZ | Creation date |
| updated_at | TIMESTAMPTZ | Last update |
| created_by | UUID | Author user ID |

### news_read_status
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | User ID |
| news_id | UUID | News ID |
| read_at | TIMESTAMPTZ | When read |

### user_profiles
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (auth.users FK) |
| email | VARCHAR(255) | User email |
| name | VARCHAR(255) | Display name |
| avatar_url | TEXT | Avatar URL |
| is_admin | BOOLEAN | Admin flag |
| created_at | TIMESTAMPTZ | Creation date |
| updated_at | TIMESTAMPTZ | Last update |

---

## Troubleshooting

### "Supabase not configured" warning
- Check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set correctly
- Make sure they're not the placeholder values

### Login redirects to wrong URL
- Check **Site URL** in Supabase Authentication settings
- Verify **Redirect URLs** include your app URL

### "Invalid API key" error
- Make sure you're using the **anon public** key, not the service key
- Check for extra spaces or line breaks

### Real-time not working
- Run the schema SQL to enable realtime publication
- Check browser console for subscription status

### OAuth error "redirect_uri_mismatch"
- Verify the callback URL matches exactly in both:
  - OAuth provider settings (GitHub/Google)
  - Supabase provider settings

---

## Security Notes

1. **Never expose the service role key** - Only use anon key in frontend
2. **RLS is enabled** - Row Level Security protects data
3. **Users can only read their own read status**
4. **Anyone can read active news** (by design)
5. **Only authenticated users can create/edit news** (adjust policies as needed)

---

## Next Steps

1. **Admin Panel** - Build a UI for posting news
2. **Email Notifications** - Use Supabase Edge Functions
3. **Analytics** - Track news engagement
4. **Categories** - Add news categorization
5. **Scheduling** - Schedule news publication

---

## Support

For issues with:
- **Supabase:** [supabase.com/docs](https://supabase.com/docs)
- **OAuth:** Check provider-specific documentation
- **This implementation:** Review console logs for debugging
