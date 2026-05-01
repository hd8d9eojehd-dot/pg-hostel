"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddCommentSchema = exports.UpdateComplaintSchema = exports.CreateComplaintSchema = void 0;
const zod_1 = require("zod");
const status_constants_1 = require("../constants/status.constants");
exports.CreateComplaintSchema = zod_1.z.object({
    category: zod_1.z.enum(status_constants_1.COMPLAINT_CATEGORY),
    description: zod_1.z.string().min(10).max(1000).trim(),
    priority: zod_1.z.enum(status_constants_1.COMPLAINT_PRIORITY).default('medium'),
    photoUrl: zod_1.z.string().url().optional(),
});
exports.UpdateComplaintSchema = zod_1.z.object({
    status: zod_1.z.enum(status_constants_1.COMPLAINT_STATUS).optional(),
    assignedTo: zod_1.z.string().uuid().optional(),
    resolutionNote: zod_1.z.string().max(500).optional(),
    priority: zod_1.z.enum(status_constants_1.COMPLAINT_PRIORITY).optional(),
});
exports.AddCommentSchema = zod_1.z.object({
    comment: zod_1.z.string().min(2).max(500).trim(),
});
//# sourceMappingURL=complaint.schema.js.map