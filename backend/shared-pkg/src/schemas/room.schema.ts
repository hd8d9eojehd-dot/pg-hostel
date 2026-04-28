import { z } from 'zod'
import { ROOM_TYPE, ROOM_STATUS } from '../constants/status.constants'

export const CreateRoomSchema = z.object({
  branchId: z.string().uuid(),
  floorId: z.string().uuid(),
  roomNumber: z.string().min(1).max(20).trim(),
  roomType: z.enum(ROOM_TYPE),
  bedCount: z.number().int().min(1).max(6),
  hasAttachedBath: z.boolean().default(false),
  isFurnished: z.boolean().default(true),
  hasWifi: z.boolean().default(true),
  monthlyRent: z.number().positive().optional(),
  semesterRent: z.number().positive().optional(),
  annualRent: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
})
export type CreateRoomInput = z.infer<typeof CreateRoomSchema>

export const UpdateRoomSchema = CreateRoomSchema.partial().omit({ branchId: true, floorId: true })
export type UpdateRoomInput = z.infer<typeof UpdateRoomSchema>

export const UpdateRoomStatusSchema = z.object({
  status: z.enum(ROOM_STATUS),
  notes: z.string().max(500).optional(),
})
export type UpdateRoomStatusInput = z.infer<typeof UpdateRoomStatusSchema>

export const CreateFloorSchema = z.object({
  branchId: z.string().uuid(),
  floorNumber: z.number().int().min(0).max(50),
  floorName: z.string().max(50).optional(),
  groupType: z.enum(['floor', 'villa']).default('floor'),
})
export type CreateFloorInput = z.infer<typeof CreateFloorSchema>
