"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateAdminSchema = exports.CreateAdminSchema = void 0;
const zod_1 = require("zod");
const status_constants_1 = require("../constants/status.constants");
exports.CreateAdminSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100).trim(),
    email: zod_1.z.string().email(),
    mobile: zod_1.z.string().regex(/^[6-9]\d{9}$/),
    role: zod_1.z.enum(status_constants_1.ADMIN_ROLE),
    branchId: zod_1.z.string().uuid().optional(),
    password: zod_1.z.string().min(8),
});
exports.UpdateAdminSchema = exports.CreateAdminSchema.partial().omit({ password: true });
//# sourceMappingURL=admin.schema.js.map