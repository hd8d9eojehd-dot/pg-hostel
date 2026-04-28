export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  STAFF: 'staff',
  STUDENT: 'student',
  PARENT: 'parent',
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

export const ADMIN_ROLES: Role[] = ['super_admin', 'staff']
export const STUDENT_ROLES: Role[] = ['student', 'parent']
