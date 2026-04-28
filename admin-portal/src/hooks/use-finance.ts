import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useToast } from './use-toast'

export function useFinanceSummary(branchId?: string) {
  return useQuery({
    queryKey: ['finance-summary', branchId],
    queryFn: () => api.get('/finance/summary', { params: { branchId } }).then(r => r.data.data),
  })
}

export function useInvoices(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['invoices', params],
    queryFn: () => api.get('/finance/invoices', { params }).then(r => r.data),
  })
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.get(`/finance/invoices/${id}`).then(r => r.data.data),
    enabled: !!id,
  })
}

export function useDefaulters(branchId?: string) {
  return useQuery({
    queryKey: ['defaulters', branchId],
    queryFn: () => api.get('/finance/defaulters', { params: { branchId } }).then(r => r.data.data),
  })
}

export function useRecordPayment() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/finance/payments', data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['finance-summary'] })
      toast({ title: `Payment recorded — ${res.data.data.receiptNumber}` })
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    },
  })
}
