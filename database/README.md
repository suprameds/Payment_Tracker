# Database Setup Guide

## Prerequisites

1. Create a Supabase account at https://supabase.com
2. Create a new project

## Setup Steps

### 1. Get Your Credentials

After creating your project:

- Go to Settings > API
- Copy the following values:
  - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon/public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Update Environment Variables

Edit `.env.local` and paste your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Execute Database Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the contents of `database/schema.sql`
4. Paste and click **Run**

This will create:

- `dispatches` table
- `payment_reconciliation_log` table
- `ocr_processing_queue` table
- All indexes, triggers, and RLS policies
- Storage bucket for images
- Helper views for common queries

### 4. Verify Setup

Run this query in SQL Editor to confirm:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

You should see:

- dispatches
- payment_reconciliation_log
- ocr_processing_queue

## Next Steps

Once database is set up, you can start the development server:

```bash
npm run dev
```
