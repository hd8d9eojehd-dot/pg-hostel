import type { RoomStatus, RoomType, BedLabel } from '../constants/status.constants'

export interface Bed {
  id: string
  roomId: string
  bedLabel: BedLabel
  isOccupied: boolean
}

export interface Room {
  id: string
  branchId: string
  floorId: string
  roomNumber: string
  roomType: RoomType
  bedCount: number
  hasAttachedBath: boolean
  isFurnished: boolean
  hasWifi: boolean
  monthlyRent?: number
  semesterRent?: number
  annualRent?: number
  status: RoomStatus
  notes?: string
  beds?: Bed[]
  createdAt: string
  updatedAt: string
}

export interface Floor {
  id: string
  branchId: string
  floorNumber: number
  floorName?: string
  rooms?: Room[]
}
