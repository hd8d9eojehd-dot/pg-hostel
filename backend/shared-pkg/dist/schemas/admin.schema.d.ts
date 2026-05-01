import { z } from 'zod';
export declare const CreateAdminSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    mobile: z.ZodString;
    role: z.ZodEnum<["super_admin", "staff"]>;
    branchId: z.ZodOptional<z.ZodString>;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    mobile: string;
    email: string;
    role: "super_admin" | "staff";
    password: string;
    branchId?: string | undefined;
}, {
    name: string;
    mobile: string;
    email: string;
    role: "super_admin" | "staff";
    password: string;
    branchId?: string | undefined;
}>;
export type CreateAdminInput = z.infer<typeof CreateAdminSchema>;
export declare const UpdateAdminSchema: z.ZodObject<Omit<{
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    mobile: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<["super_admin", "staff"]>>;
    branchId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    password: z.ZodOptional<z.ZodString>;
}, "password">, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    mobile?: string | undefined;
    email?: string | undefined;
    role?: "super_admin" | "staff" | undefined;
    branchId?: string | undefined;
}, {
    name?: string | undefined;
    mobile?: string | undefined;
    email?: string | undefined;
    role?: "super_admin" | "staff" | undefined;
    branchId?: string | undefined;
}>;
export type UpdateAdminInput = z.infer<typeof UpdateAdminSchema>;
//# sourceMappingURL=admin.schema.d.ts.map