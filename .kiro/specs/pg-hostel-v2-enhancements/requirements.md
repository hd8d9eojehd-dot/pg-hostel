# Requirements Document

## Introduction

This document captures the v2 enhancement requirements for the PG Hostel Management Platform — a monorepo consisting of a backend (Express + Prisma + Supabase), an admin portal (Next.js 14), and a student portal (Next.js 14). The enhancements span student lifecycle management, fee structure simplification, identity verification, food menu management, ID card redesign, payment flows, room management, and student-facing portal improvements.

---

## Glossary

- **Admin_Portal**: The Next.js 14 dashboard used by hostel administrators (port 3000).
- **Student_Portal**: The Next.js 14 mobile-first web app used by students (port 3001).
- **Backend**: The Express + Prisma + Supabase API server (port 4000).
- **Student**: A resident registered in the hostel management system.
- **Admin**: A hostel staff member or manager with access to the Admin_Portal.
- **Invoice**: A fee record generated for a Student, with a balance and due date.
- **Payment**: A recorded settlement against an Invoice.
- **Receipt**: An auto-generated PDF document confirming a Payment.
- **ID_Card**: A digital identity card rendered in the Student_Portal for a Student.
- **QR_Code**: A machine-readable code embedded in the ID_Card encoding Student details.
- **Fee_Structure**: The configuration of rent type (monthly/semester/yearly) and corresponding amounts for a room.
- **Prepaid_Fee**: A fee collected upfront at the time of student registration.
- **Aadhaar_Details**: A structured form capturing student name, Aadhaar number, father name, father Aadhaar number, and permanent address.
- **Passport_Photo**: A photograph uploaded during student registration that serves as the permanent profile photo.
- **Food_Menu**: The meal plan for a branch, stored per day of month with meal type and items.
- **Weekly_Template**: A 7-day repeating meal pattern used to populate a full month's Food_Menu.
- **Floor**: A physical level within a hostel building.
- **Villa**: A standalone unit within the hostel property, treated as a peer of Floor for room grouping.
- **Room_Group**: A Floor or Villa that contains one or more Rooms.
- **OTP**: A one-time password sent via WhatsApp for identity verification.
- **Payment_Mode**: One of three modes — online (Cashfree gateway), semi-offline (UPI/bank transfer with reference), or cash.
- **Fee_Status**: The current payment state of a Student's invoices — "paid", "partial", "due", or "overdue".
- **Activity_Log**: A timestamped record of admin actions stored in the Backend.
- **WhatsApp_Service**: The WhatsApp messaging integration used for OTP delivery and notifications.

---

## Requirements

---

### Requirement 1: Permanent Student Deletion

**User Story:** As an Admin, I want to permanently delete a student record, so that I can remove test entries or incorrectly admitted students from the system.

#### Acceptance Criteria

1. WHEN an Admin selects "Delete Permanently" on a Student profile, THE Admin_Portal SHALL display a confirmation dialog requiring the Admin to type the Student's student ID before proceeding.
2. WHEN the Admin confirms deletion with the correct student ID, THE Backend SHALL hard-delete the Student record and all associated data (invoices, payments, documents, complaints, outpass, feedback, room history) from the database.
3. WHEN a Student is permanently deleted, THE Backend SHALL free the associated Bed and update the Room status to reflect the vacancy.
4. IF a Student has outstanding Invoice balances greater than zero, THEN THE Admin_Portal SHALL display a warning and require a second explicit confirmation before allowing deletion.
5. WHEN a Student is permanently deleted, THE Backend SHALL log the action in the Activity_Log with the admin ID, student ID, and timestamp.

---

### Requirement 2: Vacated Student Renewal

**User Story:** As an Admin, I want to re-admit a previously vacated student, so that returning residents can be onboarded without creating a duplicate record.

#### Acceptance Criteria

1. WHEN an Admin views a Student with status "vacated", THE Admin_Portal SHALL display a "Renew / Re-admit" action button.
2. WHEN the Admin initiates renewal, THE Admin_Portal SHALL present a form to select a new Room, Bed, joining date, stay duration, rent package, and deposit amount.
3. WHEN the Admin submits the renewal form, THE Backend SHALL update the Student status to "active", assign the new Room and Bed, set a new stayEndDate, and create a new Invoice for the first period's fee.
4. WHEN renewal is complete, THE Backend SHALL send a WhatsApp welcome message to the Student's registered mobile number.
5. IF the selected Bed is already occupied, THEN THE Backend SHALL return a 409 error and THE Admin_Portal SHALL display the message "Selected bed is already occupied."

---

### Requirement 3: Fee Structure Simplification

**User Story:** As an Admin, I want the fee structure to use the semester value from academic details and show only the relevant fee type, so that the registration form is simpler and less error-prone.

#### Acceptance Criteria

1. THE Admin_Portal SHALL remove the "Number of Semesters to Pay" input field from the student registration form.
2. WHEN an Admin selects rent package "semester", THE Admin_Portal SHALL display only the semester fee amount and calculate the first-period fee as `semesterRent × 1`.
3. WHEN an Admin selects rent package "monthly", THE Admin_Portal SHALL display only the monthly fee amount and calculate the first-period fee as `monthlyRent × 6` (one semester = 6 months).
4. WHEN an Admin selects rent package "annual", THE Admin_Portal SHALL display only the annual fee amount and calculate the first-period fee as `annualRent × 1`.
5. THE Admin_Portal SHALL use the `semester` field from the Academic Information section as the student's current semester, without a separate semesters-to-pay counter.

---

### Requirement 4: Prepaid Fee Structure Configuration

**User Story:** As an Admin, I want to configure a prepaid fee structure per branch, so that the correct fee is automatically applied when a student is registered.

#### Acceptance Criteria

1. THE Admin_Portal SHALL provide a "Fee Structure" settings section where an Admin can set the default fee type (monthly/semester/yearly) and corresponding amounts for each room type.
2. WHEN an Admin saves a Fee_Structure configuration, THE Backend SHALL persist the configuration linked to the branch and room type.
3. WHEN a new Student is registered and a Room is selected, THE Admin_Portal SHALL auto-populate the fee fields from the saved Fee_Structure for that room type.
4. THE Admin_Portal SHALL allow the Admin to override the auto-populated fee values before submitting the registration form.
5. WHEN the fee type is "semester", THE Admin_Portal SHALL display the semester fee and hide monthly and annual fee fields.
6. WHEN the fee type is "monthly", THE Admin_Portal SHALL display the monthly fee and hide semester and annual fee fields.
7. WHEN the fee type is "yearly", THE Admin_Portal SHALL display the annual fee and hide monthly and semester fee fields.

---

### Requirement 5: Replace Document Upload with Aadhaar Details Form

**User Story:** As an Admin, I want to capture Aadhaar details as structured form fields instead of uploading document files, so that identity information is searchable and consistently stored.

#### Acceptance Criteria

1. THE Admin_Portal SHALL remove the document file upload section from the student registration form.
2. THE Admin_Portal SHALL replace the document upload section with an Aadhaar_Details form containing: student name (pre-filled, read-only), student Aadhaar number (12 digits), father name, father Aadhaar number (12 digits), and permanent address.
3. WHEN an Admin submits the registration form, THE Backend SHALL validate that the student Aadhaar number and father Aadhaar number each contain exactly 12 numeric digits.
4. IF an Aadhaar number does not contain exactly 12 numeric digits, THEN THE Backend SHALL return a 422 error and THE Admin_Portal SHALL display the message "Aadhaar number must be exactly 12 digits."
5. THE Backend SHALL store Aadhaar details in the Student record's existing `aadhaar` field and in a new `fatherAadhaar` field, and store father name in the existing `fatherName` field.
6. THE Admin_Portal SHALL display the stored Aadhaar details on the Student profile page, masking all but the last 4 digits of each Aadhaar number (e.g., "XXXX XXXX 1234").

---

### Requirement 6: Food Menu — Calendar-Accurate Day Mapping

**User Story:** As an Admin, I want food menu days to correspond to the actual calendar days of each month, so that the correct day-of-week is shown for every date.

#### Acceptance Criteria

1. WHEN the Admin_Portal renders the food menu grid for a given month and year, THE Admin_Portal SHALL display each day's actual day-of-week label (e.g., "Mon", "Tue") derived from the calendar date, not a fixed 7-day cycle.
2. THE Admin_Portal SHALL display all days from day 1 to the last day of the selected month, with the correct day-of-week for each date.
3. WHEN an Admin sets up a Weekly_Template (7 consecutive days starting from day 1), THE Admin_Portal SHALL provide a "Apply Template to Month" action that copies the 7-day pattern to fill all remaining days of the month, cycling through the template.
4. WHEN the Admin applies a Weekly_Template, THE Backend SHALL upsert FoodMenu records for every day of the month, mapping each day to the correct template day using `(dayOfMonth - 1) % 7`.
5. WHEN an Admin applies a Weekly_Template to future months, THE Admin_Portal SHALL allow selecting a range of months (1 to 12) and THE Backend SHALL apply the template to each selected month.

---

### Requirement 7: Food Menu — Weekly Template Repetition

**User Story:** As an Admin, I want to define a 7-day meal template and repeat it across a month or multiple months, so that I don't have to enter the same meals repeatedly.

#### Acceptance Criteria

1. THE Admin_Portal SHALL provide a "Weekly Template" editor where an Admin can define meals for 7 days (Day 1 through Day 7), each with breakfast, lunch, snacks, and dinner items.
2. WHEN an Admin saves a Weekly_Template, THE Backend SHALL store the template linked to the branch.
3. WHEN an Admin applies a saved Weekly_Template to a month, THE Backend SHALL generate FoodMenu records for every day of that month by cycling through the 7-day template.
4. WHEN an Admin applies a Weekly_Template, THE Admin_Portal SHALL display a preview of the first 7 days before confirming.
5. THE Admin_Portal SHALL allow the Admin to apply the same Weekly_Template to multiple consecutive months in a single action.

---

### Requirement 8: Student Registration — Passport Photo as Profile Photo

**User Story:** As an Admin, I want to capture a passport photo during student registration that becomes the student's permanent profile photo, so that the photo is available on the web portal and ID card.

#### Acceptance Criteria

1. THE Admin_Portal SHALL include a "Passport Photo" upload field in the student registration form, marked as required.
2. WHEN an Admin uploads a passport photo, THE Admin_Portal SHALL display a preview of the image before form submission.
3. WHEN the registration form is submitted, THE Backend SHALL upload the photo to Supabase Storage and store the resulting URL in the Student record's `avatarUrl` field.
4. WHEN a Student views their profile in the Student_Portal, THE Student_Portal SHALL display the photo stored in `avatarUrl` as the profile photo.
5. IF no photo is uploaded during registration, THEN THE Backend SHALL reject the registration with a 422 error and THE Admin_Portal SHALL display the message "Passport photo is required."
6. THE Backend SHALL accept only JPEG, PNG, or WebP image files with a maximum size of 5 MB for the passport photo.

---

### Requirement 9: ID Card Redesign — Minimal and Tamper-Proof

**User Story:** As an Admin, I want the student ID card to show minimal details with a live fee status and a tamper-proof QR code, so that the card is both useful and secure.

#### Acceptance Criteria

1. THE Student_Portal SHALL render the ID_Card on the home page as an inline component, not as a downloadable PDF.
2. THE ID_Card SHALL display: hostel name/logo, student ID number, student name, branch (academic), room number, and Fee_Status.
3. WHEN the Student_Portal loads the ID_Card, THE Backend SHALL return the current Fee_Status computed from the Student's active invoices.
4. THE ID_Card SHALL include a QR_Code that encodes a signed JWT payload containing: student ID, name, room number, bed label, fee status, and expiry timestamp (24 hours from generation).
5. WHEN a QR_Code is scanned, THE Backend SHALL provide a public endpoint `/students/verify-qr` that validates the JWT signature and returns the Student's current details.
6. THE Student_Portal SHALL render the ID_Card using CSS-only styling so that the card layout cannot be altered by browser developer tools without breaking the JWT signature verification.
7. WHEN the Fee_Status changes (e.g., a payment is recorded), THE Backend SHALL invalidate the cached ID_Card data and THE Student_Portal SHALL reflect the updated Fee_Status within 60 seconds on next page load.
8. THE ID_Card SHALL display a "Valid until" timestamp showing when the QR_Code expires.

---

### Requirement 10: Revenue and Fee Payments — Bug Fixes

**User Story:** As an Admin, I want the revenue summary and fee payment recording to work correctly, so that financial data is accurate and payments can be processed without errors.

#### Acceptance Criteria

1. WHEN an Admin navigates to the Finance page, THE Admin_Portal SHALL display the correct values for "Total Collected", "This Month", "Pending", and "Overdue Count" fetched from `/finance/summary`.
2. WHEN the Backend processes a GET `/finance/summary` request, THE Backend SHALL return `totalCollected`, `thisMonthCollected`, `totalPending`, and `overdueCount` computed from the current state of all Invoice and Payment records.
3. WHEN an Admin records a payment via the Record Payment form, THE Backend SHALL update the Invoice `paidAmount`, recalculate `balance`, and set `status` to "paid" if `balance` equals zero.
4. WHEN a payment is recorded successfully, THE Admin_Portal SHALL display the payment receipt in a modal without requiring a page reload.
5. IF the payment amount exceeds the Invoice balance, THEN THE Backend SHALL return a 422 error and THE Admin_Portal SHALL display the message "Payment amount cannot exceed the invoice balance."
6. WHEN the Reports page loads the "Revenue" tab, THE Backend SHALL return payment records for the selected month and year with correct `totalCollected` and `totalDue` values.

---

### Requirement 11: Student Registration — Fee Payment with 3 Modes

**User Story:** As an Admin, I want to record the initial fee payment during student registration using one of three payment modes, so that the payment is captured immediately and a receipt is generated.

#### Acceptance Criteria

1. THE Admin_Portal student registration form SHALL include a "Fee Payment" section with three payment mode options: "Online" (Cashfree gateway), "Semi-Offline" (UPI/bank transfer with reference number), and "Cash".
2. WHEN an Admin selects "Online" payment mode, THE Admin_Portal SHALL initiate a Cashfree payment session and redirect to the payment gateway after student creation.
3. WHEN an Admin selects "Semi-Offline" payment mode, THE Admin_Portal SHALL display a transaction reference number input field marked as required.
4. WHEN an Admin selects "Cash" payment mode, THE Admin_Portal SHALL display a cash amount received input field.
5. WHEN the registration form is submitted with a valid payment, THE Backend SHALL create the Student record, generate an Invoice for the first period's fee, and record a Payment against that Invoice.
6. WHEN a Payment is recorded during registration, THE Backend SHALL generate a Receipt with a unique receipt number and THE Admin_Portal SHALL display the receipt in a modal after successful registration.
7. WHEN the receipt modal is displayed, THE Admin_Portal SHALL provide a "Download Receipt" button that fetches the PDF from `/finance/payments/{paymentId}/receipt`.
8. THE Admin_Portal SHALL display the receipt in the Student profile page under a "Receipts" section.

---

### Requirement 12: Finance, Reports, Activity, and WhatsApp Page Fixes

**User Story:** As an Admin, I want the Finance, Reports, Activity, and WhatsApp pages to load and function without errors, so that I can manage the hostel effectively.

#### Acceptance Criteria

1. WHEN an Admin navigates to the Finance page, THE Admin_Portal SHALL load invoice data without JavaScript runtime errors.
2. WHEN an Admin navigates to the Reports page, THE Admin_Portal SHALL load all six report tabs (Occupancy, Revenue, Defaulters, Stay Expiry, Complaints, Students) without errors.
3. WHEN an Admin navigates to the Activity page, THE Admin_Portal SHALL fetch and display activity logs from `/activity` with pagination.
4. WHEN an Admin navigates to the WhatsApp page, THE Admin_Portal SHALL display the connection status, send single messages, send bulk messages, and display logs without errors.
5. WHEN the Backend processes a GET `/activity` request, THE Backend SHALL return a paginated list of Activity_Log records ordered by `createdAt` descending.
6. WHEN the WhatsApp_Service is disconnected, THE Admin_Portal SHALL display a clear reconnection instruction and a "Refresh Status" button.
7. WHEN an Admin sends a bulk WhatsApp message, THE Backend SHALL rate-limit delivery to one message per 2 seconds and return the count of successfully sent messages.

---

### Requirement 13: Room Management — Floors and Villas

**User Story:** As an Admin, I want to organise rooms under either a Floor or a Villa, so that the room map accurately reflects the physical layout of the hostel property.

#### Acceptance Criteria

1. THE Admin_Portal room management page SHALL display Room_Groups as either "Floor" or "Villa" type, with a visual distinction between the two.
2. WHEN an Admin creates a new Room_Group, THE Admin_Portal SHALL allow selecting the type as "Floor" or "Villa" and entering a name.
3. WHEN an Admin creates a new Room, THE Admin_Portal SHALL allow assigning the Room to any Room_Group regardless of whether it is a Floor or Villa.
4. THE Backend SHALL store a `groupType` field ("floor" or "villa") on the Floor model (or a new RoomGroup model) to distinguish between the two types.
5. WHEN the Backend returns the floor map via GET `/rooms/floor-map`, THE Backend SHALL include the `groupType` field for each group so the Admin_Portal can render the correct label.
6. THE Admin_Portal room map SHALL display Villa groups with a distinct icon or colour compared to Floor groups.

---

### Requirement 14: Student Portal — Immediate Post-Payment Fee Details

**User Story:** As a Student, I want to see my payment details immediately after completing a payment, so that I have confirmation without navigating away.

#### Acceptance Criteria

1. WHEN a Student completes an online payment via the Cashfree gateway and is redirected to `/finance/payment-status`, THE Student_Portal SHALL fetch the updated Invoice and Payment records and display the payment result (success or failure) within 3 seconds.
2. WHEN a payment is successful, THE Student_Portal SHALL display: receipt number, amount paid, payment date, payment mode, and invoice number.
3. WHEN a payment fails, THE Student_Portal SHALL display the failure reason returned by the Cashfree gateway and a "Try Again" button.
4. WHEN the payment status page loads, THE Student_Portal SHALL invalidate the `my-invoices` query cache so the Finance page reflects the updated balance on next visit.
5. THE Student_Portal SHALL provide a "Download Receipt" link on the payment status page that fetches the PDF receipt from the Backend.

---

### Requirement 15: Student Portal — ID Card on Home Page

**User Story:** As a Student, I want to see my ID card directly on the home page with live details, so that I can access it instantly without downloading a PDF.

#### Acceptance Criteria

1. THE Student_Portal home page SHALL render the ID_Card as an inline card component below the room card.
2. THE ID_Card component SHALL display: hostel name, student ID, student name, academic branch, room number, bed label, and current Fee_Status.
3. WHEN the home page loads, THE Student_Portal SHALL fetch ID_Card data from a dedicated Backend endpoint `/portal/id-card` that returns all required fields including the signed QR_Code payload.
4. THE ID_Card SHALL render the QR_Code as an inline SVG or canvas element.
5. WHEN the Fee_Status is "overdue", THE ID_Card SHALL display the fee status in red text.
6. WHEN the Fee_Status is "paid", THE ID_Card SHALL display the fee status in green text.
7. THE Student_Portal SHALL NOT provide a "Download ID Card" button on the home page; the card is view-only inline.

---

### Requirement 16: Student Portal — Food Timetable Day/Month View

**User Story:** As a Student, I want to switch between a day-wise and month-wise view of the food timetable, so that I can see today's meals quickly or plan ahead for the month.

#### Acceptance Criteria

1. THE Student_Portal food page SHALL display a toggle switch with two options: "Today" and "Month".
2. WHEN the "Today" view is selected, THE Student_Portal SHALL display only the current day's meals (breakfast, lunch, snacks, dinner) with items and meal timings.
3. WHEN the "Month" view is selected, THE Student_Portal SHALL display a scrollable table of all days in the current month with their meal items.
4. WHEN the Student_Portal loads the food page, THE Student_Portal SHALL default to the "Today" view.
5. WHEN a day in the "Month" view has a special meal, THE Student_Portal SHALL display a "✨ Special" badge next to that day's entry.
6. WHEN a day in the "Month" view is a holiday, THE Student_Portal SHALL display a "🎉 Holiday" badge next to that day's entry.

---

### Requirement 17: Student Portal — Password Change via WhatsApp OTP

**User Story:** As a Student, I want to change my password using OTP verification sent to my registered mobile or my father's mobile via WhatsApp, so that I can securely update my credentials.

#### Acceptance Criteria

1. THE Student_Portal change-password page SHALL display an input field for the Student to enter a registered mobile number (student or father).
2. WHEN a Student submits a registered mobile number, THE Backend SHALL look up the Student record and verify that the mobile matches either `student.mobile` or `student.parent.mobile`.
3. IF the mobile number does not match either registered number, THEN THE Backend SHALL return a 400 error and THE Student_Portal SHALL display the message "Mobile number not registered."
4. WHEN the mobile is verified, THE Backend SHALL generate an OTP and send it via WhatsApp_Service to the provided mobile number.
5. WHEN the Student enters the correct OTP, THE Backend SHALL allow the Student to set a new password.
6. IF the OTP is incorrect or expired, THEN THE Backend SHALL return a 400 error and THE Student_Portal SHALL display the message "Invalid or expired OTP."
7. WHEN the password is changed successfully, THE Backend SHALL invalidate the Student's current session and THE Student_Portal SHALL redirect to the login page.
8. THE Backend SHALL expire OTPs after 5 minutes and allow a maximum of 3 verification attempts before blocking further attempts for 15 minutes.

---

### Requirement 18: Student Portal — Profile Photo Display

**User Story:** As a Student, I want to see the passport photo uploaded during my registration displayed as my profile photo, so that my identity is visually confirmed in the portal.

#### Acceptance Criteria

1. WHEN a Student views their profile page in the Student_Portal, THE Student_Portal SHALL display the photo stored in the Student's `avatarUrl` field as the profile photo.
2. WHEN the `avatarUrl` field is null or empty, THE Student_Portal SHALL display the Student's initials in a styled placeholder avatar.
3. THE Student_Portal home page top bar SHALL display the Student's profile photo as a small circular avatar.
4. WHEN the profile photo is displayed, THE Student_Portal SHALL load the image from the Supabase Storage URL stored in `avatarUrl`.
5. THE Student_Portal SHALL display the profile photo at a minimum resolution of 64×64 pixels on the profile page and 32×32 pixels in the top bar.

---

### Requirement 19: Activity Page — Full Implementation

**User Story:** As an Admin, I want the Activity page to display a complete, paginated log of all admin actions, so that I can audit changes to the system.

#### Acceptance Criteria

1. WHEN an Admin navigates to the Activity page, THE Admin_Portal SHALL fetch activity logs from GET `/activity` and display them in a paginated table.
2. THE activity log table SHALL display: timestamp, admin name, action type, entity type, entity ID, and IP address for each log entry.
3. THE Admin_Portal SHALL support filtering activity logs by action type and date range.
4. WHEN the Admin_Portal fetches activity logs, THE Backend SHALL return logs ordered by `createdAt` descending with a default page size of 50.
5. THE Backend SHALL record an Activity_Log entry for each of the following actions: student created, student updated, student deleted, student vacated, student renewed, payment recorded, invoice created, room created, room updated, notice published.

---

### Requirement 20: WhatsApp Page — Enhanced Features

**User Story:** As an Admin, I want the WhatsApp page to support targeted messaging and template management, so that I can communicate efficiently with students.

#### Acceptance Criteria

1. THE Admin_Portal WhatsApp page SHALL support sending messages to a filtered subset of students (e.g., by status, floor, or fee status) in addition to all active students.
2. WHEN an Admin selects a student filter and sends a bulk message, THE Backend SHALL send the message only to students matching the filter criteria.
3. THE Admin_Portal WhatsApp page SHALL display a "Templates" tab where an Admin can view and edit saved message templates stored in the branch Settings.
4. WHEN an Admin saves a message template, THE Backend SHALL update the `whatsappTemplates` JSON field in the Settings record for the branch.
5. THE Admin_Portal WhatsApp logs tab SHALL support filtering logs by status (sent, delivered, failed, queued) and by date range.
6. WHEN a WhatsApp message fails to deliver, THE Backend SHALL update the WhatsappLog record's `status` to "failed" and store the error message in `errorMessage`.

