import { z } from 'zod';
export declare const CreateNoticeSchema: z.ZodObject<{
    branchId: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    description: z.ZodString;
    category: z.ZodEnum<["general", "rent", "food", "maintenance", "rules", "emergency", "event"]>;
    priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "urgent"]>>;
    expiryDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description: string;
    category: "maintenance" | "rent" | "food" | "general" | "rules" | "emergency" | "event";
    priority: "low" | "medium" | "high" | "urgent";
    title: string;
    branchId?: string | undefined;
    expiryDate?: string | undefined;
}, {
    description: string;
    category: "maintenance" | "rent" | "food" | "general" | "rules" | "emergency" | "event";
    title: string;
    branchId?: string | undefined;
    priority?: "low" | "medium" | "high" | "urgent" | undefined;
    expiryDate?: string | undefined;
}>;
export type CreateNoticeInput = z.infer<typeof CreateNoticeSchema>;
export declare const UpdateNoticeSchema: z.ZodObject<{
    branchId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodEnum<["general", "rent", "food", "maintenance", "rules", "emergency", "event"]>>;
    priority: z.ZodOptional<z.ZodDefault<z.ZodEnum<["low", "medium", "high", "urgent"]>>>;
    expiryDate: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    branchId?: string | undefined;
    description?: string | undefined;
    category?: "maintenance" | "rent" | "food" | "general" | "rules" | "emergency" | "event" | undefined;
    priority?: "low" | "medium" | "high" | "urgent" | undefined;
    title?: string | undefined;
    expiryDate?: string | undefined;
}, {
    branchId?: string | undefined;
    description?: string | undefined;
    category?: "maintenance" | "rent" | "food" | "general" | "rules" | "emergency" | "event" | undefined;
    priority?: "low" | "medium" | "high" | "urgent" | undefined;
    title?: string | undefined;
    expiryDate?: string | undefined;
}>;
export type UpdateNoticeInput = z.infer<typeof UpdateNoticeSchema>;
//# sourceMappingURL=notice.schema.d.ts.map