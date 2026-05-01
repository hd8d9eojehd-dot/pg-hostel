import { z } from 'zod';
export declare const SubmitFeedbackSchema: z.ZodObject<{
    month: z.ZodNumber;
    year: z.ZodNumber;
    foodRating: z.ZodOptional<z.ZodNumber>;
    cleanlinessRating: z.ZodOptional<z.ZodNumber>;
    wifiRating: z.ZodOptional<z.ZodNumber>;
    staffRating: z.ZodOptional<z.ZodNumber>;
    overallRating: z.ZodOptional<z.ZodNumber>;
    comment: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    month: number;
    year: number;
    comment?: string | undefined;
    foodRating?: number | undefined;
    cleanlinessRating?: number | undefined;
    wifiRating?: number | undefined;
    staffRating?: number | undefined;
    overallRating?: number | undefined;
}, {
    month: number;
    year: number;
    comment?: string | undefined;
    foodRating?: number | undefined;
    cleanlinessRating?: number | undefined;
    wifiRating?: number | undefined;
    staffRating?: number | undefined;
    overallRating?: number | undefined;
}>;
export type SubmitFeedbackInput = z.infer<typeof SubmitFeedbackSchema>;
//# sourceMappingURL=feedback.schema.d.ts.map