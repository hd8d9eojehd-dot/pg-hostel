import { Router } from 'express'
import { requireAdmin } from '../middleware/role.middleware'
import { validate } from '../middleware/validate.middleware'
import { CreateRoomSchema, UpdateRoomSchema, CreateFloorSchema } from '@pg-hostel/shared'
import {
  createFloor, updateFloor, deleteFloor,
  createRoom, getRooms, getRoomById,
  updateRoom, deleteRoom, addBed, deleteBed,
  getFloorMap, getRoomStats,
} from '../controllers/room.controller'
// PERF FIX: Cache room data — changes infrequently
import { cacheResponse } from '../middleware/cache.middleware'

export const roomRouter = Router()

// PERF FIX: Cache room stats for 60s — used on rooms page header
roomRouter.get('/stats', requireAdmin, cacheResponse(60, () => 'cache:rooms:stats'), getRoomStats)
// PERF FIX: Cache floor map for 60s — full room layout, expensive query
roomRouter.get('/floor-map', requireAdmin, cacheResponse(60, () => 'cache:rooms:floor-map'), getFloorMap)
roomRouter.post('/floors', requireAdmin, validate(CreateFloorSchema), createFloor)
roomRouter.patch('/floors/:id', requireAdmin, updateFloor)
roomRouter.delete('/floors/:id', requireAdmin, deleteFloor)
// PERF FIX: Cache room list for 60s — used in student admission dropdowns
roomRouter.get('/', requireAdmin, cacheResponse(60, req => `cache:rooms:list:${req.query['status'] ?? 'all'}`), getRooms)
roomRouter.post('/', requireAdmin, validate(CreateRoomSchema), createRoom)
// PERF FIX: Cache individual room for 60s
roomRouter.get('/:id', requireAdmin, cacheResponse(60, req => `cache:rooms:${req.params['id']}`), getRoomById)
roomRouter.patch('/:id', requireAdmin, validate(UpdateRoomSchema), updateRoom)
roomRouter.delete('/:id', requireAdmin, deleteRoom)
roomRouter.post('/:id/beds', requireAdmin, addBed)
roomRouter.delete('/:id/beds/:bedId', requireAdmin, deleteBed)
