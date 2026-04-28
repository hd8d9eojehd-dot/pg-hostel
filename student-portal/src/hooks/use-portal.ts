import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useToast } from './use-toast'

// ─── Profile ─────────────────────────────────────────────────
export function useMyProfile() {
  return useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/portal/profile').then(r => r.data.data),
  })
}

// ─── Invoices ────────────────────────────────────────────────
export function useMyInvoices() {
  return useQuery({
    queryKey: ['my-invoices'],
    queryFn: () => api.get('/portal/invoices').then(r => r.data.data),
  })
}

// ─── Complaints ──────────────────────────────────────────────
export function useMyComplaints() {
  return useQuery({
    queryKey: ['my-complaints'],
    queryFn: () => api.get('/portal/complaints').then(r => r.data.data),
  })
}

export function useSubmitComplaint() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/complaints', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-complaints'] })
      toast({ title: 'Complaint submitted!' })
    },
    onError: () => toast({ title: 'Failed to submit', variant: 'destructive' }),
  })
}

export function useAddComplaintComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      api.post(`/complaints/${id}/comments`, { comment }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-complaints'] }),
  })
}

// ─── Outpass ─────────────────────────────────────────────────
export function useMyOutpasses() {
  return useQuery({
    queryKey: ['my-outpasses'],
    queryFn: () => api.get('/portal/outpasses').then(r => r.data.data),
  })
}

export function useSubmitOutpass() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/outpass', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-outpasses'] })
      toast({ title: 'Outpass request submitted!' })
    },
    onError: () => toast({ title: 'Failed to submit', variant: 'destructive' }),
  })
}

// ─── Notices ─────────────────────────────────────────────────
export function usePublishedNotices() {
  return useQuery({
    queryKey: ['notices-public'],
    queryFn: () => api.get('/portal/notices').then(r => r.data.data),
  })
}

// ─── Food ────────────────────────────────────────────────────
export function useMyFood() {
  return useQuery({
    queryKey: ['my-food'],
    queryFn: () => api.get('/portal/food').then(r => r.data.data),
  })
}

// ─── Feedback ────────────────────────────────────────────────
export function useMyFeedback() {
  return useQuery({
    queryKey: ['my-feedback'],
    queryFn: () => api.get('/feedback/my').then(r => r.data.data),
  })
}

export function useSubmitFeedback() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/feedback', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-feedback'] })
      toast({ title: 'Feedback submitted! Thank you 🙏' })
    },
    onError: () => toast({ title: 'Failed to submit feedback', variant: 'destructive' }),
  })
}

// ─── Payment ─────────────────────────────────────────────────
export function useInitiatePayment() {
  const { toast } = useToast()
  return useMutation({
    mutationFn: ({ invoiceId, returnUrl }: { invoiceId: string; returnUrl: string }) =>
      api.post('/payment/initiate', { invoiceId, returnUrl }),
    onError: () => toast({ title: 'Payment initiation failed', variant: 'destructive' }),
  })
}
