import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { DashboardHeader } from '../components/DashboardHeader'

const API_URL = '/api'

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

  useEffect(() => {
    fetch('/leads')
      .then(r => r.json())
      .then(data => setProspects(data.prospects || data.leads || []))
      .finally(() => setLoading(false))
  }, [])

  const highPriority = prospects.filter(p => p.priority === 'High').length
  const avgScore = prospects.length > 0
    ? (prospects.reduce((sum, p) => sum + (p.lead_score || 0), 0) / prospects.filter(p => p.lead_score).length).toFixed(1)
    : '—'

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      <DashboardHeader title="All Prospects" subtitle="Prospect Management" showNav />

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-6">

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-blue-900">All Prospects</h2>
            <p className="text-gray-500 text-sm">{prospects.length} prospects uploaded</p>
          </div>
          <div className="flex gap-3">
            <a href="/manager/dashboard">
              <Button variant="outline" size="sm" className="border-blue-900 text-blue-900">Back to Dashboard</Button>
            </a>
            <a href="/manager/add">
              <Button size="sm" className="bg-blue-900 hover:bg-blue-800">+ Add Prospects</Button>
            </a>
          </div>
        </div>

        {/* Mini KPIs */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="pt-4">
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Total</p>
              <p className="text-2xl font-bold text-blue-900">{loading ? '—' : prospects.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="pt-4">
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Avg Score</p>
              <p className="text-2xl font-bold text-blue-900">{avgScore}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="pt-4">
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">High Priority</p>
              <p className="text-2xl font-bold text-orange-600">{highPriority}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-gray-200">
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : prospects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">No prospects yet</p>
                <a href="/manager/add">
                  <Button className="bg-blue-900 hover:bg-blue-800">+ Add First Prospect</Button>
                </a>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-blue-50 text-left text-xs font-semibold text-blue-900 uppercase tracking-wide">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3 text-right">Income</th>
                    <th className="px-4 py-3 text-center">LQI</th>
                    <th className="px-4 py-3 text-right">Max Loan</th>
                    <th className="px-4 py-3 text-center">Priority</th>
                    <th className="px-4 py-3 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {prospects.map((p, i) => (
                    <React.Fragment key={p.customer_id}>
                      <tr
                        className="border-t border-gray-100 hover:bg-blue-50/50 cursor-pointer"
                        onClick={() => setExpanded(expanded === p.customer_id ? null : p.customer_id)}
                      >
                        <td className="px-4 py-3 font-medium text-gray-800">{p.name || p.customer_id}</td>
                        <td className="px-4 py-3 text-gray-600">{p.phone || '—'}</td>
                        <td className="px-4 py-3 text-right text-gray-700">₹{(p.monthly_inflow || 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            (p.lead_score || 0) > 70 ? 'bg-green-100 text-green-700' :
                            (p.lead_score || 0) >= 40 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {p.lead_score || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">₹{((p.repayment_capacity || 0) / 100000).toFixed(1)}L</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            p.priority === 'High' ? 'bg-red-100 text-red-700' :
                            p.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {p.priority || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{expanded === p.customer_id ? '▲' : '▼'}</td>
                      </tr>
                      {expanded === p.customer_id && (
                        <tr key={`${p.customer_id}-details`} className="bg-blue-50/40 border-t border-gray-100">
                          <td colSpan={7} className="px-6 py-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
                              <div>
                                <p className="text-xs font-semibold text-blue-800 uppercase mb-1">Contact</p>
                                <p>{p.phone || '—'}</p>
                                <p>{p.name}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-blue-800 uppercase mb-1">Financials</p>
                                <p>Income: ₹{(p.monthly_inflow || 0).toLocaleString('en-IN')}</p>
                                <p>Obligations: ₹{(p.fixed_obligations || 0).toLocaleString('en-IN')}</p>
                                <p>Credit Score: {p.credit_score || '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-blue-800 uppercase mb-1">Scoring</p>
                                <p>LQI Score: {p.lead_score || '—'}</p>
                                <p>Max Loan: ₹{((p.repayment_capacity || 0) / 100000).toFixed(1)}L</p>
                                <p>Product: {p.recommended_product || '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-blue-800 uppercase mb-1">Status</p>
                                <p>{p.status || 'New'}</p>
                                <p>ID: {p.customer_id}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </main>

      <footer className="bg-blue-900 text-blue-200 text-center py-4 text-xs">
        IDBI Innovate 2026 — Lead Scoring Platform — Hackathon Project
      </footer>
    </div>
  )
}
