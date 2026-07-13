import { useState } from 'react'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { DashboardHeader } from '../components/DashboardHeader'

const API_URL = '/api'

interface ProspectRow {
  name: string
  email: string
  phone: string
  monthly_income: string
  fixed_obligations: string
  credit_score: string
}

interface ScoredResult {
  name: string
  phone: string
  monthly_income: number
  lead_score: number
  priority: string
  recommended_product: string
}

interface Transaction {
  date: string
  description: string
  amount: number
  type: 'credit' | 'debit'
  category: string
}

interface BankSummary {
  total_credits: number
  total_debits: number
  savings_ratio: number
  emi_count: number
  stability_score: number
  avg_daily_spend: number
}

export function AddProspectsPage() {
  const [rows, setRows] = useState<ProspectRow[]>([
    { name: '', email: '', phone: '', monthly_income: '', fixed_obligations: '', credit_score: '' }
  ])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; results?: ScoredResult[] } | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [bankSummary, setBankSummary] = useState<BankSummary | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const updateRow = (idx: number, field: keyof ProspectRow, value: string) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  const addRow = () => {
    setRows(prev => [...prev, { name: '', email: '', phone: '', monthly_income: '', fixed_obligations: '', credit_score: '' }])
  }

  const removeRow = (idx: number) => {
    if (rows.length > 1) setRows(prev => prev.filter((_, i) => i !== idx))
  }

  const handleGenerateDemo = async () => {
    const firstProspect = rows[0]
    const monthlyIncome = parseFloat(firstProspect.monthly_income) || 50000
    setIsGenerating(true)
    try {
      const resp = await fetch(`${API_URL}/bank-statement/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthly_income: monthlyIncome, num_days: 90 })
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Generation failed')
      setTransactions(data.transactions || [])
      setBankSummary(data.summary || null)
    } catch (err: unknown) {
      setTransactions([])
      setBankSummary(null)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.trim().split('\n')
      const parsed: Transaction[] = []
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',')
        if (parts.length >= 3) {
          const amount = parseFloat(parts[2].trim())
          parsed.push({
            date: parts[0].trim(),
            description: parts[1].trim(),
            amount: Math.abs(amount),
            type: amount >= 0 ? 'credit' : 'debit',
            category: 'General'
          })
        }
      }
      setTransactions(parsed)
      // Compute simple summary from parsed transactions
      const credits = parsed.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0)
      const debits = parsed.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0)
      setBankSummary({
        total_credits: credits,
        total_debits: debits,
        savings_ratio: credits > 0 ? ((credits - debits) / credits) * 100 : 0,
        emi_count: parsed.filter(t => t.description.toLowerCase().includes('emi') || t.description.toLowerCase().includes('loan')).length,
        stability_score: 70,
        avg_daily_spend: debits / 90
      })
    }
    reader.readAsText(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    const prospects = rows.map(r => ({
      name: r.name,
      email: r.email,
      phone: r.phone,
      monthly_income: parseFloat(r.monthly_income) || 0,
      fixed_obligations: parseFloat(r.fixed_obligations) || 0,
      credit_score: parseInt(r.credit_score) || 0
    })).filter(p => p.name && p.phone)

    // ponytail: attach bank statement to first prospect (backend expects this)
    if (transactions.length > 0 && prospects.length > 0) {
      (prospects[0] as any).bank_statement = { transactions, summary: bankSummary }
    }

    if (prospects.length === 0) {
      setResult({ success: false, message: 'At least one prospect with name and phone is required' })
      setLoading(false)
      return
    }

    try {
      const resp = await fetch(`${API_URL}/prospects/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects })
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Upload failed')
      setResult({ success: true, message: `Successfully added ${prospects.length} prospect(s). Total prospects: ${data.total}`, results: data.results })
      setRows([{ name: '', email: '', phone: '', monthly_income: '', fixed_obligations: '', credit_score: '' }])
    } catch (err: unknown) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Upload failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      <DashboardHeader title="Add Prospects" subtitle="Prospect Management" showNav />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-6">

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-blue-900">Add Prospects</h2>
            <p className="text-gray-500 text-sm">Enter prospect details for AI scoring</p>
          </div>
          <a href="/manager/dashboard" className="text-blue-600 text-sm hover:underline">← Back to Dashboard</a>
        </div>

        {result && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${result.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {result.message}
          </div>
        )}

        {result?.success && result.results && result.results.length > 0 && (
          <Card className="mb-6 border border-gray-200">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">Scoring Results</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase text-gray-500 border-b border-gray-200">
                      <th className="text-left py-2 pr-4">Name</th>
                      <th className="text-left py-2 pr-4">Phone</th>
                      <th className="text-right py-2 pr-4">Monthly Income</th>
                      <th className="text-center py-2 pr-4">LQI Score</th>
                      <th className="text-center py-2 pr-4">Priority</th>
                      <th className="text-left py-2">Recommended Product</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.map((r, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0">
                        <td className="py-2 pr-4 text-gray-800">{r.name}</td>
                        <td className="py-2 pr-4 text-gray-600">{r.phone}</td>
                        <td className="py-2 pr-4 text-right text-gray-600">₹{r.monthly_income.toLocaleString('en-IN')}</td>
                        <td className="py-2 pr-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            r.lead_score > 70 ? 'bg-green-100 text-green-700' :
                            r.lead_score >= 40 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>{r.lead_score}</span>
                        </td>
                        <td className="py-2 pr-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            r.priority === 'High' ? 'bg-red-100 text-red-700' :
                            r.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>{r.priority}</span>
                        </td>
                        <td className="py-2 text-gray-600">{r.recommended_product}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit}>
              {/* Column headers */}
              <div className="grid grid-cols-7 gap-2 mb-2 text-xs font-semibold text-blue-900 uppercase tracking-wide">
                <div>Name *</div>
                <div>Email</div>
                <div>Phone *</div>
                <div>Monthly Income</div>
                <div>Obligations</div>
                <div>Credit Score</div>
                <div></div>
              </div>

              {/* Data rows */}
              <div className="space-y-2 mb-4">
                {rows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-7 gap-2 items-center">
                    <Input placeholder="Full name" value={row.name} onChange={e => updateRow(idx, 'name', e.target.value)} className="text-sm" />
                    <Input type="email" placeholder="email@example.com" value={row.email} onChange={e => updateRow(idx, 'email', e.target.value)} className="text-sm" />
                    <Input placeholder="+91..." value={row.phone} onChange={e => updateRow(idx, 'phone', e.target.value)} className="text-sm" />
                    <Input type="number" placeholder="50000" value={row.monthly_income} onChange={e => updateRow(idx, 'monthly_income', e.target.value)} className="text-sm" />
                    <Input type="number" placeholder="10000" value={row.fixed_obligations} onChange={e => updateRow(idx, 'fixed_obligations', e.target.value)} className="text-sm" />
                    <Input type="number" placeholder="750" value={row.credit_score} onChange={e => updateRow(idx, 'credit_score', e.target.value)} className="text-sm" />
                    <Button type="button" variant="outline" size="sm" onClick={() => removeRow(idx)} disabled={rows.length === 1} className="text-red-500 border-red-200 hover:bg-red-50">Remove</Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={addRow}>+ Add Row</Button>
                <Button type="submit" className="bg-blue-900 hover:bg-blue-800" disabled={loading}>
                  {loading ? 'Uploading...' : 'Upload Prospects'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Bank Statement Analysis Section */}
        <Card className="border border-gray-200 mt-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Bank Statement Analysis</h3>

            <div className="flex gap-3 mb-4">
              <Button type="button" variant="outline" onClick={handleGenerateDemo} disabled={isGenerating} className="border-blue-300 text-blue-700 hover:bg-blue-50">
                {isGenerating ? 'Generating...' : 'Generate Demo Transactions'}
              </Button>
              <label className="inline-flex items-center px-4 py-2 border border-dashed border-blue-300 rounded-md text-sm text-blue-700 cursor-pointer hover:bg-blue-50 transition-colors">
                Or upload your own CSV statement
                <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
              </label>
            </div>

            {/* Summary stats */}
            {bankSummary && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 uppercase">Total Credits</p>
                  <p className="text-lg font-bold text-green-700">₹{bankSummary.total_credits.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 uppercase">Avg Daily Spend</p>
                  <p className="text-lg font-bold text-red-700">₹{bankSummary.avg_daily_spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 uppercase">Stability Score</p>
                  <p className="text-lg font-bold text-blue-700">{bankSummary.stability_score}%</p>
                </div>
              </div>
            )}

            {/* Transactions table */}
            {transactions.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-blue-50 sticky top-0">
                      <tr className="text-xs uppercase text-blue-900">
                        <th className="text-left py-2 px-3">Date</th>
                        <th className="text-left py-2 px-3">Description</th>
                        <th className="text-right py-2 px-3">Amount</th>
                        <th className="text-center py-2 px-3">Type</th>
                        <th className="text-left py-2 px-3">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="py-2 px-3 text-gray-600 whitespace-nowrap">{t.date}</td>
                          <td className="py-2 px-3 text-gray-800">{t.description}</td>
                          <td className={`py-2 px-3 text-right font-medium ${t.type === 'credit' ? 'text-green-700' : 'text-red-700'}`}>
                            ₹{t.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${t.type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {t.type === 'credit' ? 'Credit' : 'Debit'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-gray-600">{t.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {bankSummary && (
                  <div className="bg-gray-50 px-3 py-2 flex gap-4 text-xs border-t border-gray-200">
                    <span className="text-green-700">Savings Ratio: {bankSummary.savings_ratio.toFixed(1)}%</span>
                    <span className="text-gray-600">EMI Count: {bankSummary.emi_count}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info note */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>Note:</strong> Prospects will be scored using the AI engine based on monthly income, consistency, fixed obligations, and credit score.
            Each prospect receives a Lead Quality Index (LQI) score, priority rating, and product recommendation.
          </p>
        </div>
      </main>

      <footer className="bg-blue-900 text-blue-200 text-center py-4 text-xs">
        IDBI Innovate 2026 — Lead Scoring Platform — Hackathon Project
      </footer>
    </div>
  )
}
