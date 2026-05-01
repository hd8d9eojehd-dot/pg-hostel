import { z } from 'zod';
export declare const CreateOutpassSchema: z.ZodEffects<z.ZodObject<{
    type: z.ZodEnum<["outpass", "leave", "sem_holiday"]>;
    fromDate: z.ZodString;
    toDate: z.ZodString;
    fromTime: z.ZodOptional<z.ZodString>;
    toTime: z.ZodOptional<z.ZodString>;
    reason: z.ZodString;
    destination: z.ZodString;
    contactAtDestination: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "outpass" | "leave" | "sem_holiday";
    reason: string;
    fromDate: string;
    toDate: string;
    destination: string;
    fromTime?: string | undefined;
    toTime?: string | undefined;
    contactAtDestination?: string | undefined;
}, {
    type: "outpass" | "leave" | "sem_holiday";
    reason: string;
    fromDate: string;
    toDate: string;
    destination: string;
    fromTime?: string | undefined;
    toTime?: string | undefined;
    contactAtDestination?: string | undefined;
}>, {
    type: "outpass" | "leave" | "sem_holiday";
    reason: string;
    fromDate: string;
    toDate: string;
    destination: string;
    fromTime?: string | undefined;
    toTime?: string | undefined;
    contactAtDestination?: string | undefined;
}, {
    type: "outpass" | "leave" | "sem_holiday";
    reason: string;
    fromDate: string;
    toDate: string;
    destination: string;
    fromTime?: string | undefined;
    toTime?: string | undefined;
    contactAtDestination?: string | undefined;
}>;
export type CreateOutpassInput = z.infer<typeof CreateOutpassSchema>;
export declare const ApproveOutpassSchema: z.ZodObject<{
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    note?: string | undefined;
}, {
    note?: string | undefined;
}>;
export type ApproveOutpassInput = z.infer<typeof ApproveOutpassSchema>;
export declare const RejectOutpassSchema: z.ZodObject<{
    note: z.ZodString;
}, "strip", z.ZodTypeAny, {
    note: string;
}, {
    note: string;
}>;
export type RejectOutpassInput = z.infer<typeof RejectOutpassSchema>;
//# sourceMappingURL=outpass.schema.d.ts.map