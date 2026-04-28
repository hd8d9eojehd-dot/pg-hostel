import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useToast } from './use-toast'

export function useRooms(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['rooms', params],
    queryFn: () => api.get('/rooms', { params }).then(r => r.data.data),
  })
}

export function useFloorMap(branchId?: string) {
  return useQuery({
    queryKey: ['floor-map', branchId],
    queryFn: () => api.get('/rooms/floor-map', { params: { branchId } }).then(r => r.data.data),
    enabled: !!branchId,
  })
}

export function useRoomStats(branchId?: string) {
  return useQuery({
    queryKey: ['room-stats', branchId],
    queryFn: () => api.get('/rooms/stats', { params: { branchId } }).then(r => r.data.data),
  })
}

export function useCreateRoom() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/rooms', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] })
      qc.invalidateQueries({ queryKey: ['floor-map'] })
      qc.invalidateQueries({ queryKey: ['room-stats'] })
      toast({ title: 'Room created successfully' })
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    },
  })
}
