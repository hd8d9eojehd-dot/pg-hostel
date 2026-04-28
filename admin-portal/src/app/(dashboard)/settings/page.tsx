'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { Save, Users, Building2, IndianRupee, Loader2, Mail } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data: settings } = useQuery({
    queryKey: ['settings', user?.branchId],
    queryFn: () => api.get('/settings', { params: { branchId: user?.branchId } }).then(r => r.data.data),
    enabled: !!user?.branchId,
  })

  const { data: branch } = useQuery({
    queryKey: ['branch', user?.branchId],
    queryFn: () => api.get(`/settings/branch/${user?.branchId}`).then(r => r.data.data),
    enabled: !!user?.branchId,
  })

  const [feeForm, setFeeForm] = useState({ lateFeeType: 'flat', lateFeeAmount: 500, gracePeriodDays: 7, depositPolicy: '', autoInvoiceEnabled: true })
  const [branchForm, setBranchForm] = useState({ name: '', address: '', city: '', state: '', pincode: '', contactPrimary: '', contactSecondary: '', email: '' })
  const [emailForm, setEmailForm] = useState({ newEmail: '', password: '' })

  useEffect(() => {
    if (settings) setFeeForm({ lateFeeType: settings.lateFeeType ?? 'flat', lateFeeAmount: Number(settings.lateFeeAmount ?? 500), gracePeriodDays: settings.gracePeriodDays ?? 7, depositPolicy: settings.depositPolicy ?? '', autoInvoiceEnabled: settings.autoInvoiceEnabled ?? true })
  }, [settings])

  useEffect(() => {
    if (branch) setBranchForm({ name: branch.name ?? '', address: branch.address ?? '', city: branch.city ?? '', state: branch.state ?? '', pincode: branch.pincode ?? '', contactPrimary: branch.contactPrimary ?? '', contactSecondary: branch.contactSecondary ?? '', email: branch.email ?? '' })
  }, [branch])

  const saveFee = useMutation({
    mutationFn: () => api.post('/settings', { ...feeForm, branchId: user?.branchId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast({ title: '✓ Fee settings saved' }) },
    onError: () => toast({ title: 'Failed', variant: 'destructive' }),
  })

  const saveBranch = useMutation({
    mutationFn: () => api.patch(`/settings/branch/${user?.branchId}`, branchForm),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['branch'] })
      toast({ title: `✓ ${res.data.message ?? 'Branch updated'}` })
      // Update page title immediately
      document.title = `${branchForm.name} Admin`
    },
    onError: () => toast({ title: 'Failed', variant: 'destructive' }),
  })

  const changeEmail = useMutation({
    mutationFn: () => api.patch(`/settings/admins/${user?.id}/email`, emailForm),
    onSuccess: () => { toast({ title: '✓ Email updated. Please login again.' }); setEmailForm({ newEmail: '', password: '' }) },
    onError: (e: unknown) => toast({ title: 'Failed', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  return (
    <div>
      <Header title="Settings" />
      <div className="p-4 md:p-6 max-w-2xl">
        <Tabs defaultValue="branch">
          <TabsList className="mb-6 w-full">
            <TabsTrigger value="branch" className="flex-1 gap-1.5"><Building2 className="w-3.5 h-3.5" /> PG Info</TabsTrigger>
            <TabsTrigger value="fee" className="flex-1 gap-1.5"><IndianRupee className="w-3.5 h-3.5" /> Fee Policy</TabsTrigger>
            <TabsTrigger value="staff" className="flex-1 gap-1.5"><Users className="w-3.5 h-3.5" /> Staff</TabsTrigger>
            {user?.role === 'super_admin' && (
              <TabsTrigger value="account" className="flex-1 gap-1.5"><Mail className="w-3.5 h-3.5" /> Account</TabsTrigger>
            )}
          </TabsList>

          {/* Branch / PG Info */}
          <TabsContent value="branch">
            <Card>
              <CardHeader><CardTitle className="text-base">PG Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>PG Name <span className="text-xs text-gray-400">(reflects everywhere instantly)</span></Label>
                  <Input value={branchForm.name} onChange={e => setBranchForm(f => ({ ...f, name: e.target.value }))} placeholder="Sunrise PG" />
                </div>
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Textarea value={branchForm.address} onChange={e => setBranchForm(f => ({ ...f, address: e.target.value }))} rows={2} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5"><Label>City</Label><Input value={branchForm.city} onChange={e => setBranchForm(f => ({ ...f, city: e.target.value }))} /></div>
                  <div className="space-y-1.5"><Label>State</Label><Input value={branchForm.state} onChange={e => setBranchForm(f => ({ ...f, state: e.target.value }))} /></div>
                  <div className="space-y-1.5"><Label>Pincode</Label><Input value={branchForm.pincode} onChange={e => setBranchForm(f => ({ ...f, pincode: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Primary Contact</Label><Input value={branchForm.contactPrimary} onChange={e => setBranchForm(f => ({ ...f, contactPrimary: e.target.value }))} /></div>
                  <div className="space-y-1.5"><Label>Secondary Contact</Label><Input value={branchForm.contactSecondary} onChange={e => setBranchForm(f => ({ ...f, contactSecondary: e.target.value }))} /></div>
                </div>
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={branchForm.email} onChange={e => setBranchForm(f => ({ ...f, email: e.target.value }))} /></div>
                {user?.role === 'super_admin' ? (
                  <Button onClick={() => saveBranch.mutate()} disabled={saveBranch.isPending} className="w-full gap-2">
                    {saveBranch.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save PG Info</>}
                  </Button>
                ) : <p className="text-xs text-gray-400 text-center">Only super admin can edit PG info</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fee Policy */}
          <TabsContent value="fee">
            <Card>
              <CardHeader><CardTitle className="text-base">Fee & Invoice Policy</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Late Fee Type</Label>
                    <select value={feeForm.lateFeeType} onChange={e => setFeeForm(f => ({ ...f, lateFeeType: e.target.value }))} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                      <option value="flat">Flat Amount (₹)</option>
                      <option value="percentage">Percentage (%)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Late Fee {feeForm.lateFeeType === 'flat' ? 'Amount (₹)' : 'Percentage (%)'}</Label>
                    <Input type="number" value={feeForm.lateFeeAmount} onChange={e => setFeeForm(f => ({ ...f, lateFeeAmount: Number(e.target.value) }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Grace Period (days)</Label>
                  <Input type="number" min={0} max={30} value={feeForm.gracePeriodDays} onChange={e => setFeeForm(f => ({ ...f, gracePeriodDays: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Deposit Policy</Label>
                  <Textarea value={feeForm.depositPolicy} onChange={e => setFeeForm(f => ({ ...f, depositPolicy: e.target.value }))} rows={3} />
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <input type="checkbox" id="autoInvoice" checked={feeForm.autoInvoiceEnabled} onChange={e => setFeeForm(f => ({ ...f, autoInvoiceEnabled: e.target.checked }))} className="w-4 h-4 rounded accent-primary" />
                  <div>
                    <Label htmlFor="autoInvoice" className="cursor-pointer">Auto-generate monthly invoices</Label>
                    <p className="text-xs text-gray-400 mt-0.5">Creates rent invoices on 1st of each month</p>
                  </div>
                </div>
                <Button onClick={() => saveFee.mutate()} disabled={saveFee.isPending} className="w-full gap-2">
                  {saveFee.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Fee Settings</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff */}
          <TabsContent value="staff">
            <Card>
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto"><Users className="w-7 h-7 text-primary" /></div>
                <div><h3 className="font-semibold">Staff Management</h3><p className="text-sm text-gray-500 mt-1">Add, edit, and manage staff accounts</p></div>
                <Link href="/settings/staff"><Button className="gap-2"><Users className="w-4 h-4" /> Manage Staff</Button></Link>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account (super admin only) */}
          {user?.role === 'super_admin' && (
            <TabsContent value="account">
              <Card>
                <CardHeader><CardTitle className="text-base">Change Admin Email</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
                    ⚠️ After changing email, you'll need to login again with the new email.
                  </div>
                  <div className="space-y-1.5">
                    <Label>New Email Address</Label>
                    <Input type="email" value={emailForm.newEmail} onChange={e => setEmailForm(f => ({ ...f, newEmail: e.target.value }))} placeholder="new@email.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Current Password (to verify)</Label>
                    <Input type="password" value={emailForm.password} onChange={e => setEmailForm(f => ({ ...f, password: e.target.value }))} placeholder="Your current password" />
                  </div>
                  <Button onClick={() => changeEmail.mutate()} disabled={changeEmail.isPending || !emailForm.newEmail || !emailForm.password} className="w-full gap-2">
                    {changeEmail.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : <><Mail className="w-4 h-4" /> Update Email</>}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
