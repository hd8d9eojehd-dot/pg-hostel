import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useToast } from './use-toast'

export function useComplaints(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['complaints', params],
    queryFn: () => api.get('/complaints', { params }).then(r => r.data),
  })
}

export function useComplaint(id: string) {
  return useQuery({
    queryKey: ['complaint', id],
    queryFn: () => api.get(`/complaints/${id}`).then(r => r.data.data),
    enabled: !!id,
  })
}

export function useUpdateComplaint() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/complaints/${id}`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['complaints'] })
      qc.invalidateQueries({ queryKey: ['complaint', id] })
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    },
  })
}

export function useAddComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      api.post(`/complaints/${id}/comments`, { comment }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['complaint', id] })
    },
  })
}
