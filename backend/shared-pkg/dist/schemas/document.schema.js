"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetUploadUrlSchema = exports.RejectDocumentSchema = exports.VerifyDocumentSchema = exports.UploadDocumentSchema = void 0;
const zod_1 = require("zod");
const status_constants_1 = require("../constants/status.constants");
exports.UploadDocumentSchema = zod_1.z.object({
    studentId: zod_1.z.string().uuid(),
    type: zod_1.z.enum(status_constants_1.DOC_TYPE),
    label: zod_1.z.string().max(100).optional(),
    fileUrl: zod_1.z.string().url(),
    fileName: zod_1.z.string().max(200).optional(),
    fileSize: zod_1.z.number().int().positive().optional(),
});
exports.VerifyDocumentSchema = zod_1.z.object({
    note: zod_1.z.string().max(500).optional(),
});
exports.RejectDocumentSchema = zod_1.z.object({
    reason: zod_1.z.string().min(5).max(500).trim(),
});
exports.GetUploadUrlSchema = zod_1.z.object({
    studentId: zod_1.z.string().uuid(),
    type: zod_1.z.enum(status_constants_1.DOC_TYPE),
    fileName: zod_1.z.string().min(1).max(200),
});
//# sourceMappingURL=document.schema.js.map