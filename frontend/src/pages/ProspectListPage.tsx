import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { DashboardHeader } from '../components/DashboardHeader'

interface Prospect {
  customer_id: string
  name: string
  phone: string
  monthly_inflow: number
  fixed_obligations: number
  credit_score: number
  lead_score: number
  repayment_capacity: number
  priority: string
  recommended_product?: string
  status?: string
}

export function ProspectListPage() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  useEffect(() => {
    fetch('/api/prospects')
      .then(r => r.json())
      .then(data => setProspects(data.prospects || []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = priorityFilter === 'all' 
    ? prospects 
    : prospects.filter(p => p.priority === priorityFilter)

  const highPriority = prospects.filter(p => p.priority === 'High').length
  const avgScore = prospects.length > 0
    ? (prospects.reduce((sum, p) => sum + (p.lead_score || 0), 0) / prospects.length).toFixed(1)
    : '—'

  const priorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      High: 'bg-red-50 text-red-700 border-red-200',
      Medium: 'bg-amber-50 text-amber-700 border-amber-200',
      Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    }
    return styles[priority] || 'bg-gray-50 text-gray-600 border-gray-200'
  }

  const lqiBadge = (score: number) => {
    if (score >= 70) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (score >= 40) return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-gray-50 text-gray-600 border-gray-200'
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <DashboardHeader title="Prospect Pipeline" subtitle="Lead Management" showNav />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">All Prospects</h2>
            <p className="text-slate-500 text-sm">{prospects.length} leads in pipeline</p>
          </div>
          <div className="flex gap-3">
            <Link to="/manager/dashboard">
              <Button variant="outline" size="sm" className="border-slate-300 text-slate-600">Dashboard</Button>
            </Link>
            <Link to="/manager/add">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">+ Add Prospects</Button>
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="bg-white border-slate-200">
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Total Leads</p>
              <p className="text-2xl font-bold text-slate-800">{loading ? '...' : prospects.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200">
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Avg LQI</p>
              <p className="text-2xl font-bold text-slate-800">{avgScore}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200">
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">High Priority</p>
              <p className="text-2xl font-bold text-red-600">{highPriority}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200">
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Pipeline Value</p>
              <p className="text-2xl font-bold text-slate-800">
                ₹{(prospects.reduce((s, p) => s + (p.repayment_capacity || 0), 0) / 100000).toFixed(1)}L
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-slate-500">Filter:</span>
          {['all', 'High', 'Medium', 'Low'].map(f => (
            <button
              key={f}
              onClick={() => setPriorityFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                priorityFilter === f
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>

        {/* Table */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-16 text-slate-400">Loading prospects...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-slate-400 mb-4">No prospects found</p>
                <Link to="/manager/add">
                  <Button className="bg-indigo-600 hover:bg-indigo-700">+ Add First Prospect</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      <th className="px-5 py-3">Prospect</th>
                      <th className="px-5 py-3">Contact</th>
                      <th className="px-5 py-3 text-right">Income</th>
                      <th className="px-5 py-3 text-center">LQI Score</th>
                      <th className="px-5 py-3 text-right">Capacity</th>
                      <th className="px-5 py-3 text-center">Priority</th>
                      <th className="px-5 py-3 text-center">Product</th>
                      <th className="px-5 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => (
                      <React.Fragment key={p.customer_id}>
                        <tr
                          className="border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors"
                          onClick={() => setExpanded(expanded === p.customer_id ? null : p.customer_id)}
                        >
                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-800">{p.name || '—'}</div>
                            <div className="text-xs text-slate-400">{p.customer_id}</div>
                          </td>
                          <td className="px-5 py-4 text-slate-600">{p.phone || '—'}</td>
                          <td className="px-5 py-4 text-right font-mono text-slate-700">
                            ₹{(p.monthly_inflow || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${lqiBadge(p.lead_score || 0)}`}>
                              {p.lead_score || '—'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right font-mono text-slate-700">
                            ₹{((p.repayment_capacity || 0) / 100000).toFixed(1)}L
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${priorityBadge(p.priority)}`}>
                              {p.priority || '—'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center text-xs text-slate-600">
                            {p.recommended_product || '—'}
                          </td>
                          <td className="px-5 py-4 text-slate-400">
                            <span className="text-lg">{expanded === p.customer_id ? '−' : '+'}</span>
                          </td>
                        </tr>
                        {expanded === p.customer_id && (
                          <tr className="bg-slate-50/60">
                            <td colSpan={8} className="px-5 py-4">
                              <div className="flex flex-wrap gap-8 text-sm">
                                <div className="min-w-[180px]">
                                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Credit</p>
                                  <div className="space-y-1 text-slate-700">
                                    <p>Credit Score: <span className="font-medium">{p.credit_score || '—'}</span></p>
                                    <p>Obligations: <span className="font-medium">₹{(p.fixed_obligations || 0).toLocaleString('en-IN')}</span></p>
                                  </div>
                                </div>
                                <div className="min-w-[180px]">
                                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Capacity</p>
                                  <div className="space-y-1 text-slate-700">
                                    <p>Max Loan: <span className="font-medium">₹{((p.repayment_capacity || 0) / 100000).toFixed(1)}L</span></p>
                                    <p>Product: <span className="font-medium">{p.recommended_product || '—'}</span></p>
                                  </div>
                                </div>
                                <div className="min-w-[180px]">
                                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Status</p>
                                  <div className="space-y-1 text-slate-700">
                                    <p>Status: <span className="font-medium">{p.status || 'New'}</span></p>
                                    <p>ID: <span className="font-mono text-xs">{p.customer_id}</span></p>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <footer className="bg-slate-800 text-slate-400 text-center py-4 text-xs border-t border-slate-700">
        IDBI Innovate 2026 — Prospect Assist AI
      </footer>
    </div>
  )
}
