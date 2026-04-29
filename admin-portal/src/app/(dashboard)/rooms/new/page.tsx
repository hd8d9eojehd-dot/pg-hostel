'use client'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateRoomSchema, type CreateRoomInput, ROOM_TYPE } from '@pg-hostel/shared'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { ArrowLeft, Loader2, BedDouble } from 'lucide-react'
import Link from 'next/link'

export default function NewRoomPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuthStore()

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<CreateRoomInput>({
    resolver: zodResolver(CreateRoomSchema),
    defaultValues: {
      branchId: user?.branchId ?? '',
      roomType: 'double',
      bedCount: 2,
      hasAttachedBath: false,
      isFurnished: true,
      hasWifi: true,
    },
  })

  const { data: floors } = useQuery({
    queryKey: ['floors', user?.branchId],
    queryFn: () => api.get('/rooms/floor-map', { params: { branchId: user?.branchId } }).then(r => r.data.data),
    enabled: !!user?.branchId,
  })

  const create = useMutation({
    mutationFn: (data: CreateRoomInput) => api.post('/rooms', data),
    onSuccess: () => {
      toast({ title: 'Room created successfully' })
      router.push('/rooms')
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    },
  })

  const roomType = watch('roomType')

  return (
    <div>
      <Header title="Add Room" />
      <div className="p-4 md:p-6 max-w-xl mx-auto">
        <Link href="/rooms">
          <Button variant="ghost" size="sm" className="gap-1.5 mb-4">
            <ArrowLeft className="w-4 h-4" /> Rooms
          </Button>
        </Link>

        <form onSubmit={handleSubmit(d => create.mutate(d))} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Room Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <input type="hidden" {...register('branchId')} value={user?.branchId ?? ''} />

              <div className="space-y-1.5">
                <Label>Floor <span className="text-destructive">*</span></Label>
                <select {...register('floorId')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="">Select floor...</option>
                  {(floors ?? []).map((f: { id: string; floorNumber: number; floorName?: string }) => (
                    <option key={f.id} value={f.id}>{f.floorName ?? `Floor ${f.floorNumber}`}</option>
                  ))}
                </select>
                {errors.floorId && <p className="text-xs text-destructive">{errors.floorId.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Room Number <span className="text-destructive">*</span></Label>
                  <Input {...register('roomNumber')} placeholder="101" className={errors.roomNumber ? 'border-destructive' : ''} />
                  {errors.roomNumber && <p className="text-xs text-destructive">{errors.roomNumber.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Room Type <span className="text-destructive">*</span></Label>
                  <select
                    {...register('roomType')}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    {ROOM_TYPE.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Bed Count <span className="text-destructive">*</span></Label>
                <Input type="number" min={1} max={6} {...register('bedCount', { valueAsNumber: true })} />
                {errors.bedCount && <p className="text-xs text-destructive">{errors.bedCount.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Monthly Rent (₹)</Label>
                  <Input type="number" {...register('monthlyRent', { valueAsNumber: true })} placeholder="8000" />
                </div>
                <div className="space-y-1.5">
                  <Label>Semester Rent (₹)</Label>
                  <Input type="number" {...register('semesterRent', { valueAsNumber: true })} placeholder="45000" />
                </div>
                <div className="space-y-1.5">
                  <Label>Annual Rent (₹)</Label>
                  <Input type="number" {...register('annualRent', { valueAsNumber: true })} placeholder="88000" />
                </div>
              </div>

              <div className="flex gap-6">
                {[
                  { name: 'hasAttachedBath' as const, label: 'Attached Bath' },
                  { name: 'isFurnished' as const, label: 'Furnished' },
                  { name: 'hasWifi' as const, label: 'WiFi' },
                ].map(({ name, label }) => (
                  <label key={name} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" {...register(name)} className="w-4 h-4 rounded" />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full gap-2" disabled={isSubmitting}>
            {isSubmitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
              : <><BedDouble className="w-4 h-4" /> Create Room</>
            }
          </Button>
        </form>
      </div>
    </div>
  )
}
