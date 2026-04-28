// Seed database via Supabase REST API
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://cxvsvpsmkzgizggpajnw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4dnN2cHNta3pnaXpnZ3Bham53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzIyNzg2NSwiZXhwIjoyMDkyODAzODY1fQ.noAn840DzqNTXV-hmkst1JDGSKOAtRMrcebM_DevWvQ';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Tables that have updated_at column
const HAS_UPDATED_AT = new Set(['branches','rooms','students','invoices','notices','complaints','meal_timings','outpass','settings']);

const now = new Date().toISOString();

async function ins(table, data) {
  const addTs = (r) => HAS_UPDATED_AT.has(table) ? { ...r, updated_at: now } : r;
  const payload = Array.isArray(data) ? data.map(addTs) : addTs(data);
  const { data: result, error } = await supabase.from(table).insert(payload).select();
  if (error) throw new Error(`[${table}] ${error.message}${error.details ? ' | ' + error.details : ''}`);
  return result;
}

async function main() {
  console.log('🌱 Seeding database via Supabase REST API...\n');

  // Check if already seeded
  const { data: existing } = await supabase.from('branches').select('id,name').limit(1);
  if (existing && existing.length > 0) {
    console.log('✅ Already seeded! Branch:', existing[0].name);
    console.log('\n─────────────────────────────────');
    console.log('Admin login: admin@sunrise-pg.com');
    console.log('Password:    Admin@123456');
    console.log('─────────────────────────────────');
    return;
  }

  // 1. Branch
  const [branch] = await ins('branches', {
    name: 'Sunrise PG',
    address: '14, Koregaon Park, Lane 5',
    city: 'Pune', state: 'Maharashtra', pincode: '411001',
    contact_primary: '9876543210', email: 'admin@sunrise-pg.com', is_active: true,
  });
  console.log('✅ Branch:', branch.name);

  // 2. Floors (no updated_at)
  const floors = await ins('floors', [
    { branch_id: branch.id, floor_number: 1, floor_name: 'Floor 1' },
    { branch_id: branch.id, floor_number: 2, floor_name: 'Floor 2' },
    { branch_id: branch.id, floor_number: 3, floor_name: 'Floor 3' },
  ]);
  console.log('✅ Floors:', floors.length);

  // 3. Rooms
  const roomData = [];
  for (const floor of floors) {
    for (let r = 1; r <= 4; r++) {
      const type = r % 2 === 0 ? 'double' : 'triple';
      roomData.push({
        branch_id: branch.id, floor_id: floor.id,
        room_number: `${floor.floor_number}0${r}`,
        room_type: type, bed_count: type === 'double' ? 2 : 3,
        has_attached_bath: r % 2 === 0, is_furnished: true, has_wifi: true,
        monthly_rent: type === 'double' ? 8000 : 7000,
        semester_rent: type === 'double' ? 45000 : 40000,
        annual_rent: type === 'double' ? 88000 : 78000,
        status: 'available',
      });
    }
  }
  const rooms = await ins('rooms', roomData);
  console.log('✅ Rooms:', rooms.length);

  // 4. Beds (no updated_at)
  const bedData = [];
  for (const room of rooms) {
    const labels = room.bed_count === 2 ? ['A', 'B'] : ['A', 'B', 'C'];
    for (const label of labels) {
      bedData.push({ room_id: room.id, bed_label: label, is_occupied: false });
    }
  }
  const beds = await ins('beds', bedData);
  console.log('✅ Beds:', beds.length);

  // 5. Admin auth user
  let adminAuthId;
  try {
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: 'admin@sunrise-pg.com', password: 'Admin@123456', email_confirm: true,
    });
    if (error) throw error;
    adminAuthId = authData.user.id;
    console.log('✅ Admin auth user created');
  } catch (e) {
    const { data: users } = await supabase.auth.admin.listUsers();
    const found = users?.users?.find(u => u.email === 'admin@sunrise-pg.com');
    if (found) { adminAuthId = found.id; console.log('✅ Admin auth user exists'); }
    else throw new Error('Auth user creation failed: ' + e.message);
  }

  // 6. Admin record (no updated_at)
  const [admin] = await ins('admins', {
    supabase_auth_id: adminAuthId,
    name: 'Super Admin', email: 'admin@sunrise-pg.com',
    mobile: '9876543210', role: 'super_admin',
    branch_id: branch.id, is_active: true,
  });
  console.log('✅ Admin record created');

  // 7. Settings
  await ins('settings', {
    branch_id: branch.id,
    late_fee_type: 'flat', late_fee_amount: 500, grace_period_days: 7,
    deposit_policy: 'Deposit is refundable after full settlement of dues',
    auto_invoice_enabled: true, whatsapp_templates: {}, staff_permissions: {},
  });
  console.log('✅ Settings created');

  // 8. Meal timings
  await ins('meal_timings', {
    branch_id: branch.id,
    breakfast_start: '07:30', breakfast_end: '09:30',
    lunch_start: '12:30', lunch_end: '14:30',
    dinner_start: '19:30', dinner_end: '21:30',
  });
  console.log('✅ Meal timings created');

  // 9. Notices
  await ins('notices', [
    { branch_id: branch.id, title: 'Welcome to Sunrise PG! 🏠', description: 'We are excited to have you here. WiFi password: Sunrise2024. For any issues, raise a complaint via the portal.', category: 'general', priority: 'medium', created_by: admin.id, is_published: true, published_at: now, whatsapp_sent: false },
    { branch_id: branch.id, title: 'Rent Due Reminder 💰', description: 'Monthly rent is due on the 5th of each month. Pay via the student portal. Late fee ₹500 after grace period.', category: 'rent', priority: 'high', created_by: admin.id, is_published: true, published_at: now, whatsapp_sent: false },
    { branch_id: branch.id, title: 'Water Supply Maintenance 🔧', description: 'Water supply off Sunday 8am-12pm for maintenance. Please store water accordingly.', category: 'maintenance', priority: 'urgent', created_by: admin.id, is_published: true, published_at: now, whatsapp_sent: false },
  ]);
  console.log('✅ Notices created');

  // 10. Food menu (no updated_at)
  const t = new Date();
  await ins('food_menu', [
    { branch_id: branch.id, month: t.getMonth()+1, year: t.getFullYear(), day_of_month: t.getDate(), meal_type: 'breakfast', items: 'Idli, Sambar, Coconut Chutney, Tea/Coffee', is_special: false, is_holiday: false },
    { branch_id: branch.id, month: t.getMonth()+1, year: t.getFullYear(), day_of_month: t.getDate(), meal_type: 'lunch', items: 'Rice, Dal Tadka, Sabzi, Roti, Salad, Buttermilk', is_special: false, is_holiday: false },
    { branch_id: branch.id, month: t.getMonth()+1, year: t.getFullYear(), day_of_month: t.getDate(), meal_type: 'dinner', items: 'Roti, Paneer Butter Masala, Rice, Dal, Pickle', is_special: false, is_holiday: false },
  ]);
  console.log('✅ Food menu created');

  console.log('\n🎉 Seed completed successfully!');
  console.log('─────────────────────────────────');
  console.log('Admin login: admin@sunrise-pg.com');
  console.log('Password:    Admin@123456');
  console.log('─────────────────────────────────');
}

main().catch(e => { console.error('❌ Seed failed:', e.message); process.exit(1); });
