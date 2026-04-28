const { PrismaClient } = require('@prisma/client');
const ref = 'cxvsvpsmkzgizggpajnw';
const pass = 'hd8d9eojehd';

const urls = [
  `postgresql://postgres.${ref}:${pass}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require`,
  `postgresql://postgres.${ref}:${pass}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require`,
  `postgresql://postgres.${ref}:${pass}@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`,
  `postgresql://postgres.${ref}:${pass}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require`,
];

(async () => {
  for (const url of urls) {
    const p = new PrismaClient({ datasources: { db: { url } } });
    const host = url.split('@')[1].split('/')[0];
    try {
      const r = await p.$queryRawUnsafe('SELECT current_database()');
      console.log('SUCCESS:', host, '->', JSON.stringify(r));
      await p.$disconnect();
      // Write working URL to file
      require('fs').writeFileSync('working_url.txt', url);
      break;
    } catch(e) {
      console.log('FAIL:', host, '->', e.message.substring(0, 80));
      await p.$disconnect().catch(() => {});
    }
  }
})();
