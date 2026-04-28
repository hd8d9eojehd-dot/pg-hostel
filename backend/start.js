// Backend starter — tests DB connection then starts server
require('dotenv').config();
const { execSync, spawn } = require('child_process');

const DB_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;
const ref = 'cxvsvpsmkzgizggpajnw';

console.log('\n🔍 Testing database connection...');
console.log('   URL:', DB_URL ? DB_URL.replace(/:([^@]+)@/, ':***@') : 'NOT SET');

// Test connection
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ datasources: { db: { url: DB_URL } } });

p.$queryRawUnsafe('SELECT COUNT(*) as cnt FROM branches')
  .then(r => {
    console.log('✅ Database connected! Branches:', r[0].cnt);
    p.$disconnect();
    startServer();
  })
  .catch(e => {
    console.log('⚠️  Direct DB connection failed:', e.message.substring(0, 80));
    console.log('   Starting server anyway (will use Supabase REST API for auth)...\n');
    p.$disconnect().catch(() => {});
    startServer();
  });

function startServer() {
  const proc = spawn('npx', ['ts-node', '--transpile-only', 'src/index.ts'], {
    stdio: 'inherit',
    env: process.env,
    cwd: __dirname,
  });
  proc.on('exit', code => process.exit(code || 0));
}
