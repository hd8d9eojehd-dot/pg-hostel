import { z } from 'zod';
export declare const UpsertFoodMenuSchema: z.ZodObject<{
    branchId: z.ZodString;
    month: z.ZodNumber;
    year: z.ZodNumber;
    dayOfMonth: z.ZodNumber;
    mealType: z.ZodEnum<["breakfast", "lunch", "snacks", "dinner"]>;
    items: z.ZodString;
    isSpecial: z.ZodDefault<z.ZodBoolean>;
    specialLabel: z.ZodOptional<z.ZodString>;
    specialNote: z.ZodOptional<z.ZodString>;
    isHoliday: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    branchId: string;
    month: number;
    year: number;
    dayOfMonth: number;
    mealType: "breakfast" | "lunch" | "snacks" | "dinner";
    items: string;
    isSpecial: boolean;
    isHoliday: boolean;
    specialLabel?: string | undefined;
    specialNote?: string | undefined;
}, {
    branchId: string;
    month: number;
    year: number;
    dayOfMonth: number;
    mealType: "breakfast" | "lunch" | "snacks" | "dinner";
    items: string;
    isSpecial?: boolean | undefined;
    specialLabel?: string | undefined;
    specialNote?: string | undefined;
    isHoliday?: boolean | undefined;
}>;
export type UpsertFoodMenuInput = z.infer<typeof UpsertFoodMenuSchema>;
export declare const UpdateMealTimingsSchema: z.ZodObject<{
    branchId: z.ZodString;
    breakfastStart: z.ZodString;
    breakfastEnd: z.ZodString;
    lunchStart: z.ZodString;
    lunchEnd: z.ZodString;
    snacksStart: z.ZodOptional<z.ZodString>;
    snacksEnd: z.ZodOptional<z.ZodString>;
    dinnerStart: z.ZodString;
    dinnerEnd: z.ZodString;
}, "strip", z.ZodTypeAny, {
    branchId: string;
    breakfastStart: string;
    breakfastEnd: string;
    lunchStart: string;
    lunchEnd: string;
    dinnerStart: string;
    dinnerEnd: string;
    snacksStart?: string | undefined;
    snacksEnd?: string | undefined;
}, {
    branchId: string;
    breakfastStart: string;
    breakfastEnd: string;
    lunchStart: string;
    lunchEnd: string;
    dinnerStart: string;
    dinnerEnd: string;
    snacksStart?: string | undefined;
    snacksEnd?: string | undefined;
}>;
export type UpdateMealTimingsInput = z.infer<typeof UpdateMealTimingsSchema>;
export declare const WeeklyTemplateSchema: z.ZodObject<{
    branchId: z.ZodString;
    days: z.ZodArray<z.ZodObject<{
        breakfast: z.ZodDefault<z.ZodString>;
        lunch: z.ZodDefault<z.ZodString>;
        snacks: z.ZodDefault<z.ZodString>;
        dinner: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        breakfast: string;
        lunch: string;
        snacks: string;
        dinner: string;
    }, {
        breakfast?: string | undefined;
        lunch?: string | undefined;
        snacks?: string | undefined;
        dinner?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    branchId: string;
    days: {
        breakfast: string;
        lunch: string;
        snacks: string;
        dinner: string;
    }[];
}, {
    branchId: string;
    days: {
        breakfast?: string | undefined;
        lunch?: string | undefined;
        snacks?: string | undefined;
        dinner?: string | undefined;
    }[];
}>;
export type WeeklyTemplateInput = z.infer<typeof WeeklyTemplateSchema>;
export declare const ApplyTemplateSchema: z.ZodObject<{
    branchId: z.ZodString;
    days: z.ZodArray<z.ZodObject<{
        breakfast: z.ZodDefault<z.ZodString>;
        lunch: z.ZodDefault<z.ZodString>;
        snacks: z.ZodDefault<z.ZodString>;
        dinner: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        breakfast: string;
        lunch: string;
        snacks: string;
        dinner: string;
    }, {
        breakfast?: string | undefined;
        lunch?: string | undefined;
        snacks?: string | undefined;
        dinner?: string | undefined;
    }>, "many">;
    targetMonths: z.ZodArray<z.ZodObject<{
        month: z.ZodNumber;
        year: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        month: number;
        year: number;
    }, {
        month: number;
        year: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    branchId: string;
    days: {
        breakfast: string;
        lunch: string;
        snacks: string;
        dinner: string;
    }[];
    targetMonths: {
        month: number;
        year: number;
    }[];
}, {
    branchId: string;
    days: {
        breakfast?: string | undefined;
        lunch?: string | undefined;
        snacks?: string | undefined;
        dinner?: string | undefined;
    }[];
    targetMonths: {
        month: number;
        year: number;
    }[];
}>;
export type ApplyTemplateInput = z.infer<typeof ApplyTemplateSchema>;
//# sourceMappingURL=food.schema.d.ts.map