'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { BedDouble, GraduationCap, Phone, Star, LogOut, Loader2, FileText, Lock } from 'lucide-react'
import Link from 'next/link'

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-xs text-gray-800 text-right">{value}</span>
    </div>
  )
}

export default function ProfilePage() {
  const { clearAuth } = useAuthStore()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackForm, setFeedbackForm] = useState({ foodRating: 4, cleanlinessRating: 4, wifiRating: 4, staffRating: 4, overallRating: 4, comment: '' })

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/portal/profile').then(r => r.data.data),
    // Always fetch fresh profile — admin may have updated details
    staleTime: 0,
    gcTime: 5 * 60_000,
  })

  const { data: myFeedback } = useQuery({
    queryKey: ['my-feedback'],
    queryFn: () => api.get('/feedback/my').then(r => r.data.data),
  })

  const today = new Date()
  const alreadySubmitted = (myFeedback ?? []).some(
    (f: { month: number; year: number }) => f.month === today.getMonth() + 1 && f.year === today.getFullYear()
  )

  const submitFeedback = useMutation({
    mutationFn: () => api.post('/feedback', { ...feedbackForm, month: today.getMonth() + 1, year: today.getFullYear() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-feedback'] }); toast({ title: 'Feedback submitted! Thank you 🙏' }); setShowFeedback(false) },
    onError: () => toast({ title: 'Failed to submit feedback', variant: 'destructive' }),
  })

  if (isLoading) return (
    <div>
      <TopBar title="Profile" />
      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><div className="h-24 bg-gray-100 rounded animate-pulse" /></CardContent></Card>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      <TopBar title="Profile" />
      <div className="p-4 space-y-4 max-w-lg mx-auto">

        {/* Avatar */}
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-full h-full rounded-2xl object-cover"
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
              ) : (
                <span className="text-2xl font-bold text-primary">{profile?.name?.charAt(0)}</span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{profile?.name}</h2>
              <p className="text-sm font-mono text-primary">{profile?.studentId}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">{profile?.status}</span>
            </div>
          </CardContent>
        </Card>

        {/* Room */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm"><BedDouble className="w-4 h-4 text-primary" /> Room Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <InfoRow label="Room" value={`${profile?.room?.roomNumber ?? '—'} / Bed ${profile?.bed?.bedLabel ?? '—'}`} />
            <InfoRow label="Floor" value={profile?.room?.floor?.floorName ?? `Floor ${profile?.room?.floor?.floorNumber}`} />
            <InfoRow label="Type" value={profile?.room?.roomType} />
            <InfoRow label="Joining" value={profile?.joiningDate ? formatDate(profile.joiningDate) : '—'} />
            <InfoRow label="Stay Until" value={profile?.stayEndDate ? formatDate(profile.stayEndDate) : '—'} />
            <InfoRow label="Package" value={profile?.rentPackage} />
          </CardContent>
        </Card>

        {/* Academic */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm"><GraduationCap className="w-4 h-4 text-primary" /> Academic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <InfoRow label="College" value={profile?.college} />
            <InfoRow label="Course" value={profile?.course} />
            <InfoRow label="Branch" value={profile?.branch} />
            <InfoRow label="Year" value={profile?.yearOfStudy ? `Year ${profile.yearOfStudy}, Sem ${profile.semester}` : '—'} />
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-primary" /> Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <InfoRow label="Mobile" value={profile?.mobile} />
            <InfoRow label="Email" value={profile?.email} />
            <InfoRow label="Parent" value={profile?.parentMobile} />
            <InfoRow label="Emergency" value={`${profile?.emergencyContactName ?? ''} ${profile?.emergencyContact ?? ''}`.trim()} />
          </CardContent>
        </Card>

        {/* Actions - removed ID card download as per requirement */}
        <Link href="/profile/documents">
          <Button variant="outline" className="w-full gap-2"><FileText className="w-4 h-4" /> My Documents</Button>
        </Link>
        <Link href="/profile/change-password">
          <Button variant="outline" className="w-full gap-2"><Lock className="w-4 h-4" /> Change Password</Button>
        </Link>

        {/* Monthly Feedback */}
        {!alreadySubmitted && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <p className="text-sm font-semibold">Monthly Feedback</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setShowFeedback(!showFeedback)}>
                  {showFeedback ? 'Cancel' : 'Give Feedback'}
                </Button>
              </div>
              {showFeedback && (
                <div className="space-y-3">
                  {[
                    { key: 'foodRating', label: 'Food' },
                    { key: 'cleanlinessRating', label: 'Cleanliness' },
                    { key: 'wifiRating', label: 'WiFi' },
                    { key: 'staffRating', label: 'Staff' },
                    { key: 'overallRating', label: 'Overall' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-24">{label}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button key={n} type="button"
                            onClick={() => setFeedbackForm(f => ({ ...f, [key]: n }))}
                            className={`w-7 h-7 rounded-full text-xs font-bold transition-colors ${Number(feedbackForm[key as keyof typeof feedbackForm]) >= n ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-400'}`}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <textarea value={feedbackForm.comment} onChange={e => setFeedbackForm(f => ({ ...f, comment: e.target.value }))}
                    placeholder="Any comments? (optional)" rows={2}
                    className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  <Button className="w-full" onClick={() => submitFeedback.mutate()} disabled={submitFeedback.isPending}>
                    {submitFeedback.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Feedback'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sign out */}
        <Button variant="outline" className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50" onClick={clearAuth}>
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </div>
    </div>
  )
}
