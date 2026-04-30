import { toZonedTime, fromZonedTime, format } from 'date-fns-tz'
import { addDays, addMonths, addYears, startOfDay } from 'date-fns'

const TZ = 'Asia/Kolkata'

export function nowIST(): Date {
  return toZonedTime(new Date(), TZ)
}

export function todayIST(): Date {
  return startOfDay(toZonedTime(new Date(), TZ))
}

export function formatIST(date: Date, fmt = 'dd MMM yyyy'): string {
  return format(toZonedTime(date, TZ), fmt, { timeZone: TZ })
}

export function formatISTDateTime(date: Date): string {
  return format(toZonedTime(date, TZ), 'dd MMM yyyy, hh:mm a', { timeZone: TZ })
}

export function toUTC(istDate: Date): Date {
  return fromZonedTime(istDate, TZ)
}

export function stayEndDate(
  joinDate: Date,
  duration: string
): Date {
  const ist = toZonedTime(joinDate, TZ)

  // Handle legacy fixed values
  if (duration === '3months') return addMonths(ist, 3)
  if (duration === '6months') return addMonths(ist, 6)
  if (duration === '1year') return addYears(ist, 1)

  // Handle free-form: e.g. "12months", "18months", "2years"
  const monthsMatch = duration.match(/^(\d+)months?$/)
  if (monthsMatch) return addMonths(ist, parseInt(monthsMatch[1], 10))

  const yearsMatch = duration.match(/^(\d+)years?$/)
  if (yearsMatch) return addYears(ist, parseInt(yearsMatch[1], 10))

  // Default fallback: 12 months
  return addMonths(ist, 12)
}

/**
 * Calculate stay end date based on rent package.
 * - semester: each semester = 6 months, stay = remaining sems × 6 months
 * - monthly: stay = explicit months (joiningDate + months)
 * - annual: stay = explicit years (joiningDate + years)
 */
export function stayEndDateFromSemesters(
  joinDate: Date,
  currentSem: number,
  totalSems: number
): Date {
  const ist = toZonedTime(joinDate, TZ)
  // Remaining semesters including current = totalSems - currentSem + 1
  const remainingSems = Math.max(1, totalSems - currentSem + 1)
  // Each semester = 6 months
  return addMonths(ist, remainingSems * 6)
}

/**
 * Calculate stay end date for monthly package.
 * stayMonths = number of months the student will stay
 */
export function stayEndDateMonthly(joinDate: Date, stayMonths: number): Date {
  const ist = toZonedTime(joinDate, TZ)
  return addMonths(ist, Math.max(1, stayMonths))
}

/**
 * Calculate stay end date for annual package.
 * stayYears = number of years the student will stay
 */
export function stayEndDateAnnual(joinDate: Date, stayYears: number): Date {
  const ist = toZonedTime(joinDate, TZ)
  return addYears(ist, Math.max(1, stayYears))
}

export function isDueSoon(dueDate: Date, days: number): boolean {
  const today = todayIST()
  const target = addDays(today, days)
  const due = startOfDay(toZonedTime(dueDate, TZ))
  return due.getTime() === target.getTime()
}

export function isDueToday(dueDate: Date): boolean {
  const today = todayIST()
  const due = startOfDay(toZonedTime(dueDate, TZ))
  return due.getTime() === today.getTime()
}

export function isOverdue(dueDate: Date): boolean {
  return startOfDay(toZonedTime(dueDate, TZ)) < todayIST()
}
