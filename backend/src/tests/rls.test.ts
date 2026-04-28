import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const SERVICE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']!
const ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!

const admin = createClient(SUPABASE_URL, SERVICE_KEY)

interface TestResult { test: string; passed: boolean; details: string }
const results: TestResult[] = []

function pass(test: string, details = ''): void {
  results.push({ test, passed: true, details })
  console.log(`  ✅ ${test}`)
}

function fail(test: string, details: string): void {
  results.push({ test, passed: false, details })
  console.error(`  ❌ ${test}: ${details}`)
}

async function runRlsTests(): Promise<void> {
  console.log('\n🧪 Running RLS Policy Tests...\n')

  console.log('📋 Test group: Unauthenticated access')
  const anonClient = createClient(SUPABASE_URL, ANON_KEY)
  const { data: studentsAnon, error: anonErr } = await anonClient.from('students').select('id, name').limit(1)

  if (anonErr || !studentsAnon?.length) {
    pass('Unauthenticated cannot read students')
  } else {
    fail('Unauthenticated cannot read students', `Got ${studentsAnon.length} rows — RLS not enforced!`)
  }

  const { data: invoicesAnon } = await anonClient.from('invoices').select('id').limit(1)
  if (!invoicesAnon?.length) {
    pass('Unauthenticated cannot read invoices')
  } else {
    fail('Unauthenticated cannot read invoices', 'RLS not enforced on invoices!')
  }

  console.log('\n📋 Test group: Service role access')
  const { data: allStudents, error: adminErr } = await admin.from('students').select('id').limit(5)

  if (!adminErr && allStudents !== null) {
    pass('Service role can read students')
  } else {
    fail('Service role can read students', adminErr?.message ?? 'Unknown error')
  }

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)

  if (failed > 0) {
    console.error('\n⚠️  Some RLS policies are not correctly configured!')
    process.exit(1)
  } else {
    console.log('\n✅ All RLS tests passed!')
  }
}

runRlsTests().catch(console.error)
