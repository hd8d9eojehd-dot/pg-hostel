export const STUDENT_STATUS = ['active', 'reserved', 'pending', 'vacated', 'suspended'] as const
export type StudentStatus = typeof STUDENT_STATUS[number]

export const ROOM_STATUS = ['available', 'occupied', 'partial', 'maintenance', 'blocked'] as const
export type RoomStatus = typeof ROOM_STATUS[number]

export const ROOM_TYPE = ['single', 'double', 'triple', 'quad'] as const
export type RoomType = typeof ROOM_TYPE[number]

export const BED_LABEL = ['A', 'B', 'C', 'D', 'E', 'F'] as const
export type BedLabel = typeof BED_LABEL[number]

export const RENT_PACKAGE = ['monthly', 'semester', 'annual'] as const
export type RentPackage = typeof RENT_PACKAGE[number]

export const STAY_DURATION = ['3months', '6months', '1year'] as const
export type StayDuration = typeof STAY_DURATION[number]

export const INVOICE_STATUS = ['paid', 'partial', 'due', 'overdue', 'waived'] as const
export type InvoiceStatus = typeof INVOICE_STATUS[number]

export const INVOICE_TYPE = ['rent', 'deposit', 'extra', 'damage', 'fine', 'other'] as const
export type InvoiceType = typeof INVOICE_TYPE[number]

export const PAYMENT_MODE = ['cash', 'bank_transfer', 'upi', 'online', 'cheque'] as const
export type PaymentMode = typeof PAYMENT_MODE[number]

export const COMPLAINT_CATEGORY = ['wifi', 'fan', 'light', 'water', 'cleaning', 'food', 'furniture', 'plumbing', 'pest', 'noise', 'other'] as const
export type ComplaintCategory = typeof COMPLAINT_CATEGORY[number]

export const COMPLAINT_STATUS = ['new', 'assigned', 'in_progress', 'resolved', 'closed'] as const
export type ComplaintStatus = typeof COMPLAINT_STATUS[number]

export const COMPLAINT_PRIORITY = ['low', 'medium', 'high', 'urgent'] as const
export type ComplaintPriority = typeof COMPLAINT_PRIORITY[number]

export const NOTICE_CATEGORY = ['general', 'rent', 'food', 'maintenance', 'rules', 'emergency', 'event'] as const
export type NoticeCategory = typeof NOTICE_CATEGORY[number]

export const NOTICE_PRIORITY = ['low', 'medium', 'high', 'urgent'] as const
export type NoticePriority = typeof NOTICE_PRIORITY[number]

export const OUTPASS_TYPE = ['outpass', 'leave', 'sem_holiday'] as const
export type OutpassType = typeof OUTPASS_TYPE[number]

export const OUTPASS_STATUS = ['pending', 'approved', 'rejected', 'returned', 'cancelled'] as const
export type OutpassStatus = typeof OUTPASS_STATUS[number]

export const DOC_TYPE = ['aadhaar', 'college_id', 'agreement', 'photo', 'payment_proof', 'other'] as const
export type DocType = typeof DOC_TYPE[number]

export const ADMIN_ROLE = ['super_admin', 'staff'] as const
export type AdminRole = typeof ADMIN_ROLE[number]

export const MEAL_TYPE = ['breakfast', 'lunch', 'snacks', 'dinner'] as const
export type MealType = typeof MEAL_TYPE[number]
