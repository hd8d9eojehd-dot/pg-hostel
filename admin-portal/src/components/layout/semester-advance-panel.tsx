'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { GraduationCap, ChevronRight, Loader2, AlertTriangle, CheckCircle2, RefreshCw, Users } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type CourseGroup = {
  course: string
  branch: string
  currentSem: number
  totalSems: number
  studentCount: number
  students: Array<{ id: string; name: string; studentId: string; semester: number }>
}

export function SemesterAdvancePanel({ onClose }: { onClose?: () => void }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [confirmGroup, setConfirmGroup] = useState<CourseGroup | null>(null)

  const { data: groups, isLoading, refetch } = useQuery<CourseGroup[]>({
    queryKey: ['course-sem-groups'],
    queryFn: () => api.get('/students/course-groups').then(r => r.data.data),
    staleTime: 0, // always fresh — admin needs current data
  })

  const advanceSemester = useMutation({
    mutationFn: async (group: CourseGroup) => {
      const newSem = group.currentSem + 1
      const res = await api.post('/students/bulk-advance-semester', {
        course: group.course,
        branch: group.branch,
        currentSem: group.currentSem,
        newSem,
      })
      return res.data.data
    },
    onSuccess: (data, group) => {
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['course-sem-groups'] })
      qc.invalidateQueries({ queryKey: ['finance-summary'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast({
        title: `Semester advanced to ${group.currentSem + 1}`,
        description: `${data?.updated ?? group.studentCount} students updated. ${data?.invoicesCreated ?? 0} new invoices created (status: due).`,
      })
      setConfirmGroup(null)
    },
    onError: (e: unknown) => {
      toast({
        title: 'Failed to advance semester',
        description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error,
        variant: 'destructive',
      })
    },
  })

  if (isLoading) {
    return (
      <div className="px-2 py-3 space-y-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (!groups?.length) {
    return (
      <div className="px-3 py-4 text-center space-y-2">
        <Users className="w-6 h-6 text-gray-300 mx-auto" />
        <p className="text-xs text-gray-400">No active student groups found</p>
        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => refetch()}>
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="px-2 py-2 space-y-1">
        {/* Refresh button */}
        <div className="flex justify-end px-1 pb-1">
          <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-gray-400" onClick={() => refetch()}>
            <RefreshCw className="w-2.5 h-2.5" /> Refresh
          </Button>
        </div>

        {groups.map((group) => {
          const isLastSem = group.currentSem >= group.totalSems
          const key = `${group.course}-${group.branch}-${group.currentSem}`
          return (
            <button
              key={key}
              disabled={isLastSem}
              onClick={() => setConfirmGroup(group)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors min-h-[2.75rem] ${
                isLastSem
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:bg-indigo-50 active:bg-indigo-100'
              }`}
            >
              <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">{group.currentSem}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">
                  {group.course}{group.branch ? ` · ${group.branch}` : ''}
                </p>
                <p className="text-[10px] text-gray-500">
                  Sem {group.currentSem} → {group.currentSem + 1} · {group.studentCount} student{group.studentCount !== 1 ? 's' : ''}
                </p>
              </div>
              {!isLastSem && <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
              {isLastSem && <span className="text-[10px] text-gray-400 flex-shrink-0">Final</span>}
            </button>
          )
        })}
      </div>

      {/* Confirm Dialog */}
      <Dialog open={!!confirmGroup} onOpenChange={o => { if (!o) setConfirmGroup(null) }}>
        <DialogContent className="max-w-sm mx-4 sm:mx-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Advance Semester
            </DialogTitle>
          </DialogHeader>
          {confirmGroup && (
            <div className="space-y-3">
              {/* Course info */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <p className="text-sm font-semibold text-blue-900">
                  {confirmGroup.course}{confirmGroup.branch ? ` — ${confirmGroup.branch}` : ''}
                </p>
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <span className="font-mono bg-blue-100 px-2 py-0.5 rounded font-bold">Sem {confirmGroup.currentSem}</span>
                  <ChevronRight className="w-4 h-4" />
                  <span className="font-mono bg-primary text-white px-2 py-0.5 rounded font-bold">Sem {confirmGroup.currentSem + 1}</span>
                </div>
                <p className="text-xs text-blue-600">
                  {confirmGroup.studentCount} student{confirmGroup.studentCount !== 1 ? 's' : ''} will be updated
                </p>
              </div>

              {/* Student list preview */}
              {confirmGroup.students.length > 0 && (
                <div className="max-h-32 overflow-y-auto rounded-lg border bg-gray-50 divide-y">
                  {confirmGroup.students.slice(0, 8).map(s => (
                    <div key={s.id} className="flex items-center justify-between px-3 py-1.5 text-xs">
                      <span className="text-gray-700 font-medium truncate">{s.name}</span>
                      <span className="text-gray-400 font-mono ml-2 flex-shrink-0">{s.studentId}</span>
                    </div>
                  ))}
                  {confirmGroup.students.length > 8 && (
                    <div className="px-3 py-1.5 text-xs text-gray-400 text-center">
                      +{confirmGroup.students.length - 8} more students
                    </div>
                  )}
                </div>
              )}

              {/* Warning */}
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-yellow-800 space-y-0.5">
                    <p className="font-semibold">This will:</p>
                    <p>• Update all {confirmGroup.studentCount} students to Sem {confirmGroup.currentSem + 1}</p>
                    <p>• Create new fee invoices (status: <strong>due</strong>)</p>
                    <p>• Send WhatsApp notification to each student</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmGroup(null)}>Cancel</Button>
            <Button
              disabled={advanceSemester.isPending}
              onClick={() => confirmGroup && advanceSemester.mutate(confirmGroup)}
              className="gap-2"
            >
              {advanceSemester.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Advancing...</>
                : <><CheckCircle2 className="w-4 h-4" /> Confirm Advance</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
