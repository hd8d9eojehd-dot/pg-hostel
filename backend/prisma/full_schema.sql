-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "address" TEXT NOT NULL,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "pincode" VARCHAR(10),
    "contact_primary" VARCHAR(15),
    "contact_secondary" VARCHAR(15),
    "email" VARCHAR(100),
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "branch_id" UUID NOT NULL,
    "floor_number" INTEGER NOT NULL,
    "floor_name" VARCHAR(50),

    CONSTRAINT "floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "branch_id" UUID NOT NULL,
    "floor_id" UUID NOT NULL,
    "room_number" VARCHAR(20) NOT NULL,
    "room_type" VARCHAR(20) NOT NULL,
    "bed_count" INTEGER NOT NULL,
    "has_attached_bath" BOOLEAN NOT NULL DEFAULT false,
    "is_furnished" BOOLEAN NOT NULL DEFAULT true,
    "has_wifi" BOOLEAN NOT NULL DEFAULT true,
    "monthly_rent" DECIMAL(10,2),
    "semester_rent" DECIMAL(10,2),
    "annual_rent" DECIMAL(10,2),
    "status" VARCHAR(20) NOT NULL DEFAULT 'available',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "bed_label" VARCHAR(5) NOT NULL,
    "is_occupied" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supabase_auth_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "mobile" VARCHAR(15) NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'staff',
    "branch_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supabase_auth_id" UUID,
    "student_id" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "father_name" VARCHAR(100),
    "mobile" VARCHAR(15) NOT NULL,
    "parent_mobile" VARCHAR(15),
    "email" VARCHAR(100),
    "aadhaar" VARCHAR(12),
    "college" VARCHAR(150),
    "course" VARCHAR(100),
    "branch" VARCHAR(100),
    "year_of_study" INTEGER,
    "semester" INTEGER,
    "permanent_address" TEXT,
    "emergency_contact" VARCHAR(15),
    "emergency_contact_name" VARCHAR(100),
    "joining_date" DATE NOT NULL,
    "stay_duration" VARCHAR(20) NOT NULL,
    "stay_end_date" DATE NOT NULL,
    "room_id" UUID,
    "bed_id" UUID,
    "rent_package" VARCHAR(20) NOT NULL,
    "deposit_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "deposit_refunded" BOOLEAN NOT NULL DEFAULT false,
    "deposit_refund_date" DATE,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "is_first_login" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "avatar_url" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "supabase_auth_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "mobile" VARCHAR(15) NOT NULL,
    "alternate_mobile" VARCHAR(15),
    "relation" VARCHAR(50),
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "invoice_number" VARCHAR(30) NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "late_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "due_date" DATE NOT NULL,
    "generated_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) NOT NULL DEFAULT 'due',
    "paid_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "generated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "receipt_number" VARCHAR(30) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_mode" VARCHAR(20) NOT NULL,
    "transaction_ref" VARCHAR(100),
    "paid_date" DATE NOT NULL,
    "recorded_by" UUID,
    "cashfree_order_id" VARCHAR(100),
    "cashfree_payment_id" VARCHAR(100),
    "cashfree_status" VARCHAR(30),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extra_charges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "charge_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "added_by" UUID NOT NULL,
    "invoice_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extra_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "branch_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(30) NOT NULL,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expiry_date" DATE,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "whatsapp_sent" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp_sent_at" TIMESTAMP(3),

    CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "complaint_number" VARCHAR(20) NOT NULL,
    "student_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "category" VARCHAR(30) NOT NULL,
    "description" TEXT NOT NULL,
    "photo_url" TEXT,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "status" VARCHAR(20) NOT NULL DEFAULT 'new',
    "assigned_to" UUID,
    "resolution_note" TEXT,
    "resolved_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "complaint_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "author_type" VARCHAR(10) NOT NULL,
    "comment" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_menu" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "branch_id" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "day_of_month" INTEGER NOT NULL,
    "meal_type" VARCHAR(15) NOT NULL,
    "items" TEXT NOT NULL,
    "is_special" BOOLEAN NOT NULL DEFAULT false,
    "special_label" VARCHAR(100),
    "special_note" TEXT,
    "is_holiday" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "food_menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_timings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "branch_id" UUID NOT NULL,
    "breakfast_start" TEXT NOT NULL DEFAULT '07:30',
    "breakfast_end" TEXT NOT NULL DEFAULT '09:30',
    "lunch_start" TEXT NOT NULL DEFAULT '12:30',
    "lunch_end" TEXT NOT NULL DEFAULT '14:30',
    "dinner_start" TEXT NOT NULL DEFAULT '19:30',
    "dinner_end" TEXT NOT NULL DEFAULT '21:30',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_timings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outpass" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "outpass_number" VARCHAR(20) NOT NULL,
    "student_id" UUID NOT NULL,
    "type" VARCHAR(10) NOT NULL,
    "from_date" DATE NOT NULL,
    "to_date" DATE NOT NULL,
    "from_time" VARCHAR(5),
    "to_time" VARCHAR(5),
    "reason" TEXT NOT NULL,
    "destination" VARCHAR(200),
    "contact_at_destination" VARCHAR(15),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "approved_by" UUID,
    "approval_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "return_confirmed_at" TIMESTAMP(3),
    "return_confirmed_by" UUID,

    CONSTRAINT "outpass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "label" VARCHAR(100),
    "file_url" TEXT NOT NULL,
    "file_name" VARCHAR(200),
    "file_size" INTEGER,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by" UUID,
    "verified_at" TIMESTAMP(3),
    "rejection_note" TEXT,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "food_rating" INTEGER,
    "cleanliness_rating" INTEGER,
    "wifi_rating" INTEGER,
    "staff_rating" INTEGER,
    "overall_rating" INTEGER,
    "comment" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "from_room_id" UUID,
    "from_bed_id" UUID,
    "to_room_id" UUID NOT NULL,
    "to_bed_id" UUID NOT NULL,
    "changed_by" UUID NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "room_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "renewal_exit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "type" VARCHAR(10) NOT NULL,
    "request_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_date" DATE NOT NULL,
    "new_room_id" UUID,
    "new_package" VARCHAR(20),
    "deposit_refund_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "damage_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "final_dues" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "inspection_notes" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "processed_by" UUID,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "renewal_exit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID NOT NULL,
    "actor_type" VARCHAR(10) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID,
    "meta" JSONB,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipient_mobile" VARCHAR(15) NOT NULL,
    "student_id" UUID,
    "template_name" VARCHAR(100) NOT NULL,
    "message_body" TEXT NOT NULL,
    "wa_message_id" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'queued',
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "branch_id" UUID NOT NULL,
    "late_fee_type" VARCHAR(20) NOT NULL DEFAULT 'flat',
    "late_fee_amount" DECIMAL(10,2) NOT NULL DEFAULT 500,
    "grace_period_days" INTEGER NOT NULL DEFAULT 7,
    "deposit_policy" TEXT,
    "auto_invoice_enabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsapp_templates" JSONB NOT NULL DEFAULT '{}',
    "staff_permissions" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "floors_branch_id_floor_number_key" ON "floors"("branch_id", "floor_number");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_branch_id_room_number_key" ON "rooms"("branch_id", "room_number");

-- CreateIndex
CREATE UNIQUE INDEX "beds_room_id_bed_label_key" ON "beds"("room_id", "bed_label");

-- CreateIndex
CREATE UNIQUE INDEX "admins_supabase_auth_id_key" ON "admins"("supabase_auth_id");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "students_supabase_auth_id_key" ON "students"("supabase_auth_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_student_id_key" ON "students"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_bed_id_key" ON "students"("bed_id");

-- CreateIndex
CREATE UNIQUE INDEX "parents_student_id_key" ON "parents"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "parents_supabase_auth_id_key" ON "parents"("supabase_auth_id");

-- CreateIndex
CREATE UNIQUE INDEX "parents_mobile_key" ON "parents"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receipt_number_key" ON "payments"("receipt_number");

-- CreateIndex
CREATE UNIQUE INDEX "complaints_complaint_number_key" ON "complaints"("complaint_number");

-- CreateIndex
CREATE UNIQUE INDEX "food_menu_branch_id_month_year_day_of_month_meal_type_key" ON "food_menu"("branch_id", "month", "year", "day_of_month", "meal_type");

-- CreateIndex
CREATE UNIQUE INDEX "meal_timings_branch_id_key" ON "meal_timings"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "outpass_outpass_number_key" ON "outpass"("outpass_number");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_student_id_month_year_key" ON "feedback"("student_id", "month", "year");

-- CreateIndex
CREATE INDEX "activity_logs_actor_id_idx" ON "activity_logs"("actor_id");

-- CreateIndex
CREATE INDEX "activity_logs_entity_type_entity_id_idx" ON "activity_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "settings_branch_id_key" ON "settings"("branch_id");

-- AddForeignKey
ALTER TABLE "floors" ADD CONSTRAINT "floors_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "floors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parents" ADD CONSTRAINT "parents_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extra_charges" ADD CONSTRAINT "extra_charges_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_comments" ADD CONSTRAINT "complaint_comments_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_menu" ADD CONSTRAINT "food_menu_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_timings" ADD CONSTRAINT "meal_timings_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outpass" ADD CONSTRAINT "outpass_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outpass" ADD CONSTRAINT "outpass_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_history" ADD CONSTRAINT "room_history_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_history" ADD CONSTRAINT "room_history_from_room_id_fkey" FOREIGN KEY ("from_room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_history" ADD CONSTRAINT "room_history_to_room_id_fkey" FOREIGN KEY ("to_room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_history" ADD CONSTRAINT "room_history_from_bed_id_fkey" FOREIGN KEY ("from_bed_id") REFERENCES "beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_history" ADD CONSTRAINT "room_history_to_bed_id_fkey" FOREIGN KEY ("to_bed_id") REFERENCES "beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_history" ADD CONSTRAINT "room_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewal_exit" ADD CONSTRAINT "renewal_exit_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewal_exit" ADD CONSTRAINT "renewal_exit_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_logs" ADD CONSTRAINT "whatsapp_logs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

