# Complete Setup Guide — PG Hostel Management Platform

This guide walks you through setting up the entire platform from scratch.

---

## Prerequisites

- **Node.js 20+** and **npm 10+**
- A **Supabase account** (free tier)
- An **Upstash account** (free tier)
- A **Cashfree account** (test mode, free)

---

## Step 1: Clone and Install

```bash
git clone <your-repo-url>
cd pg-hostel-platform
npm install
```

This installs all dependencies for all 4 packages (shared, backend, admin-portal, student-portal).

---

## Step 2: Set Up Supabase

### 2.1 Create Project
1. Go to [supabase.com](https://supabase.com)
2. Click **New Project**
3. Choose a name, database password, and region
4. Wait for project to provision (~2 minutes)

### 2.2 Get Credentials
1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** (e.g., `https://abc123.supabase.co`)
   - **anon public** key
   - **service_role** key (keep this secret!)

### 2.3 Create Storage Buckets
1. Go to **Storage** → **New bucket**
2. Create 3 buckets:
   - `student-documents` — **Private**, no public access
   - `student-avatars` — **Public**, allow public access
   - `complaint-photos` — **Private**, no public access

### 2.4 Set Up RLS Policies
1. Go to **SQL Editor**
2. Copy the entire contents of `supabase/schema.sql`
3. Paste and click **Run**
4. Verify: "Success. No rows returned"

### 2.5 Get Database URL
1. Go to **Settings** → **Database**
2. Scroll to **Connection string** → **URI**
3. Copy the connection string (starts with `postgresql://`)
4. Replace `[YOUR-PASSWORD]` with your database password

---

## Step 3: Set Up Upstash Redis

1. Go to [upstash.com](https://upstash.com)
2. Click **Create Database**
3. Choose a name and region (select closest to your users)
4. Copy the **Redis URL** (starts with `rediss://`)

---

## Step 4: Set Up Cashfree

1. Go to [cashfree.com](https://cashfree.com)
2. Sign up and verify your account
3. Go to **Developers** → **API Keys**
4. Switch to **Test Mode** (top right)
5. Copy:
   - **App ID**
   - **Secret Key**
6. Go to **Webhooks** → Add webhook URL: `https://your-backend-url.com/api/v1/payment/webhook`
7. Copy the **Webhook Secret**

---

## Step 5: Configure Environment Variables

### 5.1 Backend `.env`
```bash
cp .env.example .env
```

Edit `.env` and fill in:
```bash
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
JWT_SECRET="generate-a-random-32-character-string-here"
REDIS_URL="rediss://default:YOUR_TOKEN@YOUR_HOST.upstash.io:PORT"
CASHFREE_APP_ID="your-test-app-id"
CASHFREE_SECRET_KEY="your-test-secret-key"
CASHFREE_WEBHOOK_SECRET="your-webhook-secret"
```

### 5.2 Admin Portal `.env.local`
```bash
cp admin-portal/.env.local.example admin-portal/.env.local
```

Edit `admin-portal/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 5.3 Student Portal `.env.local`
```bash
cp student-portal/.env.local.example student-portal/.env.local
```

Edit `student-portal/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_CASHFREE_ENV=sandbox
```

---

## Step 6: Set Up Database

```bash
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to Supabase
npm run db:seed        # Seed with sample data
```

**Expected output:**
```
✅ Branch created: Sunrise PG
✅ Floors created: 3
✅ Rooms and beds created: 12
✅ Super admin created
✅ Sample notices created
✅ Sample food menu created
🎉 Seed completed successfully!
─────────────────────────────────
Admin login: admin@sunrise-pg.com
Password:    Admin@123456
─────────────────────────────────
```

---

## Step 7: Run Locally

Open **3 separate terminals**:

### Terminal 1 — Backend
```bash
cd backend
npm run dev
```

**On first run:** A WhatsApp QR code will appear. Scan it with your phone's WhatsApp app. The session persists, so you only need to scan once.

### Terminal 2 — Admin Portal
```bash
cd admin-portal
npm run dev
```

### Terminal 3 — Student Portal
```bash
cd student-portal
npm run dev
```

---

## Step 8: Access the Platform

| Service | URL | Credentials |
|---|---|---|
| **Backend API** | http://localhost:4000 | — |
| **Admin Portal** | http://localhost:3000 | admin@sunrise-pg.com / Admin@123456 |
| **Student Portal** | http://localhost:3001 | (admit a student first) |
| **Health Check** | http://localhost:4000/health | — |

---

## Step 9: Test the Platform

### 9.1 Admin Portal
1. Login with `admin@sunrise-pg.com` / `Admin@123456`
2. Go to **Students** → **Admit Student**
3. Fill the form, select a room/bed
4. Note the **Student ID** and **temp password** shown after admission
5. Check **WhatsApp** page — you should see the welcome message in logs

### 9.2 Student Portal
1. Open http://localhost:3001
2. Login with the Student ID and temp password from step 9.1
3. You'll be prompted to change password
4. After changing, explore: Home, Finance, Complaints, Outpass, Profile

### 9.3 Test Payment Flow
1. **Admin:** Create an invoice for the student (Finance → New Invoice)
2. **Student:** Go to Finance → Click "Pay" on the invoice
3. Cashfree test payment page opens
4. Use test card: `4111 1111 1111 1111`, any future expiry, any CVV
5. Payment succeeds → redirects to payment-status page
6. **Admin:** Check Finance → invoice is now marked "paid"
7. **Student:** Download receipt PDF

---

## Step 10: Deploy to Production

### Backend → Railway (recommended for WhatsApp)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
cd backend
railway up
```

**Set environment variables in Railway dashboard:**
- All variables from `.env`
- Set `NODE_ENV=production`
- Set `ADMIN_PORTAL_URL` and `STUDENT_PORTAL_URL` to your Vercel URLs

### Admin Portal → Vercel

```bash
cd admin-portal
vercel --prod
```

**Set environment variables in Vercel:**
- `NEXT_PUBLIC_API_URL` → your Railway backend URL
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Student Portal → Vercel

```bash
cd student-portal
vercel --prod
```

**Set environment variables in Vercel:**
- `NEXT_PUBLIC_API_URL` → your Railway backend URL
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CASHFREE_ENV=production` (when ready for live payments)

---

## Troubleshooting

### "WhatsApp not ready" in logs
- Check backend terminal for QR code
- Scan with WhatsApp on your phone
- Wait 10-15 seconds for connection
- Refresh WhatsApp page in admin portal

### "Database connection failed"
- Verify `DATABASE_URL` is correct
- Check Supabase project is active
- Ensure database password is correct

### "Redis connection failed"
- Verify `REDIS_URL` is correct
- Check Upstash database is active
- Ensure URL includes `rediss://` (with double 's')

### "Prisma client not generated"
```bash
npm run db:generate
```

### "Port 4000 already in use"
```bash
# Kill the process
npx kill-port 4000
# Or change PORT in .env
```

### Student can't login
- Ensure student was admitted via admin portal
- Use the exact Student ID (e.g., `PG-2026-0001`)
- Use the temp password shown after admission
- Change password on first login

---

## Next Steps

1. **Customize branding** — Update `PG_NAME` in `.env`, branch info in Settings
2. **Add staff** — Settings → Staff → Add Staff Member
3. **Set up rooms** — Rooms → Add Room (create floors first if needed)
4. **Configure fee policy** — Settings → Fee Policy
5. **Add food menu** — Food Menu → Add / Edit Menu
6. **Test WhatsApp** — WhatsApp → Send Message (to your own number)
7. **Create notices** — Notices → New Notice → Publish → Send WhatsApp
8. **Generate reports** — Reports → Select report type → Export CSV

---

## Production Checklist

- [ ] Change all default passwords
- [ ] Set strong `JWT_SECRET` (min 32 chars)
- [ ] Configure Cashfree webhook URL
- [ ] Test Cashfree payment in test mode
- [ ] Set up Supabase storage bucket policies
- [ ] Run `npm run db:test-rls` to verify RLS policies
- [ ] Configure CORS `ALLOWED_ORIGINS` for production URLs
- [ ] Set `NODE_ENV=production` in Railway
- [ ] Test WhatsApp on Railway (not Vercel)
- [ ] Set up monitoring (Railway logs, Sentry, etc.)
- [ ] Configure backup strategy for Supabase database
- [ ] Test all cron jobs (rent reminders, invoice generation)
- [ ] Add your PG's actual contact info in Settings → Branch Info

---

## Support

For issues, check:
- Backend logs: `backend/logs/` (in production)
- Browser console (F12) for frontend errors
- Railway logs for backend errors
- Supabase logs for database/auth errors
