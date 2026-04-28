import { prisma } from '../config/prisma'
import { ApiError } from '../middleware/error.middleware'
import type { CreateRoomInput, UpdateRoomInput, CreateFloorInput } from '@pg-hostel/shared'
import { BED_LABEL } from '@pg-hostel/shared'

export async function createFloor(input: CreateFloorInput) {
  const existing = await prisma.floor.findUnique({
    where: { branchId_floorNumber: { branchId: input.branchId, floorNumber: input.floorNumber } },
  })
  if (existing) throw new ApiError(409, 'Floor/Villa already exists with this number')

  return prisma.floor.create({
    data: {
      branchId: input.branchId,
      floorNumber: input.floorNumber,
      floorName: input.floorName,
      groupType: (input as { groupType?: string }).groupType ?? 'floor',
    },
  })
}

export async function createRoom(input: CreateRoomInput) {
  const existing = await prisma.room.findUnique({
    where: { branchId_roomNumber: { branchId: input.branchId, roomNumber: input.roomNumber } },
  })
  if (existing) throw new ApiError(409, 'Room number already exists in this branch')

  const room = await prisma.$transaction(async (tx) => {
    const r = await tx.room.create({
      data: {
        branchId: input.branchId,
        floorId: input.floorId,
        roomNumber: input.roomNumber,
        roomType: input.roomType,
        bedCount: input.bedCount,
        hasAttachedBath: input.hasAttachedBath ?? false,
        isFurnished: input.isFurnished ?? true,
        hasWifi: input.hasWifi ?? true,
        monthlyRent: input.monthlyRent,
        semesterRent: input.semesterRent,
        annualRent: input.annualRent,
        notes: input.notes,
        status: 'available',
      },
    })

    // Auto-create beds
    const labels = BED_LABEL.slice(0, input.bedCount)
    await tx.bed.createMany({
      data: labels.map(label => ({ roomId: r.id, bedLabel: label, isOccupied: false })),
    })

    return r
  })

  return prisma.room.findUnique({
    where: { id: room.id },
    include: { beds: true, floor: true },
  })
}

export async function getRooms(query: {
  branchId?: string; floorId?: string; status?: string; roomType?: string
}) {
  const where: Record<string, unknown> = {}
  if (query.branchId) where['branchId'] = query.branchId
  if (query.floorId) where['floorId'] = query.floorId
  if (query.status) where['status'] = query.status
  if (query.roomType) where['roomType'] = query.roomType

  return prisma.room.findMany({
    where,
    include: {
      beds: {
        include: {
          student: { select: { id: true, name: true, studentId: true, status: true } },
        },
      },
      floor: true,
    },
    orderBy: [{ floor: { floorNumber: 'asc' } }, { roomNumber: 'asc' }],
  })
}

export async function getFloorMap(branchId: string) {
  return prisma.floor.findMany({
    where: { branchId },
    include: {
      rooms: {
        include: {
          beds: {
            include: {
              student: { select: { id: true, name: true, studentId: true } },
            },
          },
        },
        orderBy: { roomNumber: 'asc' },
      },
    },
    orderBy: { floorNumber: 'asc' },
  })
}

export async function updateRoom(id: string, input: UpdateRoomInput) {
  const room = await prisma.room.findUnique({ where: { id } })
  if (!room) throw new ApiError(404, 'Room not found')
  return prisma.room.update({ where: { id }, data: { ...input, updatedAt: new Date() } })
}

export async function getRoomById(id: string) {
  const room = await prisma.room.findUnique({
    where: { id },
    include: {
      beds: {
        include: {
          student: { select: { id: true, name: true, studentId: true, status: true } },
        },
      },
      floor: true,
      branch: true,
    },
  })
  if (!room) throw new ApiError(404, 'Room not found')
  return room
}

export async function getRoomStats(branchId: string) {
  const rooms = await prisma.room.findMany({ where: { branchId } })
  const total = rooms.length
  const available = rooms.filter(r => r.status === 'available').length
  const occupied = rooms.filter(r => r.status === 'occupied').length
  const partial = rooms.filter(r => r.status === 'partial').length
  const maintenance = rooms.filter(r => r.status === 'maintenance').length

  const beds = await prisma.bed.count({ where: { room: { branchId } } })
  const occupiedBeds = await prisma.bed.count({ where: { room: { branchId }, isOccupied: true } })

  return { total, available, occupied, partial, maintenance, beds, occupiedBeds, vacantBeds: beds - occupiedBeds }
}
