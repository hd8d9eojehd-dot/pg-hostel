# Implementation Plan: PG Hostel v2 Enhancements

## Overview

Incremental implementation of 20 requirements across the backend (Express + Prisma), admin-portal (Next.js 14), and student-portal (Next.js 14). Tasks are ordered so each step builds on the previous, with shared schema/type changes first, then backend endpoints, then frontend pages.

---

## Tasks

- [x] 1. Shared schema and type updates
  - [x] 1.1 Add `fatherAadhaar` field to `CreateStudentSchema` and `UpdateStudentSchema` in `shared/src/schemas/student.schema.ts`
    - Add `fatherAadhaar: z.string().regex(/^\d{12}$/).optional()` alongside existing `aadhaar` field
    - Export updated `CreateStudentInput` and `UpdateStudentInput` types
    - _Requirements: 5.3, 5.5_
  - [x] 1.2 Add `RenewStudentSchema` to `shared/src/schemas/student.schema.ts`
    - Fields: `roomId`, `bedId`, `joiningDate`, `stayDuration`, `rentPackage`, `depositAmount`
    - Export `RenewStudentInput` type
    - _Requirements: 2.2, 2.3_
  - [x] 1.3 Add `DeleteStudentSchema` to `shared/src/schemas/student.schema.ts`
    - Fields: `confirmStudentId` (string, must match student's studentId)
    - Export `DeleteStudentInput` type
    - _Requirements: 1.1, 1.2_
  - [x] 1.4 Add `groupType` field to `CreateFloorSchema` in `shared/src/schemas/room.schema.ts`
    - `groupType: z.enum(['floor', 'villa']).default('floor')`
    - _Requirements: 13.2, 13.4_
  - [x] 1.5 Add `WeeklyTemplateSchema` and `ApplyTemplateSchema` to `shared/src/schemas/food.schema.ts`
    - `WeeklyTemplateSchema`: array of 7 days, each with breakfast/lunch/snacks/dinner items
    - `ApplyTemplateSchema`: branchId, targetMonths array `[{month, year}]`
    - Update `UpdateMealTimingsSchema` to include `snacksStart`/`snacksEnd` fields (currently missing)
    - _Requirements: 7.1, 7.2, 6.4, 6.5_
  - [x] 1.6 Add `InitialPaymentSchema` to `shared/src/schemas/finance.schema.ts`
    - Fields: `paymentMode` (enum: `online`, `semi_offline`, `cash`), `transactionRef` (optional), `cashAmount` (optional)
    - _Requirements: 11.1, 11.5_

- [x] 2. Database migration — new fields
  - [x] 2.1 Add `fatherAadhaar` column to the `students` table via Prisma migration
    - Add `fatherAadhaar String? @map("father_aadhaar") @db.VarChar(12)` to `Student` model in `backend/prisma/schema.prisma`
    - Run `npx prisma migrate dev --name add_father_aadhaar`
    - _Requirements: 5.5_
  - [x] 2.2 Add `groupType` column to the `floors` table via Prisma migration
    - Add `groupType String @default("floor") @map("group_type") @db.VarChar(10)` to `Floor` model
    - Run `npx prisma migrate dev --name add_floor_group_type`
    - _Requirements: 13.4_

- [x] 3. Backend — Student permanent deletion (Requirement 1)
  - [x] 3.1 Add `deleteStudent` service function in `backend/src/services/student.service.ts`
    - Verify `confirmStudentId` matches `student.studentId`; throw 400 if not
    - If student has outstanding invoice balances > 0, include `hasOutstandingBalance: true` in response (frontend handles double-confirm)
    - Hard-delete in a Prisma transaction: delete invoices, payments, documents, complaints, outpass, feedback, roomHistory, then student
    - Free the associated bed (`isOccupied: false`) and update room status
    - Log action to `ActivityLog` with `action: 'DELETED'`, `entityType: 'student'`
    - _Requirements: 1.2, 1.3, 1.4, 1.5_
  - [x] 3.2 Add `deleteStudent` controller and route
    - `DELETE /students/:id` — `requireAdmin`, validate `DeleteStudentSchema` from request body
    - Wire into `backend/src/routes/student.routes.ts`
    - _Requirements: 1.1, 1.2_

- [x] 4. Backend — Vacated student renewal (Requirement 2)
  - [x] 4.1 Add `renewStudent` service function in `backend/src/services/student.service.ts`
    - Verify student status is `'vacated'`; throw 400 otherwise
    - Check new bed availability; throw 409 if occupied
    - In a transaction: update student to `active`, assign new roomId/bedId, set new `stayEndDate`, mark bed occupied, update room status, log `RoomHistory`
    - Create a new Invoice for the first period's fee (use same logic as existing invoice creation)
    - Send WhatsApp welcome message via `notifyAdmission` (non-blocking)
    - _Requirements: 2.3, 2.4, 2.5_
  - [x] 4.2 Add `renewStudent` controller and route
    - `POST /students/:id/renew` — `requireAdmin`, validate `RenewStudentSchema`
    - Wire into `backend/src/routes/student.routes.ts`
    - _Requirements: 2.1, 2.3_

- [x] 5. Backend — Aadhaar details storage (Requirement 5)
  - [x] 5.1 Update `createStudent` service to accept and store `fatherAadhaar`
    - Pass `fatherAadhaar: input.fatherAadhaar` in the `prisma.student.create` data block
    - _Requirements: 5.5_
  - [x] 5.2 Update `updateStudent` service to accept and store `fatherAadhaar`
    - Include `fatherAadhaar` in the `prisma.student.update` data spread
    - _Requirements: 5.5_

- [x] 6. Backend — Finance summary and payment fixes (Requirement 10)
  - [x] 6.1 Fix `getFinanceSummary` in `backend/src/services/finance.service.ts`
    - Ensure it returns `totalCollected` (sum of all payment amounts), `thisMonthCollected` (current month), `totalPending` (sum of all invoice balances with status due/partial/overdue), `overdueCount` (count of overdue invoices)
    - _Requirements: 10.1, 10.2_
  - [x] 6.2 Fix `recordPayment` in `backend/src/services/finance.service.ts` (or `payment.service.ts`)
    - After recording payment, recalculate `invoice.paidAmount` and `invoice.balance`; set `status` to `'paid'` if balance equals zero
    - Return 422 if `payment.amount > invoice.balance`
    - _Requirements: 10.3, 10.5_
  - [x] 6.3 Fix revenue report in `backend/src/services/report.service.ts`
    - Ensure `revenueReport` returns correct `totalCollected` and `totalDue` for the selected month/year
    - _Requirements: 10.6_

- [x] 7. Backend — Initial fee payment during registration (Requirement 11)
  - [x] 7.1 Update `createStudent` service to accept and process `initialPayment` field
    - After creating the student, generate an Invoice for the first period's fee
    - If `paymentMode === 'cash'` or `'semi_offline'`, record a Payment immediately and generate a receipt
    - If `paymentMode === 'online'`, return a Cashfree payment session ID for the frontend to redirect
    - Return `{ student, tempPassword, invoice, payment?, receiptNumber? }` in the response
    - _Requirements: 11.5, 11.6, 11.7_
  - [x] 7.2 Update `CreateStudentSchema` in shared to include optional `initialPayment` field using `InitialPaymentSchema`
    - _Requirements: 11.1_

- [x] 8. Backend — Activity log endpoint (Requirement 19)
  - [x] 8.1 Add or fix `GET /activity` route in `backend/src/routes/`
    - Currently the activity page calls `/dashboard/activity`; add a dedicated `/activity` route (or alias) in `backend/src/routes/index.ts`
    - Return paginated `ActivityLog` records with `admin` relation included, ordered by `createdAt` desc, default page size 50
    - Support query params: `action`, `startDate`, `endDate`
    - _Requirements: 19.1, 19.4_
  - [x] 8.2 Ensure `ActivityLog` entries are written for all required actions
    - Audit `student.service.ts`, `finance.service.ts`, `room.service.ts`, `notice` controller — add `activityLog.service.ts` calls for: student created, updated, deleted, vacated, renewed; payment recorded; invoice created; room created/updated; notice published
    - _Requirements: 19.5_

- [x] 9. Backend — WhatsApp enhancements (Requirement 20)
  - [x] 9.1 Update `sendBulk` controller/service to accept a `filter` object (`{ status?, floorId?, feeStatus? }`)
    - Apply filter when querying students before sending messages
    - _Requirements: 20.1, 20.2_
  - [x] 9.2 Add `PATCH /settings/whatsapp-templates` endpoint (or reuse existing `POST /settings`)
    - Update `settings.whatsappTemplates` JSON field for the branch
    - _Requirements: 20.3, 20.4_
  - [x] 9.3 Update `getWhatsAppLogs` to support `status` and date range query params
    - _Requirements: 20.5_

- [x] 10. Backend — Room group type (Requirement 13)
  - [x] 10.1 Update `createFloor` service in `backend/src/services/room.service.ts` to persist `groupType`
    - Pass `groupType` from `CreateFloorInput` to `prisma.floor.create`
    - _Requirements: 13.4_
  - [x] 10.2 Update `getFloorMap` service to include `groupType` in the returned floor objects
    - _Requirements: 13.5_

- [x] 11. Backend — Food menu weekly template (Requirements 6 & 7)
  - [x] 11.1 Add `applyWeeklyTemplate` service function in `backend/src/services/food.service.ts` (or equivalent)
    - Accept `branchId`, `template` (7-day array), `targetMonths` array
    - For each target month, upsert FoodMenu records for every day using `(dayOfMonth - 1) % 7` to index into the template
    - _Requirements: 6.4, 7.3_
  - [x] 11.2 Add `POST /food/apply-template` route
    - `requireAdmin`, validate `ApplyTemplateSchema`
    - Wire into `backend/src/routes/food.routes.ts`
    - _Requirements: 6.5, 7.5_

- [x] 12. Backend — ID card QR code endpoint (Requirement 9)
  - [x] 12.1 Add `GET /portal/id-card` endpoint in `backend/src/routes/portal.routes.ts`
    - Compute current `feeStatus` from student's active invoices
    - Sign a JWT payload `{ studentId, name, roomNumber, bedLabel, feeStatus, exp: now+24h }` using `process.env.JWT_SECRET`
    - Return `{ studentId, name, branch, roomNumber, bedLabel, feeStatus, qrPayload, validUntil, hostelName, logoUrl }`
    - _Requirements: 9.3, 9.4_
  - [x] 12.2 Add `GET /students/verify-qr` public endpoint in `backend/src/routes/student.routes.ts`
    - Verify JWT signature; return student's current details if valid, 401 if expired/invalid
    - _Requirements: 9.5_

- [x] 13. Backend — Password reset via WhatsApp OTP (Requirement 17)
  - The `forgotPassword` and `resetPassword` endpoints already exist in `backend/src/controllers/auth.controller.ts`. Verify they fully satisfy Req 17:
  - [x] 13.1 Verify `forgotPassword` validates mobile against `student.mobile` OR `student.parent.mobile` and returns 400 with "Mobile number not registered" if neither matches
    - Update error message text if it doesn't match the spec
    - _Requirements: 17.2, 17.3_
  - [x] 13.2 Verify OTP expiry is 5 minutes and max 3 attempts before 15-minute block in `backend/src/services/otp.service.ts`
    - Update `otp.service.ts` if the current limits differ
    - _Requirements: 17.8_
  - [x] 13.3 Verify `resetPassword` invalidates the student's current Supabase session after password change
    - Call `supabaseAdmin.auth.admin.signOut(supabaseAuthId)` after updating the password
    - _Requirements: 17.7_

- [x] 14. Checkpoint — Backend core complete
  - Ensure all backend services compile without TypeScript errors (`npx tsc --noEmit` in `backend/`)
  - Verify Prisma client is regenerated after migrations (`npx prisma generate`)
  - Ask the user if questions arise before proceeding to frontend tasks.

- [x] 15. Admin portal — Student registration form updates (Requirements 3, 5, 8, 11)
  - [x] 15.1 Remove "Number of Semesters to Pay" input from `admin-portal/src/app/(dashboard)/students/new/page.tsx`
    - Remove the `semesters` state variable and its `<Input>` field
    - Update fee calculation: `calcFee` should use `1` semester for semester/annual packages and `6` months for monthly
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 15.2 Replace document upload section with Aadhaar Details form in the student registration page
    - Remove `REQUIRED_DOCS`, `OPTIONAL_DOCS`, `DocFile` type, `docs` state, `handleDocFile`, and the Documents `<Card>` section
    - Add an "Aadhaar Details" `<Card>` with fields: student Aadhaar (pre-filled from `aadhaar` field), father name (pre-filled from `fatherName`), father Aadhaar number (new `fatherAadhaar` field), permanent address (pre-filled)
    - Wire `fatherAadhaar` into the form via `register('fatherAadhaar')`
    - _Requirements: 5.1, 5.2_
  - [x] 15.3 Add "Passport Photo" upload field to the student registration form
    - Add a required photo upload input above the Aadhaar section
    - Show image preview after selection
    - On form submit, upload photo to `/documents/upload` with `type: 'photo'` and store the returned URL; pass it as `avatarUrl` in the student creation payload (update `CreateStudentSchema` to accept optional `avatarUrl`)
    - Display 422 error "Passport photo is required" if not uploaded
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.6_
  - [x] 15.4 Add "Fee Payment" section to the student registration form
    - Add payment mode selector: "Online", "Semi-Offline", "Cash"
    - Show transaction reference input when "Semi-Offline" is selected
    - Show cash amount input when "Cash" is selected
    - On successful registration, if payment mode is cash/semi-offline, display receipt modal (reuse existing receipt modal pattern from `record-payment/page.tsx`)
    - If payment mode is online, redirect to Cashfree after student creation
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.6, 11.7, 11.8_

- [x] 16. Admin portal — Student profile page updates (Requirements 1, 2, 5)
  - [x] 16.1 Add "Delete Permanently" button to `admin-portal/src/app/(dashboard)/students/[id]/page.tsx`
    - Add a delete dialog that requires typing the student ID to confirm
    - If student has outstanding balance, show a second confirmation warning
    - On confirm, call `DELETE /students/:id` with `{ confirmStudentId }` body
    - On success, redirect to `/students`
    - _Requirements: 1.1, 1.4_
  - [x] 16.2 Add "Renew / Re-admit" button for vacated students in the student profile page
    - Show button only when `student.status === 'vacated'`
    - Open a dialog with room/bed selector, joining date, stay duration, rent package, deposit amount
    - On submit, call `POST /students/:id/renew`
    - On success, invalidate student query and show success toast
    - _Requirements: 2.1, 2.2, 2.5_
  - [x] 16.3 Display Aadhaar details on the student profile page (Details tab)
    - Add an "Identity" card section showing: student Aadhaar (masked: `XXXX XXXX 1234`), father Aadhaar (masked), father name
    - Fetch from `student.aadhaar` and `student.fatherAadhaar`
    - _Requirements: 5.6_

- [x] 17. Admin portal — Food menu calendar accuracy (Requirements 6 & 7)
  - [x] 17.1 Fix day-of-week labels in `admin-portal/src/app/(dashboard)/food/page.tsx`
    - The current implementation already derives day-of-week from `new Date(year, month - 1, day).getDay()` — verify this is correct and the `DAYS` array is used properly for all days in month view
    - _Requirements: 6.1, 6.2_
  - [x] 17.2 Add "Weekly Template" editor in `admin-portal/src/app/(dashboard)/food/edit/page.tsx` (or a new sub-page)
    - UI: 7-day grid with breakfast/lunch/snacks/dinner text inputs for each day
    - "Save Template" button calls `POST /food/weekly-template`
    - "Apply to Month(s)" button with month range selector (1–12 months) calls `POST /food/apply-template`
    - Show a 7-day preview before confirming apply
    - _Requirements: 7.1, 7.2, 7.4, 7.5_

- [x] 18. Admin portal — Room management Floors/Villas (Requirement 13)
  - [x] 18.1 Update `admin-portal/src/app/(dashboard)/rooms/floors/page.tsx` to support Floor/Villa type
    - Add a "Type" selector (Floor / Villa) when creating a new floor/group
    - Pass `groupType` in the create floor API call
    - _Requirements: 13.1, 13.2_
  - [x] 18.2 Update the floor map in `admin-portal/src/app/(dashboard)/rooms/page.tsx` to visually distinguish Villas
    - Use a house icon (e.g., `Home` from lucide-react) for Villa groups vs the current floor label
    - Display "Villa" label instead of "Floor N" when `groupType === 'villa'`
    - _Requirements: 13.1, 13.3, 13.6_

- [x] 19. Admin portal — Activity page enhancements (Requirement 19)
  - [x] 19.1 Update `admin-portal/src/app/(dashboard)/activity/page.tsx` to call `/activity` instead of `/dashboard/activity`
    - Add action type filter dropdown and date range pickers
    - Pass `action`, `startDate`, `endDate` as query params
    - _Requirements: 19.1, 19.3_

- [x] 20. Admin portal — WhatsApp page enhancements (Requirement 20)
  - [x] 20.1 Add student filter controls to the Bulk tab in `admin-portal/src/app/(dashboard)/whatsapp/page.tsx`
    - Add filter selectors: status (active/all), floor, fee status
    - Pass selected filters to the bulk send API call
    - _Requirements: 20.1, 20.2_
  - [x] 20.2 Add "Templates" tab to the WhatsApp page
    - Fetch templates from `GET /settings` (`settings.whatsappTemplates`)
    - Allow editing template text and saving via `PATCH /settings/whatsapp-templates`
    - _Requirements: 20.3, 20.4_
  - [x] 20.3 Add status and date range filters to the Logs tab
    - Add status filter (sent/delivered/failed/queued) and date range inputs
    - Pass as query params to `GET /whatsapp/logs`
    - _Requirements: 20.5_

- [x] 21. Checkpoint — Admin portal complete
  - Ensure admin portal builds without TypeScript errors (`npx tsc --noEmit` in `admin-portal/`)
  - Ask the user if questions arise before proceeding to student portal tasks.

- [x] 22. Student portal — Payment status page (Requirement 14)
  - [x] 22.1 Enhance `student-portal/src/app/(portal)/finance/payment-status/page.tsx`
    - After redirect from Cashfree, fetch updated invoice and payment from `GET /portal/invoices` filtered by `order_id`
    - Display: receipt number, amount paid, payment date, payment mode, invoice number
    - On failure, display the failure reason from query params and a "Try Again" button that navigates back to `/finance`
    - Invalidate `my-invoices` query cache on page load
    - Add "Download Receipt" link pointing to `/finance/receipts/{receiptNumber}`
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 23. Student portal — ID card on home page (Requirement 15)
  - [x] 23.1 Create `IdCard` component at `student-portal/src/components/id-card.tsx`
    - Fetch data from `GET /portal/id-card`
    - Display: hostel name, student ID, student name, academic branch, room number, bed label, fee status
    - Render QR code as inline SVG/canvas using a QR library (e.g., `qrcode` npm package)
    - Fee status in red when `'overdue'`, green when `'paid'`
    - Show "Valid until" timestamp
    - No download button
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_
  - [x] 23.2 Add `IdCard` component to `student-portal/src/app/(portal)/home/page.tsx`
    - Render below the room card
    - _Requirements: 15.1_

- [x] 24. Student portal — Food timetable day/month view (Requirement 16)
  - [x] 24.1 Create `student-portal/src/app/(portal)/food/page.tsx`
    - Add a "Today / Month" toggle (default: Today)
    - Today view: show current day's meals (breakfast, lunch, snacks, dinner) with items and timings from `homeData.food`
    - Month view: scrollable table of all days in current month with meal items, special badge (✨), holiday badge (🎉)
    - Fetch month data from `GET /portal/food?month=X&year=Y`
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_
  - [x] 24.2 Add food page link to the student portal navigation
    - Update `student-portal/src/app/(portal)/layout.tsx` bottom nav to include a food menu link pointing to `/food`
    - _Requirements: 16.1_

- [x] 25. Student portal — Password change via WhatsApp OTP (Requirement 17)
  - [x] 25.1 Update `student-portal/src/app/(portal)/profile/change-password/page.tsx`
    - Replace the current "current password" flow with a two-step OTP flow:
      - Step 1: Input for registered mobile number → call `POST /auth/forgot-password` with `{ studentId }` (studentId from auth store) and display the masked mobile
      - Step 2: OTP input → call `POST /auth/reset-password` with `{ studentId, mobile, otp, newPassword }`
    - Display "Mobile number not registered" on 400 error
    - Display "Invalid or expired OTP" on OTP failure
    - On success, clear auth store and redirect to login
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7_

- [x] 26. Student portal — Profile photo display (Requirement 18)
  - [x] 26.1 Verify `student-portal/src/app/(portal)/profile/page.tsx` already displays `avatarUrl` — it does. Ensure fallback to initials when `avatarUrl` is null
    - The current code already handles this; confirm the image is loaded at ≥ 64×64 px
    - _Requirements: 18.1, 18.2, 18.5_
  - [x] 26.2 Update `student-portal/src/components/layout/top-bar.tsx` to display the student's profile photo as a small circular avatar
    - Fetch profile from auth store or `GET /portal/profile`; display `avatarUrl` at 32×32 px with initials fallback
    - _Requirements: 18.3, 18.4, 18.5_

- [x] 27. Final checkpoint — Full system integration
  - Ensure both portals and backend compile without TypeScript errors
  - Verify Prisma client is up to date
  - Ensure all new API routes are registered in `backend/src/routes/index.ts`
  - Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- The design.md was minimal; tasks are derived directly from requirements.md
- All code should follow existing project conventions: TypeScript strict mode, Zod validation on all inputs, Prisma transactions for multi-step DB operations, `ApiError` for error responses
- The `fatherAadhaar` Prisma migration (task 2.1) must be run before any backend tasks that write to the student table
- QR code rendering in task 23.1 requires installing a QR library — use `qrcode` (already common in Node/React ecosystems) or `react-qr-code`
