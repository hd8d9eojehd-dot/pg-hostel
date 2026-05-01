'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, formatDate, statusColor } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import {
  ArrowLeft, User, BedDouble, GraduationCap, Phone,
  IndianRupee, Download, UserX, ArrowRightLeft, CalendarPlus, Loader2, Pencil,
  AlertTriangle, CheckCircle2, CreditCard, Plus, ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth.store'

// ── Inline semester updater — creates new invoice on change ──
function SemesterUpdateInline({
  studentId,
  currentSem,
  totalSems,
  onUpdated,
}: {
  studentId: string
  currentSem: number
  totalSems: number
  onUpdated: () => void
}) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [pending, setPending] = useState(false)

  // Only allow advancing to next semester (currentSem + 1)
  const nextSem = currentSem + 1
  const canAdvance = nextSem <= totalSems

  const handleAdvance = async () => {
    if (!canAdvance) return
    setPending(true)
    try {
      await api.patch(`/students/${studentId}`, {
        semester: nextSem,
        createInvoiceForNewSem: true,
      })
      // Invalidate ALL related queries so the new invoice shows everywhere immediately
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['student', studentId] }),
        qc.invalidateQueries({ queryKey: ['students'] }),
        qc.invalidateQueries({ queryKey: ['invoices'] }),
        qc.invalidateQueries({ queryKey: ['finance-summary'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
      onUpdated()
      toast({
        title: `Semester advanced to ${nextSem}`,
        description: `New invoice created — status: Due. Student can pay via portal or cash.`,
      })
    } catch (e: unknown) {
      const errMsg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast({
        title: 'Failed to update semester',
        description: errMsg,
        variant: 'destructive',
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-8 rounded-lg border border-input bg-gray-50 px-3 flex items-center text-xs text-gray-600">
        Current: Sem {currentSem} of {totalSems}
      </div>
      {canAdvance ? (
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 text-xs gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
          disabled={pending}
          onClick={handleAdvance}
        >
          {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
          Advance to Sem {nextSem}
        </Button>
      ) : (
        <span className="text-xs text-gray-400 flex-shrink-0">Final sem reached</span>
      )}
    </div>
  )
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const qc = useQueryClient()
  const { token } = useAuthStore()

  const downloadIdCard = () => {
    const url = `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'}/students/${id}/id-card`
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `id-card-${id}.pdf`
        a.click()
      })
      .catch(() => toast({ title: 'ID card download failed', variant: 'destructive' }))
  }

  const [vacateOpen, setVacateOpen] = useState(false)
  const [shiftOpen, setShiftOpen] = useState(false)
  const [extendOpen, setExtendOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [renewOpen, setRenewOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [payInvoiceId, setPayInvoiceId] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [payLateFee, setPayLateFee] = useState(0)
  const [payNotes, setPayNotes] = useState('')
  const [payMode, setPayMode] = useState<'cash'>('cash')
  const [payRef, setPayRef] = useState('')
  const [paySuccess, setPaySuccess] = useState<{ receiptNumber: string; amount: number } | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState('')
  const [deleteStep, setDeleteStep] = useState(1)
  const [vacateForm, setVacateForm] = useState({ vacateDate: '', reason: '', depositRefundAmount: 0, damageAmount: 0, inspectionNotes: '' })
  const [shiftForm, setShiftForm] = useState({ newRoomId: '', newBedId: '', reason: '' })
  const [extendForm, setExtendForm] = useState({ newEndDate: '' })
  const [renewForm, setRenewForm] = useState({ roomId: '', bedId: '', joiningDate: '', stayDurationMonths: 12, rentPackage: 'monthly', depositAmount: 5000 })

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => api.get(`/students/${id}`).then(r => r.data.data),
  })

  const { data: rooms } = useQuery({
    queryKey: ['rooms-available'],
    queryFn: () => api.get('/rooms', { params: { status: 'available' } }).then(r => r.data.data),
    enabled: shiftOpen || renewOpen,
  })

  const deleteStudent = useMutation({
    mutationFn: () => api.delete(`/students/${id}`, { data: { confirmStudentId: deleteConfirmId } }),
    onSuccess: () => {
      toast({ title: 'Student permanently deleted' })
      router.push('/students')
    },
    onError: (e: unknown) => toast({ title: 'Delete failed', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  const renewStudent = useMutation({
    mutationFn: () => api.post(`/students/${id}/renew`, {
      ...renewForm,
      stayDuration: `${renewForm.stayDurationMonths}months`,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', id] })
      toast({ title: '✓ Student re-admitted successfully' })
      setRenewOpen(false)
    },
    onError: (e: unknown) => toast({ title: 'Renewal failed', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  const vacate = useMutation({
    mutationFn: () => api.post(`/students/${id}/vacate`, vacateForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', id] })
      toast({ title: 'Student vacated successfully' })
      setVacateOpen(false)
      router.push('/students')
    },
    onError: (e: unknown) => toast({ title: 'Failed', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  const shiftRoom = useMutation({
    mutationFn: () => api.post(`/students/${id}/shift-room`, shiftForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', id] })
      toast({ title: 'Room shifted successfully' })
      setShiftOpen(false)
    },
    onError: (e: unknown) => toast({ title: 'Failed', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  const extendStay = useMutation({
    mutationFn: () => api.post(`/students/${id}/extend-stay`, extendForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', id] })
      toast({ title: 'Stay extended' })
      setExtendOpen(false)
    },
    onError: (e: unknown) => toast({ title: 'Failed', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  const collectPayment = useMutation({
    mutationFn: async () => {
      const amt = Number(payAmount)
      if (!payInvoiceId) throw new Error('Please select an invoice')
      if (!amt || amt <= 0) throw new Error('Please enter a valid amount')

      // Add late fee to invoice if specified
      if (payLateFee > 0) {
        await api.patch(`/finance/invoices/${payInvoiceId}/add-late-fee`, { lateFee: payLateFee })
      }

      const totalAmount = amt + payLateFee
      const res = await api.post('/finance/payments', {
        invoiceId: payInvoiceId,
        studentId: id,
        amount: totalAmount,
        paymentMode: 'cash',
        paidDate: payDate,
        notes: payNotes || 'Cash payment collected at counter',
      })
      return res.data.data
    },
    onSuccess: (data) => {
      // Invalidate all related queries so fee status updates everywhere
      qc.invalidateQueries({ queryKey: ['student', id] })
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['finance-summary'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setPaySuccess({ receiptNumber: data.receiptNumber, amount: Number(data.amount) })
    },
    onError: (e: unknown) => toast({
      title: 'Payment failed',
      description: (e as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error ?? (e as { message?: string })?.message,
      variant: 'destructive',
    }),
  })

  if (isLoading) return (
    <div>
      <Header title="Student Details" />
      <div className="p-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}><CardContent className="p-6"><div className="h-24 bg-gray-100 rounded animate-pulse" /></CardContent></Card>
        ))}
      </div>
    </div>
  )

  if (!student) return null

  const selectedRoom = rooms?.find((r: { id: string }) => r.id === shiftForm.newRoomId)

  // Compute fee status
  const openInvoices = (student.invoices ?? []).filter((i: { status: string }) => ['due', 'overdue', 'partial'].includes(i.status))
  const totalDue = openInvoices.reduce((s: number, i: { balance: number }) => s + Number(i.balance), 0)
  const hasOverdue = openInvoices.some((i: { status: string }) => i.status === 'overdue')
  const feeStatus = hasOverdue ? 'overdue' : openInvoices.length > 0 ? 'due' : 'clear'
  const daysLeft = Math.floor((new Date(student.stayEndDate).getTime() - Date.now()) / 86400000)

  return (
    <div>
      <Header title={student.name} />
      <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">

        {/* Back + actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link href="/students">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Students
            </Button>
          </Link>
          <div className="flex gap-2 flex-wrap justify-end">
            <Link href={`/students/${id}/edit`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShiftOpen(true)}>
              <ArrowRightLeft className="w-3.5 h-3.5" /> Shift Room
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setExtendOpen(true)}>
              <CalendarPlus className="w-3.5 h-3.5" /> Extend Stay
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadIdCard}>
              <Download className="w-3.5 h-3.5" /> ID Card
            </Button>
            {totalDue > 0 && (
              <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700"
                onClick={() => {
                  // Show all due invoices — pre-select first, show total
                  const dueInvoices = (student.invoices ?? []).filter((i: { status: string }) => ['due', 'overdue', 'partial'].includes(i.status))
                  const firstDue = dueInvoices[0]
                  setPayInvoiceId(firstDue?.id ?? '')
                  // Pre-fill with total of ALL due invoices so admin sees full picture
                  setPayAmount(firstDue ? String(Number(firstDue.balance)) : '')
                  setPayLateFee(0)
                  setPayNotes('')
                  setPaySuccess(null)
                  setPayOpen(true)
                }}>
                <IndianRupee className="w-3.5 h-3.5" /> Collect Cash ({openInvoices.length} due)
              </Button>
            )}
            {student.status !== 'vacated' && (
              <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setVacateOpen(true)}>
                <UserX className="w-3.5 h-3.5" /> Vacate Student
              </Button>
            )}
          </div>
        </div>

        {/* Profile header */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl font-bold text-primary overflow-hidden">
                {student.avatarUrl
                  ? <img src={student.avatarUrl} alt={student.name} className="w-full h-full object-cover" />
                  : student.name.charAt(0)
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-bold text-gray-900">{student.name}</h2>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(student.status)}`}>
                    {student.status}
                  </span>
                  {/* Fee status badge */}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${feeStatus === 'overdue' ? 'bg-red-100 text-red-800' : feeStatus === 'due' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                    {feeStatus === 'overdue' && <AlertTriangle className="w-3 h-3" />}
                    {feeStatus === 'clear' && <CheckCircle2 className="w-3 h-3" />}
                    Fee: {feeStatus === 'clear' ? 'Clear' : `₹${totalDue.toLocaleString('en-IN')} ${feeStatus}`}
                  </span>
                  {/* Stay status */}
                  {daysLeft <= 30 && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${daysLeft < 0 ? 'bg-red-100 text-red-800' : daysLeft <= 7 ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {daysLeft < 0 ? 'Stay Expired' : `Stay: ${daysLeft}d left`}
                    </span>
                  )}
                </div>
                <p className="font-mono text-sm text-primary mt-0.5">{student.studentId}</p>
                <div className="flex gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                  <span>📱 {student.mobile}</span>
                  {student.email && <span>✉️ {student.email}</span>}
                  <span>🏠 Room {student.room?.roomNumber ?? '—'} / Bed {student.bed?.bedLabel ?? '—'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="details">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
          </TabsList>

          {/* Details */}
          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BedDouble className="w-4 h-4 text-primary" /> Stay Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <InfoRow label="Room" value={`${student.room?.roomNumber ?? '—'} / Bed ${student.bed?.bedLabel ?? '—'}`} />
                  <InfoRow label="Floor" value={student.room?.floor?.floorName ?? `Floor ${student.room?.floor?.floorNumber}`} />
                  <InfoRow label="Joining" value={formatDate(student.joiningDate)} />
                  <InfoRow label="Stay Until" value={formatDate(student.stayEndDate)} />
                  <InfoRow label="Semesters" value={`Sem ${student.semester ?? 1} of ${(student as { totalSemesters?: number }).totalSemesters ?? 8}`} />
                  <InfoRow label="Package" value={student.rentPackage} />
                  <InfoRow label="Deposit" value={formatCurrency(Number(student.depositAmount))} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-primary" /> Academic
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <InfoRow label="College" value={student.college} />
                  <InfoRow label="Course" value={student.course} />
                  <InfoRow label="Branch" value={student.branch} />
                  <InfoRow label="Year / Sem" value={student.yearOfStudy ? `Year ${student.yearOfStudy}, Sem ${student.semester} of ${(student as { totalSemesters?: number }).totalSemesters ?? 8}` : undefined} />
                  {/* Quick semester update — creates new invoice automatically */}
                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-500 mb-1.5">Update Current Semester</p>
                    <SemesterUpdateInline
                      studentId={id}
                      currentSem={student.semester ?? 1}
                      totalSems={(student as { totalSemesters?: number }).totalSemesters ?? 8}
                      onUpdated={() => qc.invalidateQueries({ queryKey: ['student', id] })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" /> Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <InfoRow label="Mobile" value={student.mobile} />
                  <InfoRow label="Email" value={student.email} />
                  <InfoRow label="Father" value={student.fatherName} />
                  <InfoRow label="Parent Mobile" value={student.parentMobile} />
                  <InfoRow label="Emergency" value={`${student.emergencyContactName ?? ''} · ${student.emergencyContact ?? ''}`} />
                  <InfoRow label="Address" value={student.permanentAddress} />
                </CardContent>
              </Card>

              {student.parent && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" /> Parent
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <InfoRow label="Name" value={student.parent.name} />
                    <InfoRow label="Mobile" value={student.parent.mobile} />
                    <InfoRow label="Relation" value={student.parent.relation} />
                  </CardContent>
                </Card>
              )}

              {/* Identity / Aadhaar */}
              {(student.aadhaar || (student as { fatherAadhaar?: string }).fatherAadhaar) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      🪪 Identity Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {student.aadhaar && (
                      <InfoRow label="Student Aadhaar" value={student.aadhaar} />
                    )}
                    {(student as { fatherAadhaar?: string }).fatherAadhaar && (
                      <InfoRow label="Father Aadhaar" value={(student as { fatherAadhaar?: string }).fatherAadhaar ?? ''} />
                    )}
                    <InfoRow label="Father Name" value={student.fatherName} />
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Finance */}
          <TabsContent value="finance" className="mt-4 space-y-4">
            {/* Fee Structure for entire course */}
            {student.room && (
              <Card className="border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    📊 Course Fee Structure
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Semester</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600">Fee</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 hidden md:table-cell">Invoice</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const totalSems = (student as { totalSemesters?: number }).totalSemesters ?? 8
                          const currentSem = student.semester ?? 1
                          // Correct fee per period based on package
                          const feePerSem = student.rentPackage === 'semester'
                            ? Number(student.room?.semesterRent ?? 0)
                            : student.rentPackage === 'monthly'
                              ? Number(student.room?.monthlyRent ?? 0)
                              : Number(student.room?.annualRent ?? 0)

                          const rentInvoices = (student.invoices ?? []).filter((i: { type: string }) => i.type === 'rent')

                          return Array.from({ length: totalSems }, (_, i) => i + 1).map(sem => {
                            const isCurrent = sem === currentSem
                            const isPast = sem < currentSem

                            // Match invoice by semesterNumber first (most reliable), then by description
                            const semInvoice = rentInvoices.find((inv: { semesterNumber?: number; description?: string }) =>
                              inv.semesterNumber === sem ||
                              inv.description?.toLowerCase().includes(`sem ${sem} `) ||
                              inv.description?.toLowerCase().includes(`semester ${sem} `)
                            )

                            // Determine status
                            let semStatus: string
                            if (semInvoice) {
                              semStatus = (semInvoice as { status: string }).status
                            } else if (isPast) {
                              semStatus = 'no_record'
                            } else if (isCurrent) {
                              semStatus = 'due'
                            } else {
                              semStatus = 'upcoming'
                            }

                            const statusConfig: Record<string, { label: string; cls: string }> = {
                              paid: { label: 'Paid', cls: 'bg-green-100 text-green-700' },
                              partial: { label: 'Partial', cls: 'bg-orange-100 text-orange-700' },
                              due: { label: 'Due', cls: 'bg-yellow-100 text-yellow-700' },
                              overdue: { label: 'Overdue', cls: 'bg-red-100 text-red-700' },
                              upcoming: { label: 'Upcoming', cls: 'bg-gray-100 text-gray-500' },
                              no_record: { label: 'No Record', cls: 'bg-gray-100 text-gray-400' },
                            }
                            const sc = statusConfig[semStatus] ?? statusConfig['upcoming']
                            const invTyped = semInvoice as { invoiceNumber?: string; balance?: number } | undefined
                            return (
                              <tr key={sem} className={`border-b ${isCurrent ? 'bg-blue-50' : isPast && !semInvoice ? 'opacity-60' : ''}`}>
                                <td className="px-3 py-2">
                                  Sem {sem}
                                  {isCurrent && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Current</span>}
                                </td>
                                <td className="px-3 py-2 text-right font-medium">
                                  {isPast && !semInvoice ? <span className="text-gray-300">—</span> : formatCurrency(feePerSem)}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.cls}`}>
                                    {sc.label}
                                  </span>
                                  {invTyped?.balance !== undefined && Number(invTyped.balance) > 0 && (
                                    <span className="ml-1.5 text-xs text-red-600">({formatCurrency(Number(invTyped.balance))} due)</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 hidden md:table-cell text-xs text-gray-400 font-mono">
                                  {invTyped?.invoiceNumber ?? '—'}
                                </td>
                              </tr>
                            )
                          })
                        })()}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50 font-semibold border-t-2">
                          <td className="px-3 py-2">Fee from Sem {student.semester ?? 1}</td>
                          <td className="px-3 py-2 text-right text-blue-700">
                            {formatCurrency(
                              Math.max(0, ((student as { totalSemesters?: number }).totalSemesters ?? 8) - (student.semester ?? 1) + 1) *
                              (student.rentPackage === 'semester'
                                ? Number(student.room?.semesterRent ?? 0)
                                : student.rentPackage === 'monthly'
                                  ? Number(student.room?.monthlyRent ?? 0)
                                  : Number(student.room?.annualRent ?? 0))
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500" colSpan={2}>
                            {Math.max(0, ((student as { totalSemesters?: number }).totalSemesters ?? 8) - (student.semester ?? 1) + 1)} sems remaining
                          </td>
                        </tr>
                        <tr className="bg-green-50">
                          <td className="px-3 py-2 text-green-700">Deposit</td>
                          <td className="px-3 py-2 text-right text-green-700">{formatCurrency(Number(student.depositAmount))}</td>
                          <td className="px-3 py-2 text-xs text-green-600" colSpan={2}>Refundable on exit</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">{student.invoices?.length ?? 0} invoice{(student.invoices?.length ?? 0) !== 1 ? 's' : ''}</p>
              <div className="flex gap-2">
                <Link href={`/finance/new-invoice?studentId=${id}`}>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5" /> New Invoice
                  </Button>
                </Link>
              </div>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice #</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Due Date</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(student.invoices ?? []).length === 0 ? (
                        <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No invoices yet</td></tr>
                      ) : (
                        (student.invoices ?? []).map((inv: {
                          id: string; invoiceNumber: string; type: string
                          totalAmount: number; balance: number; dueDate: string; status: string
                        }) => (
                          <tr key={inv.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-xs">{inv.invoiceNumber}</td>
                            <td className="px-4 py-3 capitalize">{inv.type}</td>
                            <td className="px-4 py-3">{formatDate(inv.dueDate)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(Number(inv.totalAmount))}</td>
                            <td className="px-4 py-3 text-right font-medium text-orange-600">{formatCurrency(Number(inv.balance))}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(inv.status)}`}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                <Link href={`/finance/invoices/${inv.id}`}>
                                  <Button variant="ghost" size="sm" className="text-xs">View</Button>
                                </Link>
                                {inv.status !== 'paid' && inv.status !== 'waived' && (
                                  <Link href={`/finance/record-payment?invoiceId=${inv.id}`}>
                                    <Button variant="ghost" size="sm" className="text-xs text-green-600">Pay</Button>
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents */}
          <TabsContent value="documents" className="mt-4">
            <Card>
              <CardContent className="p-4">
                {(student.documents ?? []).length === 0 ? (
                  <p className="text-center text-gray-400 py-8">No documents uploaded</p>
                ) : (
                  <div className="space-y-3">
                    {(student.documents ?? []).map((doc: {
                      id: string; type: string; label?: string; fileUrl: string
                      isVerified: boolean; uploadedAt: string; rejectionNote?: string
                    }) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-xl">
                        <div>
                          <p className="text-sm font-medium capitalize">{doc.type.replace(/_/g, ' ')}</p>
                          {doc.label && <p className="text-xs text-gray-500">{doc.label}</p>}
                          <p className="text-xs text-gray-400">{formatDate(doc.uploadedAt)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${doc.isVerified ? 'bg-green-100 text-green-800' : doc.rejectionNote ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {doc.isVerified ? 'Verified' : doc.rejectionNote ? 'Rejected' : 'Pending'}
                          </span>
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm"><Download className="w-3.5 h-3.5" /></Button>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Vacate Dialog — PERMANENT: deletes all student data */}
      <Dialog open={vacateOpen} onOpenChange={setVacateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <UserX className="w-5 h-5" /> Vacate Student — Permanent Action
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 space-y-2">
              <p className="font-bold text-red-800">⚠️ This action is PERMANENT and cannot be undone.</p>
              <p>Vacating <strong>{student.name}</strong> will:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Free their room and bed immediately</li>
                <li>Delete ALL student data (invoices, payments, documents, complaints)</li>
                <li>Delete their login account permanently</li>
                <li>Auto-logout their student portal session</li>
              </ul>
              <p className="text-xs font-semibold text-red-800 mt-2">There is no re-admission after vacating.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Type student name to confirm <span className="text-destructive">*</span></Label>
              <Input
                placeholder={student.name}
                value={vacateForm.reason}
                onChange={e => setVacateForm(f => ({ ...f, reason: e.target.value }))}
              />
              <p className="text-xs text-gray-400">Type exactly: <strong>{student.name}</strong></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVacateOpen(false)}>Cancel</Button>
            <Button variant="destructive"
              onClick={() => vacate.mutate()}
              disabled={vacate.isPending || vacateForm.reason.trim().toLowerCase() !== student.name.trim().toLowerCase()}>
              {vacate.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>
                : <><UserX className="w-4 h-4" /> Confirm Vacate & Delete</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shift Room Dialog */}
      <Dialog open={shiftOpen} onOpenChange={setShiftOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Shift Room</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Select New Room</Label>
              <select value={shiftForm.newRoomId} onChange={e => setShiftForm(f => ({ ...f, newRoomId: e.target.value, newBedId: '' }))}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="">Choose room...</option>
                {(rooms ?? []).map((r: { id: string; roomNumber: string; roomType: string }) => (
                  <option key={r.id} value={r.id}>{r.roomNumber} ({r.roomType})</option>
                ))}
              </select>
            </div>
            {selectedRoom && (
              <div className="space-y-1.5">
                <Label>Select Bed</Label>
                <select value={shiftForm.newBedId} onChange={e => setShiftForm(f => ({ ...f, newBedId: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="">Choose bed...</option>
                  {selectedRoom.beds?.filter((b: { isOccupied: boolean }) => !b.isOccupied).map((b: { id: string; bedLabel: string }) => (
                    <option key={b.id} value={b.id}>Bed {b.bedLabel}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea value={shiftForm.reason} onChange={e => setShiftForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason for room shift..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShiftOpen(false)}>Cancel</Button>
            <Button onClick={() => shiftRoom.mutate()} disabled={shiftRoom.isPending || !shiftForm.newRoomId || !shiftForm.newBedId || !shiftForm.reason}>
              {shiftRoom.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Shifting...</> : 'Shift Room'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Stay Dialog */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Extend Stay</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Current end date: <strong>{formatDate(student.stayEndDate)}</strong></p>
            <div className="space-y-1.5">
              <Label>New End Date</Label>
              <Input type="date" value={extendForm.newEndDate} onChange={e => setExtendForm({ newEndDate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendOpen(false)}>Cancel</Button>
            <Button onClick={() => extendStay.mutate()} disabled={extendStay.isPending || !extendForm.newEndDate}>
              {extendStay.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Extend Stay'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Walk-in Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={o => { if (!o) { setPayOpen(false); setPaySuccess(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-green-600" /> Collect Cash — {student?.name}
            </DialogTitle>
          </DialogHeader>
          {paySuccess ? (
            <div className="space-y-4 text-center py-2">
              <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
              <div>
                <p className="text-lg font-bold text-green-700">Payment Recorded!</p>
                <p className="text-gray-500 text-sm mt-1">Receipt: <span className="font-mono font-semibold">{paySuccess.receiptNumber}</span></p>
                <p className="text-gray-500 text-sm">Amount: <span className="font-bold text-green-700">{formatCurrency(paySuccess.amount)}</span></p>
              </div>
              <div className="flex gap-2">
                <a href={`${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'}/finance/receipts/${paySuccess.receiptNumber}?inline=1`}
                  target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button variant="outline" className="w-full gap-2"><Download className="w-4 h-4" /> Receipt</Button>
                </a>
                <Button className="flex-1" onClick={() => { setPayOpen(false); setPaySuccess(null) }}>Done</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* All due invoices summary */}
              {openInvoices.length > 1 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
                  <p className="text-xs font-semibold text-orange-800 mb-2">All pending dues ({openInvoices.length} invoices):</p>
                  <div className="space-y-1">
                    {(student?.invoices ?? [])
                      .filter((i: { status: string }) => ['due', 'overdue', 'partial'].includes(i.status))
                      .map((i: { id: string; invoiceNumber: string; description?: string; type: string; balance: number; status: string }) => (
                        <div key={i.id} className="flex justify-between text-xs">
                          <span className="text-orange-700">{i.invoiceNumber} — {i.description ?? i.type}</span>
                          <span className="font-semibold text-orange-900">{formatCurrency(Number(i.balance))}</span>
                        </div>
                      ))}
                    <div className="flex justify-between text-xs font-bold text-orange-900 border-t border-orange-200 pt-1 mt-1">
                      <span>Total Due</span>
                      <span>{formatCurrency(totalDue)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Invoice selector */}
              <div className="space-y-1.5">
                <Label>Select Invoice to Pay</Label>
                <select value={payInvoiceId} onChange={e => {
                  setPayInvoiceId(e.target.value)
                  const inv = (student?.invoices ?? []).find((i: { id: string }) => i.id === e.target.value)
                  if (inv) setPayAmount(String(Number((inv as { balance: number }).balance)))
                }} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="">Select invoice...</option>
                  {(student?.invoices ?? [])
                    .filter((i: { status: string }) => ['due', 'overdue', 'partial'].includes(i.status))
                    .map((i: { id: string; invoiceNumber: string; description?: string; type: string; balance: number }) => (
                      <option key={i.id} value={i.id}>
                        {i.invoiceNumber} — {i.description ?? i.type} (Rs.{Number(i.balance).toLocaleString('en-IN')})
                      </option>
                    ))}
                </select>
                {openInvoices.length > 1 && (
                  <p className="text-xs text-gray-500">Pay invoices one at a time. Start with the oldest.</p>
                )}
              </div>

              {/* Amount + late fee */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Amount (Rs.)</Label>
                  <Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>Late Fee (Rs.) <span className="text-xs text-gray-400">optional</span></Label>
                  <Input type="number" value={payLateFee || ''} onChange={e => setPayLateFee(Number(e.target.value))} placeholder="0" />
                </div>
              </div>
              {payLateFee > 0 && (
                <p className="text-xs text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg">
                  Total to collect: {formatCurrency(Number(payAmount) + payLateFee)}
                </p>
              )}

              {/* Cash only */}
              <div className="p-3 rounded-xl border-2 border-primary bg-primary/5 text-center">
                <p className="text-sm font-semibold text-primary">Cash Payment</p>
                <p className="text-xs text-gray-500 mt-0.5">Recorded immediately. Receipt generated automatically.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Payment Date</Label>
                  <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes <span className="text-xs text-gray-400">optional</span></Label>
                  <Input value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Walk-in payment..." />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
                <Button className="gap-2 bg-green-600 hover:bg-green-700"
                  disabled={collectPayment.isPending || !payInvoiceId || !payAmount || Number(payAmount) <= 0}
                  onClick={() => collectPayment.mutate()}>
                  {collectPayment.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Recording...</>
                    : <><IndianRupee className="w-4 h-4" /> Record {formatCurrency(Number(payAmount) + payLateFee)}</>}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Renew / Re-admit Dialog */}
      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="text-green-600">Re-admit Student</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>New Room</Label>
                <select value={renewForm.roomId} onChange={e => setRenewForm(f => ({ ...f, roomId: e.target.value, bedId: '' }))}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="">Choose room...</option>
                  {(rooms ?? []).map((r: { id: string; roomNumber: string; roomType: string }) => (
                    <option key={r.id} value={r.id}>{r.roomNumber} ({r.roomType})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Bed</Label>
                <select value={renewForm.bedId} onChange={e => setRenewForm(f => ({ ...f, bedId: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" disabled={!renewForm.roomId}>
                  <option value="">Choose bed...</option>
                  {(rooms ?? []).find((r: { id: string }) => r.id === renewForm.roomId)?.beds
                    ?.filter((b: { isOccupied: boolean }) => !b.isOccupied)
                    .map((b: { id: string; bedLabel: string }) => (
                      <option key={b.id} value={b.id}>Bed {b.bedLabel}</option>
                    ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Joining Date</Label>
                <Input type="date" value={renewForm.joiningDate} onChange={e => setRenewForm(f => ({ ...f, joiningDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Stay Duration (months)</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={renewForm.stayDurationMonths}
                  onChange={e => setRenewForm(f => ({ ...f, stayDurationMonths: Number(e.target.value) || 12 }))}
                  placeholder="12"
                />
                <p className="text-xs text-gray-400">e.g. 12 = 1 year, 6 = 6 months</p>
              </div>
              <div className="space-y-1.5">
                <Label>Rent Package</Label>
                <select value={renewForm.rentPackage} onChange={e => setRenewForm(f => ({ ...f, rentPackage: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  {['monthly', 'semester', 'annual'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Deposit (Rs.)</Label>
                <Input type="number" value={renewForm.depositAmount} onChange={e => setRenewForm(f => ({ ...f, depositAmount: Number(e.target.value) }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewOpen(false)}>Cancel</Button>
            <Button onClick={() => renewStudent.mutate()} disabled={renewStudent.isPending || !renewForm.roomId || !renewForm.bedId || !renewForm.joiningDate}>
              {renewStudent.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Re-admitting...</> : 'Re-admit Student'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-gray-900 text-right">{value}</span>
    </div>
  )
}
