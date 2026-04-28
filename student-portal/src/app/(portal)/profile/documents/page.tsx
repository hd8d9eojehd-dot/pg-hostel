'use client'
import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Upload, FileText, ExternalLink, Trash2, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'

const DOC_TYPES = [
  { value: 'aadhaar', label: '🪪 Aadhaar Card' },
  { value: 'college_id', label: '🎓 College ID' },
  { value: 'photo', label: '📷 Passport Photo' },
  { value: 'payment_proof', label: '💳 Payment Proof' },
  { value: 'agreement', label: '📄 Agreement' },
  { value: 'other', label: '📎 Other' },
]

export default function MyDocumentsPage() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState('aadhaar')
  const [docLabel, setDocLabel] = useState('')

  const { data: docs, isLoading } = useQuery({
    queryKey: ['my-documents'],
    queryFn: () => api.get('/documents/my').then(r => r.data.data),
  })

  const deleteDoc = useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-documents'] }); toast({ title: 'Document deleted' }) },
  })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast({ title: 'File must be under 10MB', variant: 'destructive' }); return }
    setUploading(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      await api.post('/documents/upload', {
        type: docType,
        label: docLabel || DOC_TYPES.find(d => d.value === docType)?.label.replace(/^.+ /, '') || docType,
        fileBase64: base64,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      })
      qc.invalidateQueries({ queryKey: ['my-documents'] })
      toast({ title: '✓ Document uploaded' })
      setDocLabel('')
      if (fileRef.current) fileRef.current.value = ''
    } catch (err: unknown) {
      toast({ title: (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Upload failed', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const statusIcon = (doc: { isVerified: boolean; rejectionNote?: string }) => {
    if (doc.isVerified) return <CheckCircle className="w-4 h-4 text-green-500" />
    if (doc.rejectionNote) return <XCircle className="w-4 h-4 text-red-500" />
    return <Clock className="w-4 h-4 text-yellow-500" />
  }

  const statusLabel = (doc: { isVerified: boolean; rejectionNote?: string }) => {
    if (doc.isVerified) return <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Verified</span>
    if (doc.rejectionNote) return <span className="text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Rejected</span>
    return <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">Pending</span>
  }

  return (
    <div>
      <TopBar title="My Documents" />
      <div className="p-4 space-y-4 max-w-lg mx-auto pb-6">

        {/* Upload */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" /> Upload Document
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Document Type</Label>
              <select value={docType} onChange={e => setDocType(e.target.value)}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
                {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Label (optional)</Label>
              <input value={docLabel} onChange={e => setDocLabel(e.target.value)}
                placeholder="e.g. Front side, Page 1..."
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <input ref={fileRef} type="file" className="hidden"
              accept="image/*,.pdf,.doc,.docx" onChange={handleUpload} />
            <Button className="w-full gap-2" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Choose File & Upload</>}
            </Button>
            <p className="text-xs text-gray-400 text-center">Images, PDF, DOC · Max 10MB</p>
          </CardContent>
        </Card>

        {/* Documents list */}
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : (docs ?? []).length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-gray-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No documents uploaded yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {(docs ?? []).map((doc: {
              id: string; type: string; label?: string; fileUrl: string; fileName?: string
              isVerified: boolean; uploadedAt: string; rejectionNote?: string
            }) => (
              <Card key={doc.id}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      {statusIcon(doc)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium capitalize">{doc.label ?? doc.type.replace(/_/g, ' ')}</p>
                        {statusLabel(doc)}
                      </div>
                      {doc.fileName && <p className="text-xs text-gray-400 truncate mt-0.5">{doc.fileName}</p>}
                      {doc.rejectionNote && <p className="text-xs text-red-500 mt-0.5">{doc.rejectionNote}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(doc.uploadedAt)}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                      {!doc.isVerified && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => { if (confirm('Delete this document?')) deleteDoc.mutate(doc.id) }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
