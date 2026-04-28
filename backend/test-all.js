require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const ref = 'cxvsvpsmkzgizggpajnw';
const pass = 'hd8d9eojehd';
const host = 'aws-1-ap-southeast-1.pooler.supabase.com';

const urls = [
  `postgresql://postgres.${ref}:${pass}@${host}:5432/postgres`,
  `postgresql://postgres.${ref}:${pass}@${host}:6543/postgres`,
  `postgresql://postgres.${ref}:${pass}@${host}:5432/postgres?sslmode=require`,
  `postgresql://postgres.${ref}:${pass}@${host}:6543/postgres?pgbouncer=true`,
];

(async () => {
  for (const url of urls) {
    const p = new PrismaClient({ datasources: { db: { url } } });
    const display = url.split('@')[1].split('/')[0];
    try {
      const r = await p.$queryRawUnsafe('SELECT COUNT(*) as cnt FROM branches');
      console.log('SUCCESS:', display, '-> branches:', r[0].cnt);
      await p.$disconnect();
      require('fs').writeFileSync('working_url.txt', url);
      process.exit(0);
    } catch(e) {
      const msg = e.message.replace(/\n/g,' ').substring(0,80);
      console.log('FAIL:', display, '->', msg);
      await p.$disconnect().catch(()=>{});
    }
  }
  console.log('All failed');
  process.exit(1);
})();
