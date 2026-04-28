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
  duration: '3months' | '6months' | '1year'
): Date {
  const ist = toZonedTime(joinDate, TZ)
  if (duration === '3months') return addMonths(ist, 3)
  if (duration === '6months') return addMonths(ist, 6)
  return addYears(ist, 1)
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
