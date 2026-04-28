# Final Setup — One Command Away!

## Get your database password (30 seconds)

1. The Supabase dashboard just opened in your browser
2. Go to: **Settings → Database → Connection string → URI tab**
3. Copy the password (between `:` and `@` in the URI)

## Run this ONE command with your password:

```powershell
# Replace YOUR_PASSWORD with the password you copied
.\run.ps1 -DbPassword "YOUR_PASSWORD"
```

## That's it! The script will:
- ✅ Update .env with your password
- ✅ Push all 20 database tables to Supabase
- ✅ Create admin user + sample data
- ✅ Start the backend API
- ✅ Open both portals in your browser

## Login credentials (after setup):
- Admin Portal: http://localhost:3000
  - Email: admin@sunrise-pg.com
  - Password: Admin@123456

- Student Portal: http://localhost:3001
  - (Admit a student first from admin portal)
