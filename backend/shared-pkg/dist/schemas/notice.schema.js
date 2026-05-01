"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateNoticeSchema = exports.CreateNoticeSchema = void 0;
const zod_1 = require("zod");
const status_constants_1 = require("../constants/status.constants");
exports.CreateNoticeSchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid().optional(),
    title: zod_1.z.string().min(3).max(200).trim(),
    description: zod_1.z.string().min(10).max(5000).trim(),
    category: zod_1.z.enum(status_constants_1.NOTICE_CATEGORY),
    priority: zod_1.z.enum(status_constants_1.NOTICE_PRIORITY).default('medium'),
    expiryDate: zod_1.z.string().date().optional(),
});
exports.UpdateNoticeSchema = exports.CreateNoticeSchema.partial();
//# sourceMappingURL=notice.schema.js.map