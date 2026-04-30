import { z } from 'zod'
import { STUDENT_STATUS, RENT_PACKAGE } from '../constants/status.constants'

const indianMobile = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit Indian mobile number')

const aadhaarNumber = z
  .string()
  .regex(/^\d{12}$/, 'Aadhaar must be 12 digits')

// Free-form stay duration: kept for backward compatibility but now optional
const stayDurationSchema = z.string().regex(/^\d+(months?|years?)$/, 'Stay duration must be like 12months or 1year').optional()

export const CreateStudentSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  fatherName: z.string().min(2).max(100).trim(),
  motherName: z.string().min(2).max(100).trim().optional(),
  mobile: indianMobile,
  parentMobile: indianMobile.optional(),
  motherMobile: indianMobile.optional(),
  email: z.string().email().optional(),
  aadhaar: aadhaarNumber.optional(),
  fatherAadhaar: aadhaarNumber.optional(),
  permanentAddress: z.string().min(10).max(500).trim(),
  emergencyContact: indianMobile,
  emergencyContactName: z.string().min(2).max(100).trim(),
  college: z.string().min(3).max(150).trim(),
  course: z.string().min(2).max(100).trim(),
  branch: z.string().min(2).max(100).trim(),
  yearOfStudy: z.number().int().min(1).max(6),
  semester: z.number().int().min(1).max(12),
  totalSemesters: z.number().int().min(1).max(16).default(8),
  joiningDate: z.string().date(),
  stayDuration: stayDurationSchema,  // optional — computed from semesters if not provided
  rentPackage: z.enum(RENT_PACKAGE),
  depositAmount: z.number().min(0).max(999999),
  notes: z.string().max(1000).optional(),
  roomId: z.string().uuid(),
  bedId: z.string().uuid(),
  avatarUrl: z.string().url().optional(),
  initialPayment: z.object({
    paymentMode: z.enum(['online', 'semi_offline', 'cash']),
    transactionRef: z.string().max(100).optional(),
    cashAmount: z.number().positive().optional(),
    customAmount: z.number().positive().optional(),
  }).optional(),
})
export type CreateStudentInput = z.infer<typeof CreateStudentSchema>

export const UpdateStudentSchema = CreateStudentSchema.partial().omit({
  roomId: true,
  bedId: true,
  initialPayment: true,
})
export type UpdateStudentInput = z.infer<typeof UpdateStudentSchema>

export const RenewStudentSchema = z.object({
  roomId: z.string().uuid(),
  bedId: z.string().uuid(),
  joiningDate: z.string().date(),
  stayDuration: stayDurationSchema,  // optional — computed from semesters
  rentPackage: z.enum(RENT_PACKAGE),
  depositAmount: z.number().min(0).max(999999),
})
export type RenewStudentInput = z.infer<typeof RenewStudentSchema>

export const DeleteStudentSchema = z.object({
  confirmStudentId: z.string().min(1),
})
export type DeleteStudentInput = z.infer<typeof DeleteStudentSchema>

export const ShiftRoomSchema = z.object({
  newRoomId: z.string().uuid(),
  newBedId: z.string().uuid(),
  reason: z.string().min(5).max(500).trim(),
})
export type ShiftRoomInput = z.infer<typeof ShiftRoomSchema>

export const ExtendStaySchema = z.object({
  newEndDate: z.string().date(),
  newPackage: z.enum(RENT_PACKAGE).optional(),
})
export type ExtendStayInput = z.infer<typeof ExtendStaySchema>

export const VacateStudentSchema = z.object({
  vacateDate: z.string().date(),
  reason: z.string().min(5).max(500).trim(),
  depositRefundAmount: z.number().min(0).optional(),
  damageAmount: z.number().min(0).optional(),
  inspectionNotes: z.string().max(1000).optional(),
})
export type VacateStudentInput = z.infer<typeof VacateStudentSchema>

export const UpdateStudentStatusSchema = z.object({
  status: z.enum(STUDENT_STATUS),
  reason: z.string().max(500).optional(),
})
export type UpdateStudentStatusInput = z.infer<typeof UpdateStudentStatusSchema>
