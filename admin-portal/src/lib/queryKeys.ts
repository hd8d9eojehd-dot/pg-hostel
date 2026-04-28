// Centralized query key factory — prevents cache key typos
export const QK = {
  dashboard: ['dashboard'] as const,
  occupancy: ['occupancy'] as const,

  students: (params?: Record<string, unknown>) => params ? ['students', params] : ['students'],
  student: (id: string) => ['student', id] as const,

  rooms: (params?: Record<string, unknown>) => params ? ['rooms', params] : ['rooms'],
  room: (id: string) => ['room', id] as const,
  floorMap: (branchId?: string) => ['floor-map', branchId] as const,
  roomStats: (branchId?: string) => ['room-stats', branchId] as const,

  invoices: (params?: Record<string, unknown>) => params ? ['invoices', params] : ['invoices'],
  invoice: (id: string) => ['invoice', id] as const,
  financeSummary: (branchId?: string) => ['finance-summary', branchId] as const,
  defaulters: (branchId?: string) => ['defaulters', branchId] as const,

  complaints: (params?: Record<string, unknown>) => params ? ['complaints', params] : ['complaints'],
  complaint: (id: string) => ['complaint', id] as const,

  notices: (params?: Record<string, unknown>) => params ? ['notices', params] : ['notices'],

  outpasses: (params?: Record<string, unknown>) => params ? ['outpasses', params] : ['outpasses'],
  outpass: (id: string) => ['outpass', id] as const,

  foodMenu: (branchId: string, month: number, year: number) => ['food-menu', branchId, month, year] as const,
  mealTimings: (branchId?: string) => ['meal-timings', branchId] as const,

  feedbackSummary: (month: number, year: number) => ['feedback-summary', month, year] as const,

  waStatus: ['wa-status'] as const,
  waLogs: ['wa-logs'] as const,

  settings: (branchId?: string) => ['settings', branchId] as const,
  admins: ['admins'] as const,

  report: (type: string, params?: Record<string, unknown>) => ['report', type, params] as const,
} as const
