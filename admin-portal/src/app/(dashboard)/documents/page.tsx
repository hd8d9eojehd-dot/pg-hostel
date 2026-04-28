'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { CheckCircle, XCircle, ExternalLink, Search, FileText, Users, Shield } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function DocumentsPage() {
  const [search, setSearch] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [tab, setTab] = useState<'students' | 'docs'>('students')
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data: allStudents, isLoading: studentsLoading } = useQuery({
    queryKey: ['students-docs-list', search],
    queryFn: () => api.get('/students', { params: { search: search || undefined, limit: 100, status: 'active' } }).then(r => r.data.students),
  })

  const { data: docs, isLoading: docsLoading } = useQuery({
    queryKey: ['documents', selectedStudentId],
    queryFn: () => api.get(`/documents/student/${selectedStudentId}`).then(r => r.data.data),
    enabled: !!selectedStudentId,
  })

  const verify = useMutation({
    mutationFn: (id: string) => api.post(`/documents/${id}/verify`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents'] }); toast({ title: '✓ Document verified' }) },
  })
  const reject = useMutation({
    mutationFn: (id: string) => api.post(`/documents/${id}/reject`, { reason: 'Document unclear or invalid. Please re-upload.' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents'] }); toast({ title: 'Document rejected' }) },
  })

  const selectedStudent = (allStudents ?? []).find((s: { id: string }) => s.id === selectedStudentId)

  return (
    <div>
      <Header title="Documents" />
      <div className="p-4 md:p-6 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2">
          <Button variant={tab === 'students' ? 'default' : 'outline'} size="sm" onClick={() => setTab('students')}>
            <Users className="w-3.5 h-3.5 mr-1.5" /> Student List
          </Button>
          <Button variant={tab === 'docs' ? 'default' : 'outline'} size="sm" onClick={() => setTab('docs')}>
            <FileText className="w-3.5 h-3.5 mr-1.5" /> Documents
          </Button>
        </div>

        {/* Student list with aadhaar */}
        {tab === 'students' && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" /> Student Identity Records
                </CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Search name, ID, mobile..." value={search}
                    onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Student</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Student ID</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Mobile</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Aadhaar</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Father Aadhaar</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Room</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Docs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b">
                          {Array.from({ length: 7 }).map((_, j) => (
                            <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                          ))}
                        </tr>
                      ))
                    ) : (allStudents ?? []).length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No students found</td></tr>
                    ) : (
                      (allStudents ?? []).map((s: {
                        id: string; name: string; studentId: string; mobile: string
                        aadhaar?: string; fatherAadhaar?: string
                        room?: { roomNumber: string }; bed?: { bedLabel: string }
                      }) => (
                        <tr key={s.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                                {s.name.charAt(0)}
                              </div>
                              <span className="font-medium">{s.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-primary">{s.studentId}</td>
                          <td className="px-4 py-3">{s.mobile}</td>
                          <td className="px-4 py-3">
                            {s.aadhaar
                              ? <span className="font-mono text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">{s.aadhaar}</span>
                              : <span className="text-xs text-gray-300">—</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            {s.fatherAadhaar
                              ? <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{s.fatherAadhaar}</span>
                              : <span className="text-xs text-gray-300">—</span>
                            }
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {s.room ? `${s.room.roomNumber}/${s.bed?.bedLabel ?? '?'}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button size="sm" variant="outline" className="text-xs h-7"
                              onClick={() => { setSelectedStudentId(s.id); setTab('docs') }}>
                              View
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents tab */}
        {tab === 'docs' && (
          <div className="space-y-4">
            {/* Student selector */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input placeholder="Search student..." value={search}
                      onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
                  </div>
                  {search.length >= 2 && (allStudents ?? []).length > 0 && (
                    <div className="absolute z-10 mt-10 w-72 bg-white border rounded-xl shadow-lg overflow-hidden">
                      {(allStudents ?? []).slice(0, 6).map((s: { id: string; name: string; studentId: string; mobile: string }) => (
                        <button key={s.id} onClick={() => { setSelectedStudentId(s.id); setSearch('') }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 border-b last:border-0">
                          <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.studentId} · {s.mobile}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedStudent && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-lg">
                      <span className="text-sm font-medium">{selectedStudent.name}</span>
                      <span className="text-xs text-gray-400">{selectedStudent.studentId}</span>
                      <button onClick={() => setSelectedStudentId('')} className="text-gray-400 hover:text-gray-600 ml-1">✕</button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedStudentId ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Documents {docs ? `(${docs.length})` : ''}</CardTitle>
                </CardHeader>
                <CardContent>
                  {docsLoading ? (
                    <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
                  ) : (docs ?? []).length === 0 ? (
                    <p className="text-center text-gray-400 py-8">No documents uploaded yet</p>
                  ) : (
                    <div className="space-y-2">
                      {(docs ?? []).map((doc: { id: string; type: string; label?: string; fileUrl: string; fileName?: string; isVerified: boolean; uploadedAt: string; rejectionNote?: string }) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-xl hover:bg-gray-50">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium capitalize">{doc.type.replace(/_/g, ' ')}</p>
                              {doc.label && <span className="text-xs text-gray-400">({doc.label})</span>}
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${doc.isVerified ? 'bg-green-100 text-green-800' : doc.rejectionNote ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {doc.isVerified ? '✓ Verified' : doc.rejectionNote ? '✗ Rejected' : '⏳ Pending'}
                              </span>
                            </div>
                            {doc.fileName && <p className="text-xs text-gray-400 mt-0.5 truncate">{doc.fileName}</p>}
                            <p className="text-xs text-gray-400 mt-0.5">{formatDate(doc.uploadedAt)}</p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm"><ExternalLink className="w-3.5 h-3.5" /></Button>
                            </a>
                            {!doc.isVerified && (
                              <>
                                <Button size="sm" variant="outline" className="gap-1 text-green-600 border-green-200 text-xs"
                                  onClick={() => verify.mutate(doc.id)} disabled={verify.isPending}>
                                  <CheckCircle className="w-3 h-3" /> Verify
                                </Button>
                                <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-200 text-xs"
                                  onClick={() => reject.mutate(doc.id)} disabled={reject.isPending}>
                                  <XCircle className="w-3 h-3" /> Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-16 text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Select a student to view their documents</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
