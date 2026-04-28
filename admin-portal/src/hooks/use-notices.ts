import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useToast } from './use-toast'

export function useNotices(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['notices', params],
    queryFn: () => api.get('/notices', { params }).then(r => r.data),
  })
}

export function usePublishNotice() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (id: string) => api.post(`/notices/${id}/publish`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notices'] })
      toast({ title: 'Notice published' })
    },
  })
}

export function useSendNoticeWhatsApp() {
  const { toast } = useToast()
  return useMutation({
    mutationFn: (id: string) => api.post(`/notices/${id}/whatsapp`),
    onSuccess: (res) => {
      toast({ title: `Sent to ${res.data.data?.sent ?? 0} students` })
    },
    onError: () => toast({ title: 'WhatsApp send failed', variant: 'destructive' }),
  })
}

export function useDeleteNotice() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/notices/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notices'] })
      toast({ title: 'Notice deleted' })
    },
  })
}
