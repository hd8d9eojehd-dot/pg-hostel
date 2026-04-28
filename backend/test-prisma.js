require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
console.log('Testing:', url.replace(/:([^@]+)@/, ':***@'));

const p = new PrismaClient({ datasources: { db: { url } } });

p.$queryRawUnsafe('SELECT COUNT(*) as cnt FROM branches')
  .then(r => {
    console.log('✅ Connected! Branches:', r[0].cnt);
    return p.$disconnect();
  })
  .then(() => process.exit(0))
  .catch(e => {
    console.log('❌ Failed:', e.message.substring(0, 100));
    process.exit(1);
  });
