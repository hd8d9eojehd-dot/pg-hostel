import { z } from 'zod';
export declare const CreateComplaintSchema: z.ZodObject<{
    category: z.ZodEnum<["wifi", "fan", "light", "water", "cleaning", "food", "furniture", "plumbing", "pest", "noise", "other"]>;
    description: z.ZodString;
    priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "urgent"]>>;
    photoUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description: string;
    category: "other" | "wifi" | "fan" | "light" | "water" | "cleaning" | "food" | "furniture" | "plumbing" | "pest" | "noise";
    priority: "low" | "medium" | "high" | "urgent";
    photoUrl?: string | undefined;
}, {
    description: string;
    category: "other" | "wifi" | "fan" | "light" | "water" | "cleaning" | "food" | "furniture" | "plumbing" | "pest" | "noise";
    priority?: "low" | "medium" | "high" | "urgent" | undefined;
    photoUrl?: string | undefined;
}>;
export type CreateComplaintInput = z.infer<typeof CreateComplaintSchema>;
export declare const UpdateComplaintSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["new", "assigned", "in_progress", "resolved", "closed"]>>;
    assignedTo: z.ZodOptional<z.ZodString>;
    resolutionNote: z.ZodOptional<z.ZodString>;
    priority: z.ZodOptional<z.ZodEnum<["low", "medium", "high", "urgent"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "new" | "assigned" | "in_progress" | "resolved" | "closed" | undefined;
    priority?: "low" | "medium" | "high" | "urgent" | undefined;
    assignedTo?: string | undefined;
    resolutionNote?: string | undefined;
}, {
    status?: "new" | "assigned" | "in_progress" | "resolved" | "closed" | undefined;
    priority?: "low" | "medium" | "high" | "urgent" | undefined;
    assignedTo?: string | undefined;
    resolutionNote?: string | undefined;
}>;
export type UpdateComplaintInput = z.infer<typeof UpdateComplaintSchema>;
export declare const AddCommentSchema: z.ZodObject<{
    comment: z.ZodString;
}, "strip", z.ZodTypeAny, {
    comment: string;
}, {
    comment: string;
}>;
export type AddCommentInput = z.infer<typeof AddCommentSchema>;
//# sourceMappingURL=complaint.schema.d.ts.map