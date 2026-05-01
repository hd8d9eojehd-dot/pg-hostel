"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubmitFeedbackSchema = void 0;
const zod_1 = require("zod");
const rating = zod_1.z.number().int().min(1).max(5).optional();
exports.SubmitFeedbackSchema = zod_1.z.object({
    month: zod_1.z.number().int().min(1).max(12),
    year: zod_1.z.number().int().min(2020).max(2100),
    foodRating: rating,
    cleanlinessRating: rating,
    wifiRating: rating,
    staffRating: rating,
    overallRating: rating,
    comment: zod_1.z.string().max(1000).optional(),
});
//# sourceMappingURL=feedback.schema.js.map