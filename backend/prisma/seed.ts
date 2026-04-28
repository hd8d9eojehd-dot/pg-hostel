import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const prisma = new PrismaClient()
const supabase = createClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Idempotent: skip if already seeded ──────────────────
  const existingBranch = await prisma.branch.findFirst({ where: { name: 'Sunrise PG' } })
  if (existingBranch) {
    console.log('✅ Database already seeded. Skipping.')
    console.log('─────────────────────────────────')
    console.log('Admin login: admin@sunrise-pg.com')
    console.log('Password:    Admin@123456')
    console.log('─────────────────────────────────')
    return
  }

  // ─── 1. Branch ───────────────────────────────────────────
  const branch = await prisma.branch.create({
    data: {
      name: 'Sunrise PG',
      address: '14, Koregaon Park, Lane 5',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      contactPrimary: '9876543210',
      email: 'admin@sunrise-pg.com',
      isActive: true,
    },
  })
  console.log('✅ Branch created:', branch.name)

  // ─── 2. Floors ───────────────────────────────────────────
  const floors = await Promise.all([1, 2, 3].map(n =>
    prisma.floor.create({
      data: { branchId: branch.id, floorNumber: n, floorName: `Floor ${n}` },
    })
  ))
  console.log('✅ Floors created:', floors.length)

  // ─── 3. Rooms + Beds ─────────────────────────────────────
  const roomTypes = ['double', 'triple', 'triple', 'double'] as const
  let roomCount = 0
  for (const floor of floors) {
    for (let r = 1; r <= 4; r++) {
      const type = roomTypes[(r - 1) % roomTypes.length]!
      const bedCount = type === 'double' ? 2 : 3
      const room = await prisma.room.create({
        data: {
          branchId: branch.id,
          floorId: floor.id,
          roomNumber: `${floor.floorNumber}0${r}`,
          roomType: type,
          bedCount,
          hasAttachedBath: r % 2 === 0,
          isFurnished: true,
          hasWifi: true,
          monthlyRent: type === 'double' ? 8000 : 7000,
          semesterRent: type === 'double' ? 45000 : 40000,
          annualRent: type === 'double' ? 88000 : 78000,
          status: 'available',
        },
      })
      await Promise.all(
        ['A', 'B', 'C'].slice(0, bedCount).map(label =>
          prisma.bed.create({ data: { roomId: room.id, bedLabel: label, isOccupied: false } })
        )
      )
      roomCount++
    }
  }
  console.log('✅ Rooms and beds created:', roomCount)

  // ─── 4. Super Admin ──────────────────────────────────────
  const adminEmail = 'admin@sunrise-pg.com'

  // Check if Supabase user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingAuthUser = existingUsers?.users?.find(u => u.email === adminEmail)

  let authUserId: string

  if (existingAuthUser) {
    authUserId = existingAuthUser.id
    console.log('✅ Supabase auth user already exists')
  } else {
    const { data: adminAuth, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: 'Admin@123456',
      email_confirm: true,
    })
    if (error) throw new Error(`Failed to create auth user: ${error.message}`)
    authUserId = adminAuth.user!.id
    console.log('✅ Supabase auth user created')
  }

  const existingAdmin = await prisma.admin.findUnique({ where: { email: adminEmail } })
  if (!existingAdmin) {
    await prisma.admin.create({
      data: {
        supabaseAuthId: authUserId,
        name: 'Super Admin',
        email: adminEmail,
        mobile: '9876543210',
        role: 'super_admin',
        branchId: branch.id,
        isActive: true,
      },
    })
    console.log('✅ Admin record created')
  }

  // ─── 5. Settings ─────────────────────────────────────────
  await prisma.settings.create({
    data: {
      branchId: branch.id,
      lateFeeType: 'flat',
      lateFeeAmount: 500,
      gracePeriodDays: 7,
      depositPolicy: 'Deposit is refundable after full settlement of dues and room inspection.',
      autoInvoiceEnabled: true,
      whatsappTemplates: {},
      staffPermissions: {
        complaints: true, notices: true, outpass: true, food: true,
        documents: true, students_view: true, rooms_view: true, finance: false,
      },
    },
  })

  // ─── 6. Meal Timings ─────────────────────────────────────
  await prisma.mealTimings.create({
    data: {
      branchId: branch.id,
      breakfastStart: '07:30', breakfastEnd: '09:30',
      lunchStart: '12:30', lunchEnd: '14:30',
      dinnerStart: '19:30', dinnerEnd: '21:30',
    },
  })

  // ─── 7. Sample Notices ───────────────────────────────────
  const adminRecord = await prisma.admin.findFirst({ where: { role: 'super_admin' } })
  if (adminRecord) {
    await prisma.notice.createMany({
      data: [
        {
          branchId: branch.id,
          title: 'Welcome to Sunrise PG! 🏠',
          description: 'We are excited to have you here. Please review the hostel rules in the common area. WiFi password: Sunrise2024. For any issues, raise a complaint via the portal.',
          category: 'general', priority: 'medium',
          createdBy: adminRecord.id, isPublished: true, publishedAt: new Date(),
        },
        {
          branchId: branch.id,
          title: 'Rent Due Reminder 💰',
          description: 'Monthly rent is due on the 5th of each month. Please pay via the student portal or contact admin. Late fee of ₹500 applies after the grace period.',
          category: 'rent', priority: 'high',
          createdBy: adminRecord.id, isPublished: true, publishedAt: new Date(),
        },
        {
          branchId: branch.id,
          title: 'Water Supply Maintenance 🔧',
          description: 'Water supply will be off on Sunday 8am–12pm for maintenance. Please store water accordingly. We apologize for the inconvenience.',
          category: 'maintenance', priority: 'urgent',
          createdBy: adminRecord.id, isPublished: true, publishedAt: new Date(),
        },
      ],
    })
    console.log('✅ Sample notices created')
  }

  // ─── 8. Sample Food Menu (today) ─────────────────────────
  const t = new Date()
  await prisma.foodMenu.createMany({
    data: [
      { branchId: branch.id, month: t.getMonth() + 1, year: t.getFullYear(), dayOfMonth: t.getDate(), mealType: 'breakfast', items: 'Idli, Sambar, Coconut Chutney, Tea/Coffee' },
      { branchId: branch.id, month: t.getMonth() + 1, year: t.getFullYear(), dayOfMonth: t.getDate(), mealType: 'lunch', items: 'Rice, Dal Tadka, Sabzi, Roti, Salad, Buttermilk' },
      { branchId: branch.id, month: t.getMonth() + 1, year: t.getFullYear(), dayOfMonth: t.getDate(), mealType: 'dinner', items: 'Roti, Paneer Butter Masala, Rice, Dal, Pickle' },
    ],
    skipDuplicates: true,
  })
  console.log('✅ Sample food menu created')

  console.log('\n🎉 Seed completed successfully!')
  console.log('─────────────────────────────────')
  console.log('Admin login: admin@sunrise-pg.com')
  console.log('Password:    Admin@123456')
  console.log('─────────────────────────────────')
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
