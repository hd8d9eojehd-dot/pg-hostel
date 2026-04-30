import { Request, Response, NextFunction } from 'express'
import * as roomService from '../services/room.service'
import type { CreateRoomInput, UpdateRoomInput, CreateFloorInput } from '@pg-hostel/shared'
import { prisma } from '../config/prisma'
import { ApiError } from '../middleware/error.middleware'

export async function createFloor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const floor = await roomService.createFloor(req.body as CreateFloorInput)
    res.status(201).json({ success: true, data: floor })
  } catch (err) {
    next(err)
  }
}

export async function updateFloor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string }
    const { floorName, floorNumber } = req.body as { floorName?: string; floorNumber?: number }
    const floor = await prisma.floor.update({
      where: { id },
      data: { ...(floorName !== undefined && { floorName }), ...(floorNumber !== undefined && { floorNumber }) },
      include: { rooms: { select: { id: true, status: true } } },
    })
    res.json({ success: true, data: floor })
  } catch (err) { next(err) }
}

export async function deleteFloor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string }
    // Check for active students in any room on this floor
    const activeStudents = await prisma.student.count({
      where: { room: { floorId: id }, status: 'active' },
    })
    if (activeStudents > 0) throw new ApiError(400, `Cannot delete floor with ${activeStudents} active student(s). Vacate or shift them first.`)
    // Get all rooms on this floor
    const rooms = await prisma.room.findMany({ where: { floorId: id }, select: { id: true } })
    const roomIds = rooms.map(r => r.id)
    // Delete in correct order
    if (roomIds.length > 0) {
      await prisma.roomHistory.deleteMany({ where: { OR: [{ toRoomId: { in: roomIds } }, { fromRoomId: { in: roomIds } }] } }).catch(() => {})
      await prisma.bed.deleteMany({ where: { roomId: { in: roomIds } } })
      await prisma.room.deleteMany({ where: { id: { in: roomIds } } })
    }
    await prisma.floor.delete({ where: { id } })
    const { invalidateCache } = await import('../middleware/cache.middleware')
    await invalidateCache('cache:rooms:*').catch(() => {})
    res.json({ success: true, message: 'Floor and all rooms deleted' })
  } catch (err) { next(err) }
}

export async function deleteRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string }
    const room = await prisma.room.findUnique({ where: { id }, include: { students: { where: { status: 'active' } } } })
    if (!room) throw new ApiError(404, 'Room not found')
    if (room.students.length > 0) throw new ApiError(400, 'Cannot delete room with active students. Vacate or shift students first.')
    // Delete in correct order to avoid FK constraint errors
    await prisma.roomHistory.deleteMany({ where: { OR: [{ toRoomId: id }, { fromRoomId: id }] } }).catch(() => {})
    await prisma.bed.deleteMany({ where: { roomId: id } })
    await prisma.room.delete({ where: { id } })
    // Invalidate room caches
    const { invalidateCache } = await import('../middleware/cache.middleware')
    await invalidateCache('cache:rooms:*').catch(() => {})
    res.json({ success: true, message: 'Room deleted' })
  } catch (err) { next(err) }
}

export async function addBed(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string }
    const { bedLabel } = req.body as { bedLabel: string }
    const bed = await prisma.bed.create({ data: { roomId: id, bedLabel, isOccupied: false } })
    // Update room bedCount
    const count = await prisma.bed.count({ where: { roomId: id } })
    await prisma.room.update({ where: { id }, data: { bedCount: count } })
    res.status(201).json({ success: true, data: bed })
  } catch (err) { next(err) }
}

export async function deleteBed(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id, bedId } = req.params as { id: string; bedId: string }
    const bed = await prisma.bed.findUnique({ where: { id: bedId } })
    if (!bed) throw new ApiError(404, 'Bed not found')
    if (bed.isOccupied) throw new ApiError(400, 'Cannot delete an occupied bed')
    await prisma.bed.delete({ where: { id: bedId } })
    const count = await prisma.bed.count({ where: { roomId: id } })
    await prisma.room.update({ where: { id }, data: { bedCount: count } })
    res.json({ success: true, message: 'Bed deleted' })
  } catch (err) { next(err) }
}

export async function createRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const room = await roomService.createRoom(req.body as CreateRoomInput)
    res.status(201).json({ success: true, data: room })
  } catch (err) {
    next(err)
  }
}

export async function getRooms(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rooms = await roomService.getRooms(req.query as Record<string, string>)
    res.json({ success: true, data: rooms })
  } catch (err) {
    next(err)
  }
}

export async function getRoomById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const room = await roomService.getRoomById(req.params['id']!)
    res.json({ success: true, data: room })
  } catch (err) {
    next(err)
  }
}

export async function updateRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const room = await roomService.updateRoom(req.params['id']!, req.body as UpdateRoomInput)
    res.json({ success: true, data: room })
  } catch (err) {
    next(err)
  }
}

export async function getFloorMap(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const branchId = req.query['branchId'] as string
    const floors = await roomService.getFloorMap(branchId)
    res.json({ success: true, data: floors })
  } catch (err) {
    next(err)
  }
}

export async function getRoomStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const branchId = req.query['branchId'] as string
    const stats = await roomService.getRoomStats(branchId)
    res.json({ success: true, data: stats })
  } catch (err) {
    next(err)
  }
}
