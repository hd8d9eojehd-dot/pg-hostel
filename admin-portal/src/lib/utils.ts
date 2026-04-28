import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(new Date(date))
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    reserved: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    vacated: 'bg-gray-100 text-gray-800',
    suspended: 'bg-red-100 text-red-800',
    available: 'bg-green-100 text-green-800',
    occupied: 'bg-red-100 text-red-800',
    partial: 'bg-yellow-100 text-yellow-800',
    maintenance: 'bg-orange-100 text-orange-800',
    paid: 'bg-green-100 text-green-800',
    due: 'bg-yellow-100 text-yellow-800',
    overdue: 'bg-red-100 text-red-800',
    waived: 'bg-gray-100 text-gray-800',
    new: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    returned: 'bg-gray-100 text-gray-800',
  }
  return map[status] ?? 'bg-gray-100 text-gray-800'
}
