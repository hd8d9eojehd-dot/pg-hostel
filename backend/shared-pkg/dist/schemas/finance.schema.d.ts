import { z } from 'zod';
export declare const CreateInvoiceSchema: z.ZodObject<{
    studentId: z.ZodString;
    type: z.ZodEnum<["rent", "deposit", "extra", "damage", "fine", "other"]>;
    description: z.ZodString;
    amount: z.ZodNumber;
    discount: z.ZodDefault<z.ZodNumber>;
    lateFee: z.ZodDefault<z.ZodNumber>;
    dueDate: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "rent" | "deposit" | "extra" | "damage" | "fine" | "other";
    studentId: string;
    description: string;
    amount: number;
    discount: number;
    lateFee: number;
    dueDate: string;
    notes?: string | undefined;
}, {
    type: "rent" | "deposit" | "extra" | "damage" | "fine" | "other";
    studentId: string;
    description: string;
    amount: number;
    dueDate: string;
    notes?: string | undefined;
    discount?: number | undefined;
    lateFee?: number | undefined;
}>;
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export declare const RecordPaymentSchema: z.ZodObject<{
    invoiceId: z.ZodString;
    studentId: z.ZodString;
    amount: z.ZodNumber;
    paymentMode: z.ZodEnum<["cash", "bank_transfer", "upi", "online", "cheque"]>;
    transactionRef: z.ZodOptional<z.ZodString>;
    paidDate: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    paymentMode: "cash" | "bank_transfer" | "upi" | "online" | "cheque";
    studentId: string;
    amount: number;
    invoiceId: string;
    paidDate: string;
    notes?: string | undefined;
    transactionRef?: string | undefined;
}, {
    paymentMode: "cash" | "bank_transfer" | "upi" | "online" | "cheque";
    studentId: string;
    amount: number;
    invoiceId: string;
    paidDate: string;
    notes?: string | undefined;
    transactionRef?: string | undefined;
}>;
export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;
export declare const WaiveInvoiceSchema: z.ZodObject<{
    reason: z.ZodString;
    waiveAmount: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    reason: string;
    waiveAmount?: number | undefined;
}, {
    reason: string;
    waiveAmount?: number | undefined;
}>;
export type WaiveInvoiceInput = z.infer<typeof WaiveInvoiceSchema>;
export declare const UpdateInvoiceSchema: z.ZodObject<{
    description: z.ZodOptional<z.ZodString>;
    amount: z.ZodOptional<z.ZodNumber>;
    discount: z.ZodOptional<z.ZodNumber>;
    lateFee: z.ZodOptional<z.ZodNumber>;
    dueDate: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    notes?: string | undefined;
    description?: string | undefined;
    amount?: number | undefined;
    discount?: number | undefined;
    lateFee?: number | undefined;
    dueDate?: string | undefined;
}, {
    notes?: string | undefined;
    description?: string | undefined;
    amount?: number | undefined;
    discount?: number | undefined;
    lateFee?: number | undefined;
    dueDate?: string | undefined;
}>;
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>;
//# sourceMappingURL=finance.schema.d.ts.map