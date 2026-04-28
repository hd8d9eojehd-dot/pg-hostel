'use client'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UpdateStudentSchema, type UpdateStudentInput } from '@pg-hostel/shared'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

export default function EditStudentPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => api.get(`/students/${id}`).then(r => r.data.data),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<UpdateStudentInput>({
    resolver: zodResolver(UpdateStudentSchema),
  })

  useEffect(() => {
    if (student) {
      reset({
        name: student.name,
        fatherName: student.fatherName ?? '',
        mobile: student.mobile,
        parentMobile: student.parentMobile ?? '',
        email: student.email ?? '',
        aadhaar: student.aadhaar ?? '',
        permanentAddress: student.permanentAddress ?? '',
        emergencyContact: student.emergencyContact ?? '',
        emergencyContactName: student.emergencyContactName ?? '',
        college: student.college ?? '',
        course: student.course ?? '',
        branch: student.branch ?? '',
        yearOfStudy: student.yearOfStudy ?? 1,
        semester: student.semester ?? 1,
        notes: student.notes ?? '',
      })
    }
  }, [student, reset])

  const update = useMutation({
    mutationFn: (data: UpdateStudentInput) => api.patch(`/students/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', id] })
      qc.invalidateQueries({ queryKey: ['students'] })
      toast({ title: 'Student updated successfully' })
      router.push(`/students/${id}`)
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Update failed'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    },
  })

  if (isLoading) return (
    <div><Header title="Edit Student" />
      <div className="p-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}><CardContent className="p-6"><div className="h-24 bg-gray-100 rounded animate-pulse" /></CardContent></Card>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      <Header title="Edit Student" />
      <div className="p-4 md:p-6 max-w-3xl">
        <Link href={`/students/${id}`}>
          <Button variant="ghost" size="sm" className="gap-1.5 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Student
          </Button>
        </Link>

        <form onSubmit={handleSubmit(d => update.mutate(d))} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              {([
                { label: 'Full Name', name: 'name' as const, placeholder: 'Rahul Sharma', type: 'text' as const },
                { label: "Father's Name", name: 'fatherName' as const, placeholder: 'Rajesh Sharma', type: 'text' as const },
                { label: 'Mobile', name: 'mobile' as const, placeholder: '9876543210', type: 'text' as const },
                { label: 'Parent Mobile', name: 'parentMobile' as const, placeholder: '9876543211', type: 'text' as const },
                { label: 'Email', name: 'email' as const, placeholder: 'rahul@example.com', type: 'email' as const },
                { label: 'Aadhaar', name: 'aadhaar' as const, placeholder: '123456789012', type: 'text' as const },
                { label: 'Emergency Contact Name', name: 'emergencyContactName' as const, placeholder: 'Contact name', type: 'text' as const },
                { label: 'Emergency Contact', name: 'emergencyContact' as const, placeholder: '9876543212', type: 'text' as const },
              ]).map(({ label, name, placeholder, type }) => (
                <div key={name} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Input type={type ?? 'text'} placeholder={placeholder} {...register(name)} className={errors[name] ? 'border-destructive' : ''} />
                  {errors[name] && <p className="text-xs text-destructive">{errors[name]?.message as string}</p>}
                </div>
              ))}
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Permanent Address</Label>
                <Textarea {...register('permanentAddress')} placeholder="Full address..." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Academic Information</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              {([
                { label: 'College', name: 'college' as const, placeholder: 'Pune University' },
                { label: 'Course', name: 'course' as const, placeholder: 'B.Tech' },
                { label: 'Branch', name: 'branch' as const, placeholder: 'Computer Science' },
              ] as const).map(({ label, name, placeholder }) => (
                <div key={name} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Input placeholder={placeholder} {...register(name)} />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label>Year of Study</Label>
                <Input type="number" {...register('yearOfStudy', { valueAsNumber: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>Semester</Label>
                <Input type="number" {...register('semester', { valueAsNumber: true })} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
            <CardContent>
              <Textarea {...register('notes')} placeholder="Any additional notes..." rows={3} />
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full gap-2" disabled={isSubmitting}>
            {isSubmitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              : <><Save className="w-4 h-4" /> Save Changes</>
            }
          </Button>
        </form>
      </div>
    </div>
  )
}
