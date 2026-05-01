"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplyTemplateSchema = exports.WeeklyTemplateSchema = exports.UpdateMealTimingsSchema = exports.UpsertFoodMenuSchema = void 0;
const zod_1 = require("zod");
const status_constants_1 = require("../constants/status.constants");
const timeRegex = /^\d{2}:\d{2}$/;
exports.UpsertFoodMenuSchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid(),
    month: zod_1.z.number().int().min(1).max(12),
    year: zod_1.z.number().int().min(2020).max(2100),
    dayOfMonth: zod_1.z.number().int().min(1).max(31),
    mealType: zod_1.z.enum(status_constants_1.MEAL_TYPE),
    items: zod_1.z.string().min(1).max(1000).trim(),
    isSpecial: zod_1.z.boolean().default(false),
    specialLabel: zod_1.z.string().max(100).optional(),
    specialNote: zod_1.z.string().max(500).optional(),
    isHoliday: zod_1.z.boolean().default(false),
});
exports.UpdateMealTimingsSchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid(),
    breakfastStart: zod_1.z.string().regex(timeRegex),
    breakfastEnd: zod_1.z.string().regex(timeRegex),
    lunchStart: zod_1.z.string().regex(timeRegex),
    lunchEnd: zod_1.z.string().regex(timeRegex),
    snacksStart: zod_1.z.string().regex(timeRegex).optional(),
    snacksEnd: zod_1.z.string().regex(timeRegex).optional(),
    dinnerStart: zod_1.z.string().regex(timeRegex),
    dinnerEnd: zod_1.z.string().regex(timeRegex),
});
// 7-day meal template — one entry per day (index 0 = Day 1 ... index 6 = Day 7)
const DayMealsSchema = zod_1.z.object({
    breakfast: zod_1.z.string().max(500).default(''),
    lunch: zod_1.z.string().max(500).default(''),
    snacks: zod_1.z.string().max(500).default(''),
    dinner: zod_1.z.string().max(500).default(''),
});
exports.WeeklyTemplateSchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid(),
    days: zod_1.z.array(DayMealsSchema).length(7),
});
exports.ApplyTemplateSchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid(),
    days: zod_1.z.array(DayMealsSchema).length(7),
    targetMonths: zod_1.z.array(zod_1.z.object({
        month: zod_1.z.number().int().min(1).max(12),
        year: zod_1.z.number().int().min(2020).max(2100),
    })).min(1),
});
//# sourceMappingURL=food.schema.js.map