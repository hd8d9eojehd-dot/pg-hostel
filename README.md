# PG Hostel Management System

A full-stack PG hostel management platform with admin portal, student portal, and backend API.

## Architecture

- **Admin Portal** — Next.js 14 (port 3000)
- **Student Portal** — Next.js 14 (port 3001)  
- **Backend API** — Express.js + Prisma + Supabase (port 4000)
- **Database** — PostgreSQL (Supabase)
- **Auth** — Supabase Auth
- **Payments** — Cashfree Payment Gateway

## Features

- Student admission with fee structure
- Semester-wise fee tracking & payment (Cash / UPI / Online)
- UTR verification system with duplicate detection
- Real-time complaint management
- Food menu management
- Outpass & leave management
- Semester period management with auto-outpass
- WhatsApp notifications
- Digital ID cards with QR verification
- Reports & analytics

## Quick Start

```bash
# Install all dependencies
npm install

# Start all services
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your values.

## Deployment

- Admin Portal → Vercel
- Student Portal → Vercel  
- Backend → Vercel (serverless) or Railway/Render
