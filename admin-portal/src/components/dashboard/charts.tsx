'use client'
// PERF FIX: This component is lazy-loaded — recharts only loads when charts are visible
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BedDouble, TrendingUp } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'

const PIE_COLORS: Record<string, string> = {
  available: '#22c55e',
  occupied: '#ef4444',
  partial: '#f59e0b',
  maintenance: '#f97316',
  blocked: '#6b7280',
}

interface Props {
  monthlyRevenue: Array<{ month: string; amount: number }>
  occupancy: Array<{ status: string; _count: number }>
}

export default function DashboardCharts({ monthlyRevenue, occupancy }: Props) {
  const pieData = occupancy.map(o => ({ name: o.status, value: o._count }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-primary" /> Monthly Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyRevenue} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `Rs.${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="amount" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BedDouble className="w-4 h-4 text-primary" /> Room Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={PIE_COLORS[entry.name] ?? '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
