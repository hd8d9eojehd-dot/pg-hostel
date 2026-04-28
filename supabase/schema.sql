-- ============================================================
-- PG Hostel Platform — Supabase RLS Policies
-- Run this in Supabase SQL Editor after pushing Prisma schema
-- ============================================================

-- Enable RLS on all sensitive tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE outpass ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ─── HELPER FUNCTIONS ────────────────────────────────────────

-- Check if current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM admins
    WHERE supabase_auth_id = auth.uid()
    AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if current user is a super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM admins
    WHERE supabase_auth_id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Get student ID for current auth user
CREATE OR REPLACE FUNCTION my_student_id()
RETURNS uuid AS $$
  SELECT id FROM students
  WHERE supabase_auth_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- ─── STUDENTS TABLE ──────────────────────────────────────────

-- Admins can read all students
CREATE POLICY "admins_read_students" ON students
  FOR SELECT USING (is_admin());

-- Students can only read their own record
CREATE POLICY "students_read_own" ON students
  FOR SELECT USING (supabase_auth_id = auth.uid());

-- Only admins can insert/update/delete students
CREATE POLICY "admins_write_students" ON students
  FOR ALL USING (is_admin());

-- ─── INVOICES TABLE ──────────────────────────────────────────

CREATE POLICY "admins_read_invoices" ON invoices
  FOR SELECT USING (is_admin());

CREATE POLICY "students_read_own_invoices" ON invoices
  FOR SELECT USING (student_id = my_student_id());

CREATE POLICY "admins_write_invoices" ON invoices
  FOR ALL USING (is_admin());

-- ─── PAYMENTS TABLE ──────────────────────────────────────────

CREATE POLICY "admins_read_payments" ON payments
  FOR SELECT USING (is_admin());

CREATE POLICY "students_read_own_payments" ON payments
  FOR SELECT USING (student_id = my_student_id());

CREATE POLICY "admins_write_payments" ON payments
  FOR ALL USING (is_admin());

-- ─── COMPLAINTS TABLE ────────────────────────────────────────

CREATE POLICY "admins_read_complaints" ON complaints
  FOR SELECT USING (is_admin());

CREATE POLICY "students_read_own_complaints" ON complaints
  FOR SELECT USING (student_id = my_student_id());

CREATE POLICY "students_insert_complaints" ON complaints
  FOR INSERT WITH CHECK (student_id = my_student_id());

CREATE POLICY "admins_write_complaints" ON complaints
  FOR ALL USING (is_admin());

-- ─── OUTPASS TABLE ───────────────────────────────────────────

CREATE POLICY "admins_read_outpass" ON outpass
  FOR SELECT USING (is_admin());

CREATE POLICY "students_read_own_outpass" ON outpass
  FOR SELECT USING (student_id = my_student_id());

CREATE POLICY "students_insert_outpass" ON outpass
  FOR INSERT WITH CHECK (student_id = my_student_id());

CREATE POLICY "admins_write_outpass" ON outpass
  FOR ALL USING (is_admin());

-- ─── DOCUMENTS TABLE ─────────────────────────────────────────

CREATE POLICY "admins_read_documents" ON documents
  FOR SELECT USING (is_admin());

CREATE POLICY "students_read_own_documents" ON documents
  FOR SELECT USING (student_id = my_student_id());

CREATE POLICY "students_insert_documents" ON documents
  FOR INSERT WITH CHECK (student_id = my_student_id());

CREATE POLICY "admins_write_documents" ON documents
  FOR ALL USING (is_admin());

-- ─── FEEDBACK TABLE ──────────────────────────────────────────

CREATE POLICY "admins_read_feedback" ON feedback
  FOR SELECT USING (is_admin());

CREATE POLICY "students_read_own_feedback" ON feedback
  FOR SELECT USING (student_id = my_student_id());

CREATE POLICY "students_insert_feedback" ON feedback
  FOR INSERT WITH CHECK (student_id = my_student_id());

-- ─── NOTICES TABLE ───────────────────────────────────────────

-- Published notices are readable by all authenticated users
CREATE POLICY "all_read_published_notices" ON notices
  FOR SELECT USING (is_published = true OR is_admin());

CREATE POLICY "admins_write_notices" ON notices
  FOR ALL USING (is_admin());

-- ─── WHATSAPP LOGS ───────────────────────────────────────────

CREATE POLICY "admins_read_whatsapp_logs" ON whatsapp_logs
  FOR SELECT USING (is_admin());

CREATE POLICY "system_write_whatsapp_logs" ON whatsapp_logs
  FOR ALL USING (is_admin());

-- ─── ACTIVITY LOGS ───────────────────────────────────────────

CREATE POLICY "super_admins_read_activity" ON activity_logs
  FOR SELECT USING (is_super_admin());

CREATE POLICY "admins_insert_activity" ON activity_logs
  FOR INSERT WITH CHECK (is_admin());

-- ─── STORAGE BUCKETS ─────────────────────────────────────────
-- Run these in Supabase Dashboard > Storage > Policies

-- student-documents bucket: students can upload their own, admins can read all
-- student-avatars bucket: public read, authenticated write
-- complaint-photos bucket: students can upload, admins can read all

-- ============================================================
-- DONE — Run: npm run db:test-rls to verify
-- ============================================================
