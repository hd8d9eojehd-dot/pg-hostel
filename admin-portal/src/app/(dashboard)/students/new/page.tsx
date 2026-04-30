'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateStudentSchema, type CreateStudentInput, RENT_PACKAGE } from '@pg-hostel/shared'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { ArrowLeft, Loader2, UserPlus, Camera, Copy, Eye, EyeOff, CheckCircle2, IndianRupee } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

const DEPOSIT_AMOUNT = 5000

function calcFeePerSem(rentPackage: string, room: { monthlyRent?: number; semesterRent?: number; annualRent?: number } | null): number {
  if (!room) return 0
  if (rentPackage === 'semester') return Number(room.semesterRent ?? 0)
  if (rentPackage === 'monthly') return Number(room.monthlyRent ?? 0)
  if (rentPackage === 'annual') return Number(room.annualRent ?? 0)
  return 0
}

export default function NewStudentPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [skipPayment, setSkipPayment] = useState(false)
  const [customAmount, setCustomAmount] = useState<string>('')
  const [successData, setSuccessData] = useState<{
    student: { id: string; name: string; studentId: string }
    password: string
    receiptNumber?: string
    invoice?: { totalAmount: number; type: string }
  } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<CreateStudentInput>({
    resolver: zodResolver(CreateStudentSchema),
    defaultValues: { rentPackage: 'semester', depositAmount: DEPOSIT_AMOUNT, yearOfStudy: 1, semester: 1, totalSemesters: 8 },
  })

  const rentPackage = watch('rentPackage')
  const yearOfStudy = watch('yearOfStudy') ?? 1
  const currentSemester = watch('semester') ?? 1
  const depositAmount = watch('depositAmount') ?? DEPOSIT_AMOUNT
  const totalSemesters = watch('totalSemesters') ?? 8

  // Auto-match: year 0→0 sems, year 1→2 sems, year 2→4 sems, etc.

  const { data: rooms } = useQuery({
    queryKey: ['rooms-available'],
    queryFn: () => api.get('/rooms', { params: { status: 'available' } }).then(r => r.data.data),
  })

  const selectedRoom = (rooms ?? []).find((r: { id: string }) => r.id === selectedRoomId) ?? null
  const availableBeds = selectedRoom?.beds?.filter((b: { isOccupied: boolean }) => !b.isOccupied) ?? []
  const feePerSem = calcFeePerSem(rentPackage, selectedRoom)
  const remainingSems = Math.max(0, totalSemesters - currentSemester + 1)
  const totalCourseFee = feePerSem * totalSemesters
  const remainingFee = feePerSem * remainingSems

  // Total to collect = sem fee + deposit
  const totalToCollect = feePerSem + Number(depositAmount)
  const effectiveAmount = customAmount !== '' ? Number(customAmount) : totalToCollect

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast({ title: 'Photo must be under 5MB', variant: 'destructive' }); return }
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const admit = useMutation({
    mutationFn: async (data: CreateStudentInput) => {
      // First create the student WITHOUT avatar
      const payload: Record<string, unknown> = {
        ...data,
        avatarUrl: undefined,
      }

      // Only include initialPayment if not skipping
      if (!skipPayment) {
        payload['initialPayment'] = {
          paymentMode: 'cash',
          customAmount: effectiveAmount,
        }
      }

      const res = await api.post('/students', payload)
      const result = res.data.data
      const realStudentId = result.student?.id

      // Now upload avatar with the real student ID
      if (photoFile && realStudentId) {
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve((reader.result as string).split(',')[1])
            reader.onerror = reject
            reader.readAsDataURL(photoFile)
          })
          const uploadRes = await api.post('/documents/upload-avatar', {
            studentId: realStudentId,
            fileBase64: base64,
            fileName: photoFile.name,
            mimeType: photoFile.type,
          })
          // Update student record with avatar URL
          if (uploadRes.data.data?.url) {
            result.student.avatarUrl = uploadRes.data.data.url
          }
        } catch (uploadErr) {
          console.warn('Photo upload failed:', uploadErr)
        }
      }

      return result
    },
    onSuccess: (data) => {
      setSuccessData(data)
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Admission failed'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    },
  })

  const onSubmit = (data: CreateStudentInput) => {
    if (!photoFile) { toast({ title: 'Passport photo is required', variant: 'destructive' }); return }
    admit.mutate(data)
  }

  const F = ({ label, name, type = 'text', placeholder, required = false }: {
    label: string; name: keyof CreateStudentInput; type?: string; placeholder?: string; required?: boolean
  }) => (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
      <Input type={type} placeholder={placeholder}
        {...register(name, { valueAsNumber: type === 'number' })}
        className={errors[name] ? 'border-destructive' : ''} />
      {errors[name] && <p className="text-xs text-destructive">{errors[name]?.message as string}</p>}
    </div>
  )

  return (
    <div>
      <Header title="Admit Student" />
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <Link href="/students">
          <Button variant="ghost" size="sm" className="gap-1.5 mb-4"><ArrowLeft className="w-4 h-4" /> Back</Button>
        </Link>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* Passport Photo */}
          <Card className="border-primary/20">
            <CardHeader><CardTitle className="text-base">📸 Passport Photo <span className="text-destructive">*</span></CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div
                  onClick={() => photoInputRef.current?.click()}
                  className={`w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden transition-colors ${photoPreview ? 'border-primary' : 'border-gray-300 hover:border-primary'}`}
                >
                  {photoPreview
                    ? <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    : <Camera className="w-8 h-8 text-gray-300" />
                  }
                </div>
                <div>
                  <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
                  <Button type="button" variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                    {photoPreview ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  <p className="text-xs text-gray-400 mt-1.5">JPEG, PNG or WebP · Max 5MB</p>
                  <p className="text-xs text-gray-400">Permanent profile photo & ID card photo</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Info */}
          <Card>
            <CardHeader><CardTitle className="text-base">👤 Personal Information</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <F label="Full Name" name="name" placeholder="Rahul Sharma" required />
              <F label="Father's Name" name="fatherName" placeholder="Rajesh Sharma" required />
              <div className="space-y-1.5">
                <Label>Mother's Name</Label>
                <Input placeholder="Sunita Sharma" {...register('motherName' as keyof CreateStudentInput)} />
              </div>
              <F label="Student Mobile" name="mobile" placeholder="9876543210" required />
              <div className="space-y-1.5">
                <Label>Father's Mobile</Label>
                <Input placeholder="9876543211" {...register('parentMobile')} />
                <p className="text-xs text-gray-400">May be same for siblings</p>
              </div>
              <div className="space-y-1.5">
                <Label>Mother's Mobile</Label>
                <Input placeholder="9876543212" {...register('motherMobile' as keyof CreateStudentInput)} />
                <p className="text-xs text-gray-400">May be same for siblings</p>
              </div>
              <F label="Email" name="email" type="email" placeholder="rahul@example.com" />
              <F label="Emergency Contact Name" name="emergencyContactName" placeholder="Contact person name" required />
              <F label="Emergency Contact Mobile" name="emergencyContact" placeholder="9876543213" required />
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Permanent Address <span className="text-destructive">*</span></Label>
                <Textarea {...register('permanentAddress')} placeholder="Full address..." className={errors.permanentAddress ? 'border-destructive' : ''} />
                {errors.permanentAddress && <p className="text-xs text-destructive">{errors.permanentAddress.message}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Aadhaar Details */}
          <Card>
            <CardHeader><CardTitle className="text-base">🪪 Identity Details</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Student Aadhaar Number</Label>
                <Input placeholder="12-digit Aadhaar" maxLength={12} {...register('aadhaar')} />
                {errors.aadhaar && <p className="text-xs text-destructive">{errors.aadhaar.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Father's Aadhaar Number</Label>
                <Input placeholder="12-digit Aadhaar" maxLength={12} {...register('fatherAadhaar' as keyof CreateStudentInput)} />
              </div>
              <div className="space-y-1.5">
                <Label>Passport Number <span className="text-xs text-gray-400">(optional)</span></Label>
                <Input placeholder="e.g. A1234567" {...register('passportNumber' as keyof CreateStudentInput)} />
              </div>
              <div className="space-y-1.5">
                <Label>Visa Number <span className="text-xs text-gray-400">(optional, for foreign students)</span></Label>
                <Input placeholder="Visa number if applicable" {...register('visaNumber' as keyof CreateStudentInput)} />
              </div>
              <div className="space-y-1.5">
                <Label>Other ID Type <span className="text-xs text-gray-400">(optional)</span></Label>
                <Input placeholder="e.g. Voter ID, Driving License" {...register('otherIdType' as keyof CreateStudentInput)} />
              </div>
              <div className="space-y-1.5">
                <Label>Other ID Number <span className="text-xs text-gray-400">(optional)</span></Label>
                <Input placeholder="ID number" {...register('otherIdNumber' as keyof CreateStudentInput)} />
              </div>
            </CardContent>
          </Card>

          {/* Academic Info */}
          <Card>
            <CardHeader><CardTitle className="text-base">🎓 Academic Information</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <F label="College" name="college" placeholder="Pune University" required />
              <F label="Course" name="course" placeholder="B.Tech" required />
              <F label="Branch" name="branch" placeholder="Computer Science" required />
              <div className="space-y-1.5">
                <Label>Year of Study <span className="text-destructive">*</span></Label>
                <Input type="number" min={1} max={6}
                  {...register('yearOfStudy', { valueAsNumber: true })}
                  onChange={e => {
                    const yr = parseInt(e.target.value, 10) || 1
                    setValue('yearOfStudy', yr, { shouldDirty: true })
                    // Auto-calculate: totalSemesters = year * 2 (e.g. yr=1→2, yr=2→4, yr=4→8)
                    const totalSems = yr * 2
                    // currentSem = first sem of that year = (yr-1)*2 + 1
                    const currentSem = Math.max(1, (yr - 1) * 2 + 1)
                    setValue('totalSemesters', totalSems, { shouldDirty: true })
                    setValue('semester', currentSem, { shouldDirty: true })
                  }}
                />
                <p className="text-xs text-gray-400">Auto-sets total sems (yr×2) and current sem</p>
              </div>
              <div className="space-y-1.5">
                <Label>Current Semester <span className="text-destructive">*</span></Label>
                <Input type="number" min={1} max={16} {...register('semester', { valueAsNumber: true })} />
                <p className="text-xs text-gray-400">Year {yearOfStudy} → Sem {Math.max(1, (yearOfStudy - 1) * 2 + 1)} (auto). Can be changed.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Total Semesters in Course <span className="text-destructive">*</span></Label>
                <Input type="number" min={1} max={16} {...register('totalSemesters', { valueAsNumber: true })} />
                <p className="text-xs text-gray-400">Year {yearOfStudy} → {yearOfStudy * 2} sems (auto). e.g. B.Tech=8, MBA=4</p>
              </div>
            </CardContent>
          </Card>

          {/* Stay Info — stay end date auto-calculated from package */}
          <Card>
            <CardHeader><CardTitle className="text-base">🏠 Stay Details</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Joining Date <span className="text-destructive">*</span></Label>
                <Input type="date" {...register('joiningDate')} className={errors.joiningDate ? 'border-destructive' : ''} />
                {errors.joiningDate && <p className="text-xs text-destructive">{errors.joiningDate.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Rent Package <span className="text-destructive">*</span></Label>
                <select {...register('rentPackage')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  {RENT_PACKAGE.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <F label="Deposit Amount (Rs.)" name="depositAmount" type="number" required />
              {/* Stay duration input — depends on package */}
              {rentPackage === 'semester' && (
                <div className="space-y-1.5">
                  <Label>Stay End Date <span className="text-xs text-gray-400">(auto-calculated)</span></Label>
                  <div className="h-10 rounded-lg border border-input bg-gray-50 px-3 flex items-center text-sm text-gray-500">
                    {totalSemesters > 0 && currentSemester > 0
                      ? `${(totalSemesters - currentSemester + 1) * 6} months from joining`
                      : 'Set year/sems above'}
                  </div>
                  <p className="text-xs text-gray-400">= {totalSemesters - currentSemester + 1} remaining sems × 6 months each</p>
                </div>
              )}
              {rentPackage === 'monthly' && (
                <div className="space-y-1.5">
                  <Label>Stay Duration (months) <span className="text-destructive">*</span></Label>
                  <Input type="number" min={1} max={60}
                    {...register('stayMonths' as keyof CreateStudentInput, { valueAsNumber: true })}
                    placeholder="12"
                    defaultValue={12}
                  />
                  <p className="text-xs text-gray-400">e.g. 12 = 1 year, 6 = 6 months. Fee billed monthly.</p>
                </div>
              )}
              {rentPackage === 'annual' && (
                <div className="space-y-1.5">
                  <Label>Stay Duration (years) <span className="text-destructive">*</span></Label>
                  <Input type="number" min={1} max={10}
                    {...register('stayYears' as keyof CreateStudentInput, { valueAsNumber: true })}
                    placeholder="1"
                    defaultValue={1}
                  />
                  <p className="text-xs text-gray-400">e.g. 1 = 1 year, 2 = 2 years. Fee billed annually.</p>
                </div>
              )}
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Notes</Label>
                <Textarea {...register('notes')} placeholder="Any additional notes..." />
              </div>
            </CardContent>
          </Card>

          {/* Room Assignment */}
          <Card>
            <CardHeader><CardTitle className="text-base">🛏️ Room Assignment</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Select Room <span className="text-destructive">*</span></Label>
                <select value={selectedRoomId} onChange={e => { setSelectedRoomId(e.target.value); setValue('roomId', e.target.value); setValue('bedId', '') }}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="">Choose room...</option>
                  {(rooms ?? []).map((r: { id: string; roomNumber: string; roomType: string; beds: Array<{ isOccupied: boolean }> }) => {
                    const vacant = r.beds?.filter(b => !b.isOccupied).length ?? 0
                    return (
                      <option key={r.id} value={r.id} disabled={vacant === 0}>
                        Room {r.roomNumber} ({r.roomType}) — {vacant} bed{vacant !== 1 ? 's' : ''} free
                      </option>
                    )
                  })}
                </select>
                {errors.roomId && <p className="text-xs text-destructive">{errors.roomId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Select Bed <span className="text-destructive">*</span></Label>
                <select {...register('bedId')} disabled={!selectedRoomId}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm disabled:opacity-50">
                  <option value="">Choose bed...</option>
                  {availableBeds.map((b: { id: string; bedLabel: string }) => (
                    <option key={b.id} value={b.id}>Bed {b.bedLabel}</option>
                  ))}
                </select>
                {errors.bedId && <p className="text-xs text-destructive">{errors.bedId.message}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Full Course Fee Structure — only for semester package */}
          {selectedRoom && feePerSem > 0 && rentPackage === 'semester' && (
            <Card className="border-blue-200">
              <CardHeader><CardTitle className="text-base">📊 Full Course Fee Structure</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Semester</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Fee</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Mark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: totalSemesters }, (_, i) => i + 1).map(sem => {
                        const isPast = sem < currentSemester
                        const isCurrent = sem === currentSemester
                        const isFuture = sem > currentSemester
                        return (
                          <tr key={sem} className={`border-b ${isCurrent ? 'bg-blue-50' : ''}`}>
                            <td className="px-3 py-2">
                              Sem {sem}
                              {isCurrent && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Current</span>}
                            </td>
                            <td className="px-3 py-2 text-right font-medium">{formatCurrency(feePerSem)}</td>
                            <td className="px-3 py-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isPast ? 'bg-green-100 text-green-700' : isCurrent ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                                {isPast ? '✓ Paid' : isCurrent ? '⏳ Due Now' : 'Upcoming'}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {isPast && (
                                <span className="text-xs text-gray-400 italic">Past sem</span>
                              )}
                              {isCurrent && (
                                <span className="text-xs text-blue-600 font-medium">Collecting now</span>
                              )}
                              {isFuture && (
                                <span className="text-xs text-gray-300">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-semibold">
                        <td className="px-3 py-2">Total Course Fee</td>
                        <td className="px-3 py-2 text-right text-blue-700">{formatCurrency(totalCourseFee)}</td>
                        <td colSpan={2} className="px-3 py-2 text-xs text-gray-500">{totalSemesters} sems × {formatCurrency(feePerSem)}</td>
                      </tr>
                      <tr className="bg-green-50">
                        <td className="px-3 py-2 text-green-700">Deposit</td>
                        <td className="px-3 py-2 text-right text-green-700">{formatCurrency(Number(depositAmount))}</td>
                        <td colSpan={2} className="px-3 py-2 text-xs text-green-600">Refundable</td>
                      </tr>
                      <tr className="bg-blue-50 font-bold">
                        <td className="px-3 py-2 text-blue-800">Remaining Fee</td>
                        <td className="px-3 py-2 text-right text-blue-800">{formatCurrency(remainingFee)}</td>
                        <td colSpan={2} className="px-3 py-2 text-xs text-blue-600">{remainingSems} sems left</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="text-xs text-gray-400">Past semesters (before current) are assumed paid. Current semester fee is collected now.</p>
              </CardContent>
            </Card>
          )}

          {/* Fee Payment */}
          <Card className="border-indigo-200">
            <CardHeader><CardTitle className="text-base">💳 First {rentPackage === 'monthly' ? 'Month' : rentPackage === 'annual' ? 'Year' : 'Semester'} Fee Payment</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {selectedRoom && feePerSem > 0 && (
                <div className="p-3 bg-indigo-50 rounded-xl text-sm text-indigo-800 space-y-1">
                  <p>{rentPackage === 'monthly' ? 'Monthly' : rentPackage === 'annual' ? 'Annual' : `Sem ${currentSemester}`} fee: <strong>{formatCurrency(feePerSem)}</strong></p>
                  <p>Security deposit: <strong>{formatCurrency(Number(depositAmount))}</strong></p>
                  <p className="font-bold text-indigo-900 border-t border-indigo-200 pt-1 mt-1">
                    Total to collect: <strong>{formatCurrency(totalToCollect)}</strong>
                  </p>
                  {rentPackage === 'monthly' && <p className="text-xs text-indigo-600">Subsequent months: {formatCurrency(feePerSem)}/month</p>}
                  {rentPackage === 'annual' && <p className="text-xs text-indigo-600">Subsequent years: {formatCurrency(feePerSem)}/year</p>}
                </div>
              )}

              {/* Skip payment checkbox */}
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors">
                <input
                  type="checkbox"
                  checked={skipPayment}
                  onChange={e => setSkipPayment(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">Skip fee payment now (show as due amount)</p>
                  <p className="text-xs text-gray-500 mt-0.5">Invoice will be created with status &apos;due&apos;. Student can pay later.</p>
                </div>
              </label>

              {skipPayment ? (
                <div className="p-3 bg-yellow-50 rounded-xl text-sm text-yellow-800">
                  ⏳ First semester fee of <strong>{formatCurrency(feePerSem)}</strong> will be shown as due amount. Invoice will be created automatically.
                </div>
              ) : (
                <>
                  {/* Custom amount override */}
                  <div className="space-y-1.5">
                    <Label>Custom Amount (₹) <span className="text-xs text-gray-400">optional — default = sem fee + deposit</span></Label>
                    <Input
                      type="number"
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                      placeholder={String(totalToCollect)}
                      min={1}
                    />
                    {customAmount !== '' && Number(customAmount) !== totalToCollect && (
                      <p className="text-xs text-orange-600">
                        Custom amount: {formatCurrency(Number(customAmount))} (default: {formatCurrency(totalToCollect)})
                      </p>
                    )}
                  </div>

                  {/* Cash only */}
                  <div className="p-3 bg-green-50 rounded-xl border-2 border-green-200">
                    <p className="text-sm font-semibold text-green-800">💵 Cash Payment</p>
                    <p className="text-xs text-green-700 mt-0.5">Cash payment will be recorded immediately. Receipt generated automatically.</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full gap-2" disabled={isSubmitting || admit.isPending}>
            {(isSubmitting || admit.isPending)
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Admitting Student...</>
              : <><UserPlus className="w-4 h-4" /> Admit Student</>
            }
          </Button>
        </form>
      </div>

      {/* Success Modal */}
      <Dialog open={!!successData} onOpenChange={() => { if (successData) router.push(`/students/${successData.student.id}`) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" /> Student Admitted!
            </DialogTitle>
          </DialogHeader>
          {successData && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                <p className="text-2xl font-bold font-mono text-green-700">{successData.student.studentId}</p>
                <p className="text-sm text-gray-600 mt-1">{successData.student.name}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Student ID</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">{successData.student.studentId}</span>
                    <button onClick={() => navigator.clipboard.writeText(successData.student.studentId)} className="text-gray-400 hover:text-primary">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Password</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">{showPassword ? successData.password : '••••••••'}</span>
                    <button onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-primary">
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => navigator.clipboard.writeText(successData.password)} className="text-gray-400 hover:text-primary">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-400">Password = Student ID. Student can change anytime.</p>
              </div>
              {successData.receiptNumber && (
                <div className="p-3 bg-blue-50 rounded-xl text-sm">
                  <p className="font-medium text-blue-800 flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5" /> Payment Recorded
                  </p>
                  <p className="text-blue-600 text-xs mt-1">Receipt: {successData.receiptNumber}</p>
                  <a href={`${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'}/finance/receipts/${successData.receiptNumber}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline mt-1 inline-block">
                    Download Receipt →
                  </a>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setSuccessData(null); router.push('/students/new') }}>Add Another</Button>
                <Button className="flex-1" onClick={() => router.push(`/students/${successData.student.id}`)}>View Profile</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
