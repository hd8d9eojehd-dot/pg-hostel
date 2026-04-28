# Push Database Schema Manually (2 minutes)

The automated push isn't working due to network/pooler issues. Here's the manual approach:

## Step 1: Open Supabase SQL Editor

Go to: https://supabase.com/dashboard/project/cxvsvpsmkzgizggpajnw/sql/new

## Step 2: Copy the SQL

Open this file: `backend/prisma/full_schema.sql`

Copy ALL the contents (22KB of SQL)

## Step 3: Paste and Run

1. Paste the SQL into the Supabase SQL Editor
2. Click **Run** (or press Ctrl+Enter)
3. Wait ~5 seconds for all tables to be created

## Step 4: Seed Sample Data

Run this in a terminal:

```powershell
cd backend
npx ts-node --transpile-only prisma/seed.ts
```

## Step 5: Start Backend

```powershell
cd backend
npx ts-node --transpile-only src/index.ts
```

## Done!

- Admin Portal: http://localhost:3000 (already running)
- Student Portal: http://localhost:3001 (already running)
- Backend API: http://localhost:4000

Login: admin@sunrise-pg.com / Admin@123456
