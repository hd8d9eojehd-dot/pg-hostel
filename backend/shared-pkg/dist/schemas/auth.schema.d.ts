import { z } from 'zod';
export declare const AdminLoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type AdminLoginInput = z.infer<typeof AdminLoginSchema>;
export declare const StudentLoginSchema: z.ZodObject<{
    studentId: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
    studentId: string;
}, {
    password: string;
    studentId: string;
}>;
export type StudentLoginInput = z.infer<typeof StudentLoginSchema>;
export declare const ChangePasswordSchema: z.ZodEffects<z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
    confirmPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}, {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}>, {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}, {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export declare const SendOtpSchema: z.ZodObject<{
    mobile: z.ZodString;
    purpose: z.ZodEnum<["login", "reset", "verify"]>;
}, "strip", z.ZodTypeAny, {
    mobile: string;
    purpose: "login" | "reset" | "verify";
}, {
    mobile: string;
    purpose: "login" | "reset" | "verify";
}>;
export type SendOtpInput = z.infer<typeof SendOtpSchema>;
export declare const VerifyOtpSchema: z.ZodObject<{
    mobile: z.ZodString;
    otp: z.ZodString;
    purpose: z.ZodEnum<["login", "reset", "verify"]>;
}, "strip", z.ZodTypeAny, {
    mobile: string;
    purpose: "login" | "reset" | "verify";
    otp: string;
}, {
    mobile: string;
    purpose: "login" | "reset" | "verify";
    otp: string;
}>;
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;
//# sourceMappingURL=auth.schema.d.ts.map