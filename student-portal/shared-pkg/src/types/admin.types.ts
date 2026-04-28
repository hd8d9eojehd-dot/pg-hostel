import type { AdminRole } from '../constants/status.constants'

export interface Admin {
  id: string
  supabaseAuthId: string
  name: string
  email: string
  mobile: string
  role: AdminRole
  branchId?: string
  isActive: boolean
  lastLogin?: string
  createdAt: string
}
