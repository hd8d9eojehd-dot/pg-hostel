"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateFloorSchema = exports.UpdateRoomStatusSchema = exports.UpdateRoomSchema = exports.CreateRoomSchema = void 0;
const zod_1 = require("zod");
const status_constants_1 = require("../constants/status.constants");
exports.CreateRoomSchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid(),
    floorId: zod_1.z.string().uuid(),
    roomNumber: zod_1.z.string().min(1).max(20).trim(),
    roomType: zod_1.z.enum(status_constants_1.ROOM_TYPE),
    bedCount: zod_1.z.number().int().min(1).max(6),
    hasAttachedBath: zod_1.z.boolean().default(false),
    isFurnished: zod_1.z.boolean().default(true),
    hasWifi: zod_1.z.boolean().default(true),
    monthlyRent: zod_1.z.number().positive().optional(),
    semesterRent: zod_1.z.number().positive().optional(),
    annualRent: zod_1.z.number().positive().optional(),
    notes: zod_1.z.string().max(500).optional(),
});
exports.UpdateRoomSchema = exports.CreateRoomSchema.partial().omit({ branchId: true, floorId: true });
exports.UpdateRoomStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(status_constants_1.ROOM_STATUS),
    notes: zod_1.z.string().max(500).optional(),
});
exports.CreateFloorSchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid(),
    floorNumber: zod_1.z.number().int().min(0).max(50),
    floorName: zod_1.z.string().max(50).optional(),
    groupType: zod_1.z.enum(['floor', 'villa']).default('floor'),
});
//# sourceMappingURL=room.schema.js.map