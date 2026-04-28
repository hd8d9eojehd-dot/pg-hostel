'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { ArrowLeft, Plus, Loader2, UserCog, Shield, User } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export default function StaffPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', mobile: '', role: 'staff', password: '' })
  const [showPassword, setShowPassword] = useState(false)

  const { data: admins, isLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: () => api.get('/settings/admins').then(r => r.data.data),
  })

  const create = useMutation({
    mutationFn: () => api.post('/auth/admin/create', { ...form, branchId: user?.branchId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admins'] })
      toast({ title: `✓ ${form.name} added as ${form.role.replace('_', ' ')}` })
      setOpen(false)
      setForm({ name: '', email: '', mobile: '', role: 'staff', password: '' })
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create staff'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    },
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/settings/admins/${id}`, { isActive }),
    onSuccess: (_, { isActive }) => {
      qc.invalidateQueries({ queryKey: ['admins'] })
      toast({ title: isActive ? 'Account activated' : 'Account deactivated' })
    },
  })

  const isSuperAdmin = user?.role === 'super_admin'
  const nonSuperAdmins = (admins ?? []).filter((a: { role: string }) => a.role !== 'super_admin')
  const canAddMore = nonSuperAdmins.length < 2

  return (
    <div>
      <Header title="Staff Management" />
      <div className="p-4 md:p-6 space-y-4 max-w-3xl">
        <div className="flex items-center justify-between">
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Settings
            </Button>
          </Link>
          {isSuperAdmin && (
            <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)} disabled={!canAddMore}>
              <Plus className="w-3.5 h-3.5" /> Add Staff
              {!canAddMore && <span className="text-xs opacity-70">(max 2)</span>}
            </Button>
          )}
        </div>

        {/* Staff list */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Staff Member</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Last Login</th>
                    {isSuperAdmin && <th className="text-right px-4 py-3 font-medium text-gray-600">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  ) : (admins ?? []).length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No staff members yet</td></tr>
                  ) : (
                    (admins ?? []).map((a: {
                      id: string; name: string; email: string; mobile: string
                      role: string; isActive: boolean; lastLogin?: string
                    }) => (
                      <tr key={a.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              a.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {a.role === 'super_admin' ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="font-medium">{a.name}</p>
                              <p className="text-xs text-gray-500">{a.mobile}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-gray-600 text-xs">{a.email}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            a.role === 'super_admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {a.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            a.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {a.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">
                          {a.lastLogin ? formatDate(a.lastLogin) : 'Never'}
                        </td>
                        {isSuperAdmin && (
                          <td className="px-4 py-3 text-right">
                            {a.id !== user?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className={a.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                                onClick={() => toggleActive.mutate({ id: a.id, isActive: !a.isActive })}
                                disabled={toggleActive.isPending}
                              >
                                {a.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Staff Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-primary" /> Add Staff Member
            </DialogTitle>
          </DialogHeader>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 mb-2">
            ℹ️ You can add up to 2 additional staff/admin accounts ({nonSuperAdmins.length}/2 used)
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Staff member name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="staff@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mobile <span className="text-destructive">*</span></Label>
              <Input
                value={form.mobile}
                onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                placeholder="9876543210"
                maxLength={10}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'staff', label: 'Staff', desc: 'Limited access', icon: '👤' },
                  { value: 'super_admin', label: 'Super Admin', desc: 'Full access', icon: '🛡️' },
                ].map(({ value, label, desc, icon }) => (
                  <label key={value} className="cursor-pointer">
                    <input type="radio" name="role" value={value} checked={form.role === value}
                      onChange={() => setForm(f => ({ ...f, role: value }))} className="sr-only" />
                    <div className={`p-3 rounded-xl border-2 transition-colors ${
                      form.role === value ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <p className="text-sm font-medium">{icon} {label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Temporary Password <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min 8 characters"
                  className="pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-xs text-gray-400">Staff must change this on first login</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => create.mutate()}
              disabled={create.isPending || !form.name || !form.email || !form.password || form.mobile.length !== 10}
            >
              {create.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : 'Add Staff Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
