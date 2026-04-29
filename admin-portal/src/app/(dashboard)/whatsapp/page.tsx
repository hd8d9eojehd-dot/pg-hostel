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
import { Send, Wifi, WifiOff, RefreshCw, Users, MessageSquare, FileText, Save, Loader2, QrCode, LogOut, RotateCcw } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

export default function WhatsAppPage() {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [mobile, setMobile] = useState('')
  const [message, setMessage] = useState('')
  const [bulkMessage, setBulkMessage] = useState('')
  const [page, setPage] = useState(1)

  // Component that fetches QR image from backend (avoids client-side canvas issues)
  function WhatsAppQrImage() {
    const { data: qrData, isLoading } = useQuery({
      queryKey: ['wa-qr-image'],
      queryFn: () => api.get('/whatsapp/qr-image').then(r => r.data.data),
      refetchInterval: 18000, // refresh every 18s (QR expires at 20s)
      staleTime: 0,
    })
    if (isLoading) return <div className="w-[min(220px,80vw)] aspect-square bg-gray-100 rounded-xl animate-pulse flex items-center justify-center"><QrCode className="w-8 h-8 text-gray-300" /></div>
    if (!qrData?.dataUrl) return <div className="w-[min(220px,80vw)] aspect-square bg-gray-100 rounded-xl flex items-center justify-center text-xs text-gray-400">QR loading...</div>
    return <img src={qrData.dataUrl} alt="WhatsApp QR Code" className="rounded-xl border shadow-sm w-[min(220px,80vw)] aspect-square" />
  }

  // Bulk filters
  const [bulkStatusFilter, setBulkStatusFilter] = useState<'active' | 'all'>('active')
  const [bulkFeeStatus, setBulkFeeStatus] = useState<'all' | 'due' | 'overdue' | 'clear'>('all')

  // Logs filters
  const [logsStatusFilter, setLogsStatusFilter] = useState('')
  const [logsStartDate, setLogsStartDate] = useState('')
  const [logsEndDate, setLogsEndDate] = useState('')

  // Templates state
  const [templates, setTemplates] = useState<Record<string, string>>({})
  const [templatesLoaded, setTemplatesLoaded] = useState(false)

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ['wa-status'],
    queryFn: () => api.get('/whatsapp/status').then(r => r.data.data),
    refetchInterval: (query) => {
      // Poll every 5s while waiting for QR scan, 30s once connected
      const data = query.state.data as { ready?: boolean } | undefined
      return data?.ready ? 30000 : 5000
    },
  })

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['wa-logs', page, logsStatusFilter, logsStartDate, logsEndDate],
    queryFn: () => api.get('/whatsapp/logs', {
      params: {
        page,
        limit: 20,
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

  // Initialize templates from settings when loaded
  const settingsTemplates = (settingsData as { whatsappTemplates?: Record<string, string> } | undefined)?.whatsappTemplates
  if (!templatesLoaded && settingsTemplates) {
    setTemplates(settingsTemplates)
    setTemplatesLoaded(true)
  }

  const send = useMutation({
    mutationFn: () => api.post('/whatsapp/send', { mobile, message }),
    onSuccess: () => {
      toast({ title: '✓ Message sent' })
      setMobile('')
      setMessage('')
      qc.invalidateQueries({ queryKey: ['wa-logs'] })
    },
    onError: (e: unknown) => toast({ title: 'Failed', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  const sendBulk = useMutation({
    mutationFn: async () => {
      const params: Record<string, string> = { limit: '200' }
      if (bulkStatusFilter !== 'all') params['status'] = bulkStatusFilter
      const res = await api.get('/students', { params })
      const students = res.data.students ?? []

      const messages = students.map((s: { id: string; mobile: string }) => ({
        mobile: s.mobile,
        message: bulkMessage,
        studentId: s.id,
      }))
      return api.post('/whatsapp/send-bulk', {
        messages,
        filter: {
          message: bulkMessage,
          status: bulkStatusFilter !== 'all' ? bulkStatusFilter : undefined,
          feeStatus: bulkFeeStatus !== 'all' ? bulkFeeStatus : undefined,
        },
      })
    },
    onSuccess: (res) => {
      toast({ title: `✓ Sent to ${res.data.data?.sent ?? 0} students` })
      setBulkMessage('')
      qc.invalidateQueries({ queryKey: ['wa-logs'] })
    },
    onError: () => toast({ title: 'Bulk send failed', variant: 'destructive' }),
  })

  const saveTemplates = useMutation({
    mutationFn: () => api.patch('/settings/whatsapp-templates', {
      branchId: user?.branchId,
      whatsappTemplates: templates,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa-settings'] })
      toast({ title: '✓ Templates saved' })
    },
    onError: () => toast({ title: 'Failed to save templates', variant: 'destructive' }),
  })

  const logoutWa = useMutation({
    mutationFn: () => api.post('/whatsapp/logout'),
    onSuccess: () => {
      toast({ title: '✓ WhatsApp logged out', description: 'Use Reconnect to scan a new QR code.' })
      qc.invalidateQueries({ queryKey: ['wa-status'] })
      refetchStatus()
    },
    onError: (e: unknown) => toast({ title: 'Logout failed', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  const reconnectWa = useMutation({
    mutationFn: () => api.post('/whatsapp/reconnect'),
    onSuccess: () => {
      toast({ title: '✓ Reconnecting...', description: 'QR code will appear shortly. Click Refresh.' })
      // Poll more aggressively after reconnect
      setTimeout(() => refetchStatus(), 3000)
      setTimeout(() => refetchStatus(), 8000)
    },
    onError: (e: unknown) => toast({ title: 'Reconnect failed', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  const logsList = logs?.data ?? []
  const pagination = logs?.pagination

  const statusColor = (s: string) => ({
    sent: 'bg-green-100 text-green-800', delivered: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800', queued: 'bg-yellow-100 text-yellow-800',
  }[s] ?? 'bg-gray-100 text-gray-600')

  const DEFAULT_TEMPLATE_KEYS = ['admission', 'payment_reminder', 'payment_received', 'fee_due', 'notice']

  return (
    <div>
      <Header title="WhatsApp" />
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">

        {/* Connection status */}
        <Card className={status?.ready ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                {status?.ready ? <Wifi className="w-5 h-5 text-green-600" /> : <WifiOff className="w-5 h-5 text-red-500" />}
                <div>
                  <p className={`font-semibold ${status?.ready ? 'text-green-800' : 'text-red-800'}`}>
                    {status?.ready ? 'WhatsApp Connected' : status?.qrAvailable ? 'Scan QR to Connect' : 'WhatsApp Disconnected'}
                  </p>
                  {!status?.ready && !status?.qrAvailable && (
                    <p className="text-xs text-red-600 mt-0.5">
                      Starting WhatsApp... QR code will appear here shortly.
                    </p>
                  )}
                  {status?.ready && (
                    <p className="text-xs text-green-600 mt-0.5">Messages will be delivered in real time.</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => refetchStatus()}>
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </Button>
                {status?.ready && (
                  <Button variant="outline" size="sm" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => { if (confirm('Log out WhatsApp? You will need to scan QR again.')) logoutWa.mutate() }}
                    disabled={logoutWa.isPending}>
                    {logoutWa.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                    Logout WhatsApp
                  </Button>
                )}
                {!status?.ready && (
                  <Button variant="outline" size="sm" className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={() => reconnectWa.mutate()}
                    disabled={reconnectWa.isPending}>
                    {reconnectWa.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    Reconnect
                  </Button>
                )}
              </div>
            </div>

            {/* QR Code panel — shown when WhatsApp needs to be linked */}
            {!status?.ready && status?.qrAvailable && status?.qr && (
              <div className="mt-4 flex flex-col items-center gap-3 p-4 bg-white rounded-xl border border-red-200">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <QrCode className="w-4 h-4" /> Scan with WhatsApp to link this device
                </div>
                <WhatsAppQrImage />
                <div className="text-xs text-gray-500 text-center space-y-1">
                  <p>1. Open WhatsApp on your phone</p>
                  <p>2. Tap <strong>⋮ Menu → Linked Devices → Link a Device</strong></p>
                  <p>3. Point your camera at the QR code above</p>
                  <p className="text-orange-600 font-medium">QR refreshes every 20 seconds — click Refresh if it expires</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="single">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
            <TabsList className="w-max min-w-full">
              <TabsTrigger value="single" className="gap-1.5 flex-1"><MessageSquare className="w-3.5 h-3.5" /> Single</TabsTrigger>
              <TabsTrigger value="bulk" className="gap-1.5 flex-1"><Users className="w-3.5 h-3.5" /> Bulk</TabsTrigger>
              <TabsTrigger value="templates" className="gap-1.5 flex-1"><FileText className="w-3.5 h-3.5" /> Templates</TabsTrigger>
              <TabsTrigger value="logs" className="flex-1">Logs</TabsTrigger>
            </TabsList>
          </div>

          {/* Single message */}
          <TabsContent value="single" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Send to Single Number</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Mobile Number</Label>
                  <Input placeholder="9876543210" value={mobile} onChange={e => setMobile(e.target.value)} maxLength={10} />
                  <p className="text-xs text-gray-400">10-digit Indian mobile number</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Message</Label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5}
                    placeholder="Type your message...&#10;&#10;Supports *bold*, _italic_ WhatsApp formatting"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  <p className="text-xs text-gray-400">{message.length} characters</p>
                </div>
                <Button className="w-full gap-2" onClick={() => send.mutate()}
                  disabled={send.isPending || !mobile || !message || mobile.length !== 10}>
                  {send.isPending ? 'Sending...' : <><Send className="w-4 h-4" /> Send Message</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bulk message */}
          <TabsContent value="bulk" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Broadcast to Students</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Filter students and send a broadcast message. Rate limited to 1 message per 2 seconds.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Student Status</Label>
                    <select
                      value={bulkStatusFilter}
                      onChange={e => setBulkStatusFilter(e.target.value as 'active' | 'all')}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="active">Active only</option>
                      <option value="all">All students</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fee Status</Label>
                    <select
                      value={bulkFeeStatus}
                      onChange={e => setBulkFeeStatus(e.target.value as 'all' | 'due' | 'overdue' | 'clear')}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="all">All fee statuses</option>
                      <option value="due">Due</option>
                      <option value="overdue">Overdue</option>
                      <option value="clear">Clear (paid)</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
                  ⚠️ This will send to filtered students. Use carefully.
                </div>
                <div className="space-y-1.5">
                  <Label>Message</Label>
                  <textarea value={bulkMessage} onChange={e => setBulkMessage(e.target.value)} rows={6}
                    placeholder="Type your broadcast message...&#10;&#10;Tip: Use *bold* for important text"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  <p className="text-xs text-gray-400">{bulkMessage.length} characters</p>
                </div>
                <Button className="w-full gap-2" variant="destructive" onClick={() => {
                  if (confirm('Send this message to filtered students?')) sendBulk.mutate()
                }} disabled={sendBulk.isPending || !bulkMessage}>
                  {sendBulk.isPending ? 'Sending...' : <><Users className="w-4 h-4" /> Send to Filtered Students</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates tab */}
          <TabsContent value="templates" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Message Templates</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Edit the default message templates used for automated notifications.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {DEFAULT_TEMPLATE_KEYS.map(key => (
                  <div key={key} className="space-y-1.5">
                    <Label className="capitalize">{key.replace(/_/g, ' ')}</Label>
                    <textarea
                      value={templates[key] ?? ''}
                      onChange={e => setTemplates(t => ({ ...t, [key]: e.target.value }))}
                      rows={3}
                      placeholder={`Template for ${key.replace(/_/g, ' ')} message...`}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                ))}

                {/* Custom template keys from settings */}
                {Object.keys(templates).filter(k => !DEFAULT_TEMPLATE_KEYS.includes(k)).map(key => (
                  <div key={key} className="space-y-1.5">
                    <Label className="capitalize">{key.replace(/_/g, ' ')}</Label>
                    <textarea
                      value={templates[key] ?? ''}
                      onChange={e => setTemplates(t => ({ ...t, [key]: e.target.value }))}
                      rows={3}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                ))}

                <Button className="w-full gap-2" onClick={() => saveTemplates.mutate()} disabled={saveTemplates.isPending}>
                  {saveTemplates.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                    : <><Save className="w-4 h-4" /> Save Templates</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs */}
          <TabsContent value="logs" className="mt-4">
            {/* Log filters */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <select
                      value={logsStatusFilter}
                      onChange={e => { setLogsStatusFilter(e.target.value); setPage(1) }}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">All statuses</option>
                      <option value="sent">Sent</option>
                      <option value="delivered">Delivered</option>
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
                            {Array.from({ length: 4 }).map((_, j) => (
                              <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                            ))}
                          </tr>
                        ))
                      ) : logsList.length === 0 ? (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No messages sent yet</td></tr>
                      ) : (
                        logsList.map((log: {
                          id: string; recipientMobile: string; templateName: string
                          status: string; sentAt: string; errorMessage?: string
                          student?: { name: string; studentId: string }
                        }) => (
                          <tr key={log.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="font-medium">{log.recipientMobile}</p>
                              {log.student && <p className="text-xs text-gray-400">{log.student.name}</p>}
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500 font-mono">{log.templateName}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(log.status)}`}>
                                {log.status}
                              </span>
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
