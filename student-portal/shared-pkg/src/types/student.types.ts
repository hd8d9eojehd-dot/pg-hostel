import type { StudentStatus, RentPackage, StayDuration } from '../constants/status.constants'

export interface Student {
  id: string
  studentId: string
  name: string
  fatherName?: string
  mobile: string
  parentMobile?: string
  email?: string
  aadhaar?: string
  college?: string
  course?: string
  branch?: string
  yearOfStudy?: number
  semester?: number
  permanentAddress?: string
  emergencyContact?: string
  emergencyContactName?: string
  joiningDate: string
  stayDuration: StayDuration
  stayEndDate: string
  roomId?: string
  bedId?: string
  rentPackage: RentPackage
  depositAmount: number
  depositRefunded: boolean
  status: StudentStatus
  isFirstLogin: boolean
  avatarUrl?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface StudentWithRoom extends Student {
  room?: {
    id: string
    roomNumber: string
    roomType: string
    floor: { floorNumber: number; floorName?: string }
  }
  bed?: { id: string; bedLabel: string }
}
