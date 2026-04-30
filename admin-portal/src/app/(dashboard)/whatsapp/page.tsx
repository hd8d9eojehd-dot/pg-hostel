'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { Send, Wifi, WifiOff, RefreshCw, Users, MessageSquare, FileText, Save, Loader2, QrCode, LogOut, RotateCcw, AlertTriangle } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

type WaStatus = {
  ready: boolean
  initializing: boolean
  qrAvailable: boolean
  qrExpired: boolean
  qrDataUrl: string | null
}

export default function WhatsAppPage() {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [mobile, setMobile] = useState('')
  const [message, setMessage] = useState('')
  const [bulkMessage, setBulkMessage] = useState('')
  const [page, setPage] = useState(1)
  const [bulkStatusFilter, setBulkStatusFilter] = useState<'active' | 'all'>('active')
  const [bulkFeeStatus, setBulkFeeStatus] = useState<'all' | 'due' | 'overdue' | 'clear'>('all')
  const [logsStatusFilter, setLogsStatusFilter] = useState('')
  const [logsStartDate, setLogsStartDate] = useState('')
  const [logsEndDate, setLogsEndDate] = useState('')
  const [templates, setTemplates] = useState<Record<string, string>>({})
  const [templatesLoaded, setTemplatesLoaded] = useState(false)

  // Poll status — fast when not connected, slow when connected
  const { data: status, refetch: refetchStatus } = useQuery<WaStatus>({
    queryKey: ['wa-status'],
    queryFn: () => api.get('/whatsapp/status').then(r => r.data.data),
    refetchInterval: (query) => {
      const d = query.state.data as WaStatus | undefined
      if (d?.ready) return 30000          // connected — check every 30s
      if (d?.initializing) return 2000    // starting up — check every 2s
      if (d?.qrAvailable) return 5000     // QR shown — check every 5s for scan
      return 5000                          // disconnected — check every 5s
    },
    staleTime: 0,
  })

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['wa-logs', page, logsStatusFilter, logsStartDate, logsEndDate],
    queryFn: () => api.get('/whatsapp/logs', {
      params: { page, limit: 20,
        ...(logsStatusFilter && { status: logsStatusFilter }),
        ...(logsStartDate && { startDate: logsStartDate }),
        ...(logsEndDate && { endDate: logsEndDate }),
      },
    }).then(r => r.data),
  })

  const { data: settingsData } = useQuery({
    queryKey: ['wa-settings', user?.branchId],
    queryFn: () => api.get('/settings', { params: { branchId: user?.branchId } }).then(r => r.data.data),
    enabled: !!user?.branchId,
  })

  const settingsTemplates = (settingsData as { whatsappTemplates?: Record<string, string> } | undefined)?.whatsappTemplates
  if (!templatesLoaded && settingsTemplates) { setTemplates(settingsTemplates); setTemplatesLoaded(true) }

  const send = useMutation({
    mutationFn: () => api.post('/whatsapp/send', { mobile, message }),
    onSuccess: () => { toast({ title: 'Message sent' }); setMobile(''); setMessage(''); qc.invalidateQueries({ queryKey: ['wa-logs'] }) },
    onError: (e: unknown) => toast({ title: 'Failed', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  const sendBulk = useMutation({
    mutationFn: async () => {
      const params: Record<string, string> = { limit: '200' }
      if (bulkStatusFilter !== 'all') params['status'] = bulkStatusFilter
      const res = await api.get('/students', { params })
      const students = res.data.students ?? []
      return api.post('/whatsapp/send-bulk', {
        messages: students.map((s: { id: string; mobile: string }) => ({ mobile: s.mobile, message: bulkMessage, studentId: s.id })),
        filter: { message: bulkMessage, status: bulkStatusFilter !== 'all' ? bulkStatusFilter : undefined, feeStatus: bulkFeeStatus !== 'all' ? bulkFeeStatus : undefined },
      })
    },
    onSuccess: (res) => { toast({ title: `Sent to ${res.data.data?.sent ?? 0} students` }); setBulkMessage(''); qc.invalidateQueries({ queryKey: ['wa-logs'] }) },
    onError: () => toast({ title: 'Bulk send failed', variant: 'destructive' }),
  })

  const saveTemplates = useMutation({
    mutationFn: () => api.patch('/settings/whatsapp-templates', { branchId: user?.branchId, whatsappTemplates: templates }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wa-settings'] }); toast({ title: 'Templates saved' }) },
    onError: () => toast({ title: 'Failed to save templates', variant: 'destructive' }),
  })

  // Force logout — only way to disconnect
  const forceLogout = useMutation({
    mutationFn: () => api.post('/whatsapp/logout'),
    onSuccess: () => {
      toast({ title: 'WhatsApp disconnected', description: 'Click Connect to scan QR and reconnect.' })
      qc.invalidateQueries({ queryKey: ['wa-status'] })
      refetchStatus()
    },
    onError: (e: unknown) => toast({ title: 'Logout failed', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  // Connect / Reconnect — generates a fresh QR
  const connectWa = useMutation({
    mutationFn: () => api.post('/whatsapp/reconnect'),
    onSuccess: () => {
      toast({ title: 'Starting WhatsApp...', description: 'QR code will appear in a few seconds.' })
      // Poll aggressively after connect to catch QR quickly
      const polls = [2000, 4000, 6000, 8000, 12000, 18000]
      polls.forEach(ms => setTimeout(() => refetchStatus(), ms))
    },
    onError: (e: unknown) => toast({ title: 'Connect failed', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  // Manual QR refresh — only when user clicks the button
  const refreshQr = useMutation({
    mutationFn: () => api.post('/whatsapp/reconnect'),
    onSuccess: () => {
      toast({ title: 'Generating new QR...', description: 'New QR will appear in a few seconds.' })
      const polls = [2000, 4000, 6000, 8000]
      polls.forEach(ms => setTimeout(() => refetchStatus(), ms))
    },
    onError: () => toast({ title: 'Failed to refresh QR', variant: 'destructive' }),
  })

  const logsList = logs?.data ?? []
  const pagination = logs?.pagination
  const statusBadge = (s: string) => ({ sent: 'bg-green-100 text-green-800', delivered: 'bg-green-100 text-green-800', failed: 'bg-red-100 text-red-800', queued: 'bg-yellow-100 text-yellow-800' }[s] ?? 'bg-gray-100 text-gray-600')
  const DEFAULT_TEMPLATE_KEYS = ['admission', 'payment_reminder', 'payment_received', 'fee_due', 'notice']

  return (
    <div>
      <Header title="WhatsApp" />
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">

        {/* ── CONNECTION CARD ── */}
        <Card className={status?.ready ? 'border-green-200 bg-green-50' : 'border-gray-200'}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-3">
                {status?.ready
                  ? <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center"><Wifi className="w-5 h-5 text-green-600" /></div>
                  : <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center"><WifiOff className="w-5 h-5 text-gray-400" /></div>
                }
                <div>
                  <p className={`font-semibold text-base ${status?.ready ? 'text-green-800' : 'text-gray-700'}`}>
                    {status?.ready ? 'WhatsApp Connected' : status?.initializing ? 'Starting...' : status?.qrAvailable ? 'Scan QR to Connect' : 'Not Connected'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {status?.ready
                      ? 'All notifications will be delivered via WhatsApp'
                      : status?.qrAvailable
                        ? 'Open WhatsApp on your phone and scan the QR below'
                        : 'Click Connect to link your WhatsApp account'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500" onClick={() => refetchStatus()}>
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </Button>
                {status?.ready ? (
                  <Button variant="outline" size="sm" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => { if (confirm('Force disconnect WhatsApp? You will need to scan QR again to reconnect.')) forceLogout.mutate() }}
                    disabled={forceLogout.isPending}>
                    {forceLogout.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                    Force Logout
                  </Button>
                ) : (
                  <Button size="sm" className="gap-1.5"
                    onClick={() => connectWa.mutate()}
                    disabled={connectWa.isPending || status?.initializing}>
                    {(connectWa.isPending || status?.initializing)
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Starting...</>
                      : <><RotateCcw className="w-3.5 h-3.5" /> Connect WhatsApp</>}
                  </Button>
                )}
              </div>
            </div>

            {/* QR Code — shown when available, stable until scanned */}
            {!status?.ready && status?.qrAvailable && (
              <div className="border border-gray-200 rounded-2xl p-6 bg-white">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* QR Image */}
                  <div className="flex-shrink-0">
                    {status.qrDataUrl ? (
                      <div className="relative">
                        <img
                          src={status.qrDataUrl}
                          alt="WhatsApp QR Code"
                          className={`w-52 h-52 rounded-xl border-2 border-gray-200 ${status.qrExpired ? 'opacity-30 blur-sm' : ''}`}
                        />
                        {status.qrExpired && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                            <AlertTriangle className="w-8 h-8 text-orange-500" />
                            <p className="text-sm font-semibold text-orange-700">QR Expired</p>
                            <Button size="sm" variant="outline" className="gap-1.5 bg-white"
                              onClick={() => refreshQr.mutate()} disabled={refreshQr.isPending}>
                              {refreshQr.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                              Get New QR
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-52 h-52 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                        <p className="text-xs text-gray-400">Generating QR...</p>
                      </div>
                    )}
                  </div>

                  {/* Instructions */}
                  <div className="flex-1 space-y-3">
                    <p className="font-semibold text-gray-800">How to connect:</p>
                    <ol className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                        Open <strong>WhatsApp</strong> on your phone
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                        Tap <strong>Menu (3 dots) → Linked Devices → Link a Device</strong>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                        Point your camera at the QR code
                      </li>
                    </ol>
                    <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
                      <p className="font-semibold mb-1">QR stays stable until scanned.</p>
                      <p>If it expires before you scan, click <strong>Get New QR</strong>.</p>
                      <p className="mt-1">Once connected, WhatsApp stays logged in until you click <strong>Force Logout</strong>.</p>
                    </div>
                    {!status.qrExpired && (
                      <Button variant="outline" size="sm" className="gap-1.5 text-gray-500"
                        onClick={() => refreshQr.mutate()} disabled={refreshQr.isPending}>
                        {refreshQr.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Refresh QR manually
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Initializing state */}
            {!status?.ready && !status?.qrAvailable && (status?.initializing || connectWa.isPending) && (
              <div className="border border-blue-200 rounded-2xl p-6 bg-blue-50 flex items-center gap-4">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin flex-shrink-0" />
                <div>
                  <p className="font-semibold text-blue-800">Starting WhatsApp...</p>
                  <p className="text-sm text-blue-600 mt-0.5">This takes 5-15 seconds. QR will appear automatically.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── MESSAGING TABS ── */}
        <Tabs defaultValue="single">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
            <TabsList className="w-max min-w-full">
              <TabsTrigger value="single" className="gap-1.5 flex-1"><MessageSquare className="w-3.5 h-3.5" /> Single</TabsTrigger>
              <TabsTrigger value="bulk" className="gap-1.5 flex-1"><Users className="w-3.5 h-3.5" /> Bulk</TabsTrigger>
              <TabsTrigger value="templates" className="gap-1.5 flex-1"><FileText className="w-3.5 h-3.5" /> Templates</TabsTrigger>
              <TabsTrigger value="logs" className="flex-1">Logs</TabsTrigger>
            </TabsList>
          </div>

          {/* Single */}
          <TabsContent value="single" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Send to Single Number</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {!status?.ready && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-800">
                    WhatsApp is not connected. Connect first to send messages.
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Mobile Number</Label>
                  <Input placeholder="9876543210" value={mobile} onChange={e => setMobile(e.target.value)} maxLength={10} />
                </div>
                <div className="space-y-1.5">
                  <Label>Message</Label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5}
                    placeholder="Type your message... Supports *bold*, _italic_ formatting"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  <p className="text-xs text-gray-400">{message.length} characters</p>
                </div>
                <Button className="w-full gap-2" onClick={() => send.mutate()}
                  disabled={send.isPending || !mobile || !message || mobile.length !== 10 || !status?.ready}>
                  {send.isPending ? 'Sending...' : <><Send className="w-4 h-4" /> Send Message</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bulk */}
          <TabsContent value="bulk" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Broadcast to Students</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Rate limited to 1 message per 2 seconds.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {!status?.ready && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-800">
                    WhatsApp is not connected. Connect first to send messages.
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Student Status</Label>
                    <select value={bulkStatusFilter} onChange={e => setBulkStatusFilter(e.target.value as 'active' | 'all')}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                      <option value="active">Active only</option>
                      <option value="all">All students</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fee Status</Label>
                    <select value={bulkFeeStatus} onChange={e => setBulkFeeStatus(e.target.value as 'all' | 'due' | 'overdue' | 'clear')}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                      <option value="all">All</option>
                      <option value="due">Due</option>
                      <option value="overdue">Overdue</option>
                      <option value="clear">Clear</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Message</Label>
                  <textarea value={bulkMessage} onChange={e => setBulkMessage(e.target.value)} rows={5}
                    placeholder="Broadcast message..."
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
                <Button className="w-full gap-2" variant="destructive"
                  onClick={() => { if (confirm('Send to filtered students?')) sendBulk.mutate() }}
                  disabled={sendBulk.isPending || !bulkMessage || !status?.ready}>
                  {sendBulk.isPending ? 'Sending...' : <><Users className="w-4 h-4" /> Send Broadcast</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates */}
          <TabsContent value="templates" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Message Templates</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Custom templates for automated notifications.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {DEFAULT_TEMPLATE_KEYS.map(key => (
                  <div key={key} className="space-y-1.5">
                    <Label className="capitalize">{key.replace(/_/g, ' ')}</Label>
                    <textarea value={templates[key] ?? ''} onChange={e => setTemplates(t => ({ ...t, [key]: e.target.value }))}
                      rows={3} placeholder={`Template for ${key.replace(/_/g, ' ')}...`}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                ))}
                <Button className="w-full gap-2" onClick={() => saveTemplates.mutate()} disabled={saveTemplates.isPending}>
                  {saveTemplates.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Templates</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs */}
          <TabsContent value="logs" className="mt-4">
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <select value={logsStatusFilter} onChange={e => { setLogsStatusFilter(e.target.value); setPage(1) }}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                      <option value="">All</option>
                      <option value="sent">Sent</option>
                      <option value="failed">Failed</option>
                      <option value="queued">Queued</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Start Date</Label>
                    <Input type="date" value={logsStartDate} onChange={e => { setLogsStartDate(e.target.value); setPage(1) }} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">End Date</Label>
                    <Input type="date" value={logsEndDate} onChange={e => { setLogsEndDate(e.target.value); setPage(1) }} />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Recipient</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Template</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logsLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i} className="border-b">
                            {Array.from({ length: 4 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}
                          </tr>
                        ))
                      ) : logsList.length === 0 ? (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No messages sent yet</td></tr>
                      ) : (
                        logsList.map((log: { id: string; recipientMobile: string; templateName: string; status: string; sentAt: string; errorMessage?: string; student?: { name: string; studentId: string } }) => (
                          <tr key={log.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="font-medium">{log.recipientMobile}</p>
                              {log.student && <p className="text-xs text-gray-400">{log.student.name}</p>}
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500 font-mono">{log.templateName}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(log.status)}`}>{log.status}</span>
                              {log.errorMessage && <p className="text-xs text-red-500 mt-0.5 max-w-[200px] truncate">{log.errorMessage}</p>}
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">{formatDateTime(log.sentAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <p className="text-sm text-gray-500">Page {page} of {pagination.totalPages}</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={!pagination.hasPrev} onClick={() => setPage(p => p - 1)}>Previous</Button>
                      <Button variant="outline" size="sm" disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
