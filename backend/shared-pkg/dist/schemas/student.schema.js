"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateStudentStatusSchema = exports.VacateStudentSchema = exports.ExtendStaySchema = exports.ShiftRoomSchema = exports.DeleteStudentSchema = exports.RenewStudentSchema = exports.UpdateStudentSchema = exports.CreateStudentSchema = void 0;
const zod_1 = require("zod");
const status_constants_1 = require("../constants/status.constants");
const indianMobile = zod_1.z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit Indian mobile number');
const aadhaarNumber = zod_1.z
    .string()
    .regex(/^\d{12}$/, 'Aadhaar must be 12 digits');
// Free-form stay duration: kept for backward compatibility but now optional
const stayDurationSchema = zod_1.z.string().regex(/^\d+(months?|years?)$/, 'Stay duration must be like 12months or 1year').optional();
exports.CreateStudentSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100).trim(),
    fatherName: zod_1.z.string().min(2).max(100).trim(),
    motherName: zod_1.z.string().min(2).max(100).trim().optional(),
    mobile: indianMobile,
    parentMobile: indianMobile.optional(),
    motherMobile: indianMobile.optional(),
    email: zod_1.z.string().email().optional(),
    aadhaar: aadhaarNumber.optional(),
    fatherAadhaar: aadhaarNumber.optional(),
    permanentAddress: zod_1.z.string().min(10).max(500).trim(),
    emergencyContact: indianMobile,
    emergencyContactName: zod_1.z.string().min(2).max(100).trim(),
    college: zod_1.z.string().min(3).max(150).trim(),
    course: zod_1.z.string().min(2).max(100).trim(),
    branch: zod_1.z.string().min(2).max(100).trim(),
    yearOfStudy: zod_1.z.number().int().min(1).max(6),
    semester: zod_1.z.number().int().min(1).max(12),
    totalSemesters: zod_1.z.number().int().min(1).max(16).default(8),
    joiningDate: zod_1.z.string().date(),
    stayDuration: stayDurationSchema, // optional — computed from semesters if not provided
    rentPackage: zod_1.z.enum(status_constants_1.RENT_PACKAGE),
    depositAmount: zod_1.z.number().min(0).max(999999),
    notes: zod_1.z.string().max(1000).optional(),
    roomId: zod_1.z.string().uuid(),
    bedId: zod_1.z.string().uuid(),
    avatarUrl: zod_1.z.string().url().optional(),
    initialPayment: zod_1.z.object({
        paymentMode: zod_1.z.enum(['online', 'semi_offline', 'cash']),
        transactionRef: zod_1.z.string().max(100).optional(),
        cashAmount: zod_1.z.number().positive().optional(),
        customAmount: zod_1.z.number().positive().optional(),
    }).optional(),
});
exports.UpdateStudentSchema = exports.CreateStudentSchema.partial().omit({
    roomId: true,
    bedId: true,
    initialPayment: true,
});
exports.RenewStudentSchema = zod_1.z.object({
    roomId: zod_1.z.string().uuid(),
    bedId: zod_1.z.string().uuid(),
    joiningDate: zod_1.z.string().date(),
    stayDuration: stayDurationSchema, // optional — computed from semesters
    rentPackage: zod_1.z.enum(status_constants_1.RENT_PACKAGE),
    depositAmount: zod_1.z.number().min(0).max(999999),
});
exports.DeleteStudentSchema = zod_1.z.object({
    confirmStudentId: zod_1.z.string().min(1),
});
exports.ShiftRoomSchema = zod_1.z.object({
    newRoomId: zod_1.z.string().uuid(),
    newBedId: zod_1.z.string().uuid(),
    reason: zod_1.z.string().min(5).max(500).trim(),
});
exports.ExtendStaySchema = zod_1.z.object({
    newEndDate: zod_1.z.string().date(),
    newPackage: zod_1.z.enum(status_constants_1.RENT_PACKAGE).optional(),
});
exports.VacateStudentSchema = zod_1.z.object({
    vacateDate: zod_1.z.string().date(),
    reason: zod_1.z.string().min(5).max(500).trim(),
    depositRefundAmount: zod_1.z.number().min(0).optional(),
    damageAmount: zod_1.z.number().min(0).optional(),
    inspectionNotes: zod_1.z.string().max(1000).optional(),
});
exports.UpdateStudentStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(status_constants_1.STUDENT_STATUS),
    reason: zod_1.z.string().max(500).optional(),
});
//# sourceMappingURL=student.schema.js.map