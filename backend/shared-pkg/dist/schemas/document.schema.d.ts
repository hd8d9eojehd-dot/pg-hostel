import { z } from 'zod';
export declare const UploadDocumentSchema: z.ZodObject<{
    studentId: z.ZodString;
    type: z.ZodEnum<["aadhaar", "college_id", "agreement", "photo", "payment_proof", "other"]>;
    label: z.ZodOptional<z.ZodString>;
    fileUrl: z.ZodString;
    fileName: z.ZodOptional<z.ZodString>;
    fileSize: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "other" | "aadhaar" | "college_id" | "agreement" | "photo" | "payment_proof";
    studentId: string;
    fileUrl: string;
    label?: string | undefined;
    fileName?: string | undefined;
    fileSize?: number | undefined;
}, {
    type: "other" | "aadhaar" | "college_id" | "agreement" | "photo" | "payment_proof";
    studentId: string;
    fileUrl: string;
    label?: string | undefined;
    fileName?: string | undefined;
    fileSize?: number | undefined;
}>;
export type UploadDocumentInput = z.infer<typeof UploadDocumentSchema>;
export declare const VerifyDocumentSchema: z.ZodObject<{
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    note?: string | undefined;
}, {
    note?: string | undefined;
}>;
export type VerifyDocumentInput = z.infer<typeof VerifyDocumentSchema>;
export declare const RejectDocumentSchema: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export type RejectDocumentInput = z.infer<typeof RejectDocumentSchema>;
export declare const GetUploadUrlSchema: z.ZodObject<{
    studentId: z.ZodString;
    type: z.ZodEnum<["aadhaar", "college_id", "agreement", "photo", "payment_proof", "other"]>;
    fileName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "other" | "aadhaar" | "college_id" | "agreement" | "photo" | "payment_proof";
    studentId: string;
    fileName: string;
}, {
    type: "other" | "aadhaar" | "college_id" | "agreement" | "photo" | "payment_proof";
    studentId: string;
    fileName: string;
}>;
export type GetUploadUrlInput = z.infer<typeof GetUploadUrlSchema>;
//# sourceMappingURL=document.schema.d.ts.map