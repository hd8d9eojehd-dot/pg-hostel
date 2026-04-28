import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useToast } from './use-toast'

export function useStudents(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['students', params],
    queryFn: () => api.get('/students', { params }).then(r => r.data),
  })
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: ['student', id],
    queryFn: () => api.get(`/students/${id}`).then(r => r.data.data),
    enabled: !!id,
  })
}

export function useStudentStats() {
  return useQuery({
    queryKey: ['student-stats'],
    queryFn: () => api.get('/students/stats').then(r => r.data.data),
  })
}

export function useVacateStudent() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.post(`/students/${id}/vacate`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['student', id] })
      toast({ title: 'Student vacated successfully' })
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    },
  })
}
