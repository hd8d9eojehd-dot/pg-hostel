import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useToast } from './use-toast'

export function useOutpasses(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['outpasses', params],
    queryFn: () => api.get('/outpass', { params }).then(r => r.data),
  })
}

export function useOutpass(id: string) {
  return useQuery({
    queryKey: ['outpass', id],
    queryFn: () => api.get(`/outpass/${id}`).then(r => r.data.data),
    enabled: !!id,
  })
}

export function useApproveOutpass() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      api.post(`/outpass/${id}/approve`, { note }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['outpasses'] })
      qc.invalidateQueries({ queryKey: ['outpass', id] })
      toast({ title: 'Outpass approved' })
    },
  })
}

export function useRejectOutpass() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      api.post(`/outpass/${id}/reject`, { note }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['outpasses'] })
      qc.invalidateQueries({ queryKey: ['outpass', id] })
      toast({ title: 'Outpass rejected' })
    },
  })
}

export function useConfirmReturn() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (id: string) => api.post(`/outpass/${id}/return`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['outpasses'] })
      qc.invalidateQueries({ queryKey: ['outpass', id] })
      toast({ title: 'Return confirmed' })
    },
  })
}
