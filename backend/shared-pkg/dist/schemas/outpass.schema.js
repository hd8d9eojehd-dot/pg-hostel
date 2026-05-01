"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RejectOutpassSchema = exports.ApproveOutpassSchema = exports.CreateOutpassSchema = void 0;
const zod_1 = require("zod");
const status_constants_1 = require("../constants/status.constants");
exports.CreateOutpassSchema = zod_1.z.object({
    type: zod_1.z.enum(status_constants_1.OUTPASS_TYPE),
    fromDate: zod_1.z.string().date(),
    toDate: zod_1.z.string().date(),
    fromTime: zod_1.z.string().regex(/^\d{2}:\d{2}$/).optional(),
    toTime: zod_1.z.string().regex(/^\d{2}:\d{2}$/).optional(),
    reason: zod_1.z.string().min(5).max(500).trim(),
    destination: zod_1.z.string().min(3).max(200).trim(),
    contactAtDestination: zod_1.z
        .string()
        .regex(/^[6-9]\d{9}$/, 'Invalid mobile')
        .optional(),
}).refine(d => new Date(d.toDate) >= new Date(d.fromDate), {
    message: 'To date must be after from date',
    path: ['toDate'],
});
exports.ApproveOutpassSchema = zod_1.z.object({
    note: zod_1.z.string().max(500).optional(),
});
exports.RejectOutpassSchema = zod_1.z.object({
    note: zod_1.z.string().min(5).max(500).trim(),
});
//# sourceMappingURL=outpass.schema.js.map