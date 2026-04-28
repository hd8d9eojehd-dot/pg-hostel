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

export const roomRouter = Router()

roomRouter.get('/stats', requireAdmin, getRoomStats)
roomRouter.get('/floor-map', requireAdmin, getFloorMap)
roomRouter.post('/floors', requireAdmin, validate(CreateFloorSchema), createFloor)
roomRouter.patch('/floors/:id', requireAdmin, updateFloor)
roomRouter.delete('/floors/:id', requireAdmin, deleteFloor)
roomRouter.get('/', requireAdmin, getRooms)
roomRouter.post('/', requireAdmin, validate(CreateRoomSchema), createRoom)
roomRouter.get('/:id', requireAdmin, getRoomById)
roomRouter.patch('/:id', requireAdmin, validate(UpdateRoomSchema), updateRoom)
roomRouter.delete('/:id', requireAdmin, deleteRoom)
roomRouter.post('/:id/beds', requireAdmin, addBed)
roomRouter.delete('/:id/beds/:bedId', requireAdmin, deleteBed)
