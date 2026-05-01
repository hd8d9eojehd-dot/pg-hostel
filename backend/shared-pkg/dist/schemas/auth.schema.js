"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerifyOtpSchema = exports.SendOtpSchema = exports.ChangePasswordSchema = exports.StudentLoginSchema = exports.AdminLoginSchema = void 0;
const zod_1 = require("zod");
exports.AdminLoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
exports.StudentLoginSchema = zod_1.z.object({
    studentId: zod_1.z.string().regex(/^PG-\d{4}-\d{4}$/, 'Invalid Student ID format'),
    password: zod_1.z.string().min(6),
});
exports.ChangePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(6),
    newPassword: zod_1.z
        .string()
        .min(8)
        .regex(/[A-Z]/, 'Must contain uppercase')
        .regex(/[0-9]/, 'Must contain number')
        .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
    confirmPassword: zod_1.z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});
exports.SendOtpSchema = zod_1.z.object({
    mobile: zod_1.z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile'),
    purpose: zod_1.z.enum(['login', 'reset', 'verify']),
});
exports.VerifyOtpSchema = zod_1.z.object({
    mobile: zod_1.z.string().regex(/^[6-9]\d{9}$/),
    otp: zod_1.z.string().length(6).regex(/^\d+$/),
    purpose: zod_1.z.enum(['login', 'reset', 'verify']),
});
//# sourceMappingURL=auth.schema.js.map