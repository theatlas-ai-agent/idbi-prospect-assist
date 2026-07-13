import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'

const API_URL = 'http://13.127.91.178:5000'

interface ProspectRow {
  name: string
  email: string
  phone: string
  monthly_income: string
  fixed_obligations: string
  credit_score: string
}

interface Transaction {
  date: string
  description: string
  amount: number
  type: 'credit' | 'debit'
}

type TransactionInputMode = 'upload' | 'paste' | 'demo'

export function AddProspectsPage() {
  const [rows, setRows] = useState<ProspectRow[]>([
    { name: '', email: '', phone: '', monthly_income: '', fixed_obligations: '', credit_score: '' }
  ])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [txMode, setTxMode] = useState<TransactionInputMode>('upload')
  const [txPasteData, setTxPasteData] = useState('')
  const [txTransactions, setTxTransactions] = useState<Transaction[]>([])

  const generateDemoTransactions = (): Transaction[] => {
    const today = new Date()
    const descriptions = [
      { desc: 'Salary Credit', type: 'credit' as const, minAmt: 40000, maxAmt: 80000 },
      { desc: 'Rent Payment', type: 'debit' as const, minAmt: 15000, maxAmt: 25000 },
      { desc: 'Grocery Store', type: 'debit' as const, minAmt: 2000, maxAmt: 5000 },
      { desc: 'Electric Bill', type: 'debit' as const, minAmt: 1000, maxAmt: 3000 },
      { desc: 'ATM Withdrawal', type: 'debit' as const, minAmt: 5000, maxAmt: 15000 },
      { desc: 'Online Shopping', type: 'debit' as const, minAmt: 1500, maxAmt: 8000 },
      { desc: 'Interest Credit', type: 'credit' as const, minAmt: 100, maxAmt: 500 },
      { desc: 'Restaurant', type: 'debit' as const, minAmt: 500, maxAmt: 2000 },
      { desc: 'Fuel Station', type: 'debit' as const, minAmt: 2000, maxAmt: 5000 },
      { desc: 'Transfer Received', type: 'credit' as const, minAmt: 5000, maxAmt: 20000 },
      { desc: 'Insurance Premium', type: 'debit' as const, minAmt: 2000, maxAmt: 10000 },
      { desc: 'Mobile Recharge', type: 'debit' as const, minAmt: 200, maxAmt: 1000 },
      { desc: 'Refund Credit', type: 'credit' as const, minAmt: 500, maxAmt: 3000 },
      { desc: 'Medical Store', type: 'debit' as const, minAmt: 500, maxAmt: 3000 },
      { desc: 'Subscription', type: 'debit' as const, minAmt: 200, maxAmt: 1500 },
    ]
    const transactions: Transaction[] = []
    for (let i = 0; i < 15; i++) {
      const daysAgo = Math.floor(Math.random() * 90)
      const date = new Date(today)
      date.setDate(date.getDate() - daysAgo)
      const tmpl = descriptions[i]
      transactions.push({
        date: date.toISOString().split('T')[0],
        description: tmpl.desc,
        amount: Math.floor(Math.random() * (tmpl.maxAmt - tmpl.minAmt) + tmpl.minAmt),
        type: tmpl.type
      })
    }
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const handleDemoData = () => {
    const txs = generateDemoTransactions()
    setTxTransactions(txs)
    setTxPasteData(txs.map(t => `${t.date},${t.description},${t.amount},${t.type}`).join('\n'))
  }

  const updateRow = (idx: number, field: keyof ProspectRow, value: string) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  const addRow = () => {
    setRows(prev => [...prev, { name: '', email: '', phone: '', monthly_income: '', fixed_obligations: '', credit_score: '' }])
  }

  const removeRow = (idx: number) => {
    if (rows.length > 1) {
      setRows(prev => prev.filter((_, i) => i !== idx))
    }
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

    if (prospects.length === 0) {
      setResult({ success: false, message: 'At least one prospect with name and phone required' })
      setLoading(false)
      return
    }

    try {
      const resp = await fetch(`${API_URL}/api/prospects/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects })
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Upload failed')
      setResult({ success: true, message: `Added ${prospects.length} prospect(s)` })
      setRows([{ name: '', email: '', phone: '', monthly_income: '', fixed_obligations: '', credit_score: '' }])
    } catch (err: unknown) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Upload failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Add Prospects</span>
            <a href="/manager/dashboard" className="text-sm font-normal text-blue-600 hover:underline">← Dashboard</a>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {result && (
              <div className={result.success ? 'bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm' : 'bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm'}>
                {result.message}
              </div>
            )}

            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-7 gap-2 text-xs font-medium text-muted-foreground">
                <div>Name*</div>
                <div>Email</div>
                <div>Phone*</div>
                <div>Monthly Income</div>
                <div>Fixed Obligations</div>
                <div>Credit Score</div>
                <div></div>
              </div>

              {/* Rows */}
              {rows.map((row, idx) => (
                <div key={idx} className="grid grid-cols-7 gap-2">
                  <Input placeholder="Full name" value={row.name} onChange={e => updateRow(idx, 'name', e.target.value)} />
                  <Input type="email" placeholder="email@example.com" value={row.email} onChange={e => updateRow(idx, 'email', e.target.value)} />
                  <Input placeholder="+91..." value={row.phone} onChange={e => updateRow(idx, 'phone', e.target.value)} />
                  <Input type="number" placeholder="50000" value={row.monthly_income} onChange={e => updateRow(idx, 'monthly_income', e.target.value)} />
                  <Input type="number" placeholder="10000" value={row.fixed_obligations} onChange={e => updateRow(idx, 'fixed_obligations', e.target.value)} />
                  <Input type="number" placeholder="750" value={row.credit_score} onChange={e => updateRow(idx, 'credit_score', e.target.value)} />
                  <Button type="button" variant="outline" onClick={() => removeRow(idx)} disabled={rows.length === 1}>✕</Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={addRow}>+ Add Row</Button>
              <Button type="submit" className="bg-blue-900 hover:bg-blue-800" disabled={loading}>
                {loading ? 'Uploading...' : 'Upload Prospects'}
              </Button>
            </div>
          </form>

          {/* Bank Statement Section */}
          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Bank Statement</h3>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="txMode" value="upload" checked={txMode === 'upload'} onChange={() => setTxMode('upload')} />
                <span>Bank Statement (PDF/CSV)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="txMode" value="paste" checked={txMode === 'paste'} onChange={() => setTxMode('paste')} />
                <span>Paste Data</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="txMode" value="demo" checked={txMode === 'demo'} onChange={() => setTxMode('demo')} />
                <span>Demo Data</span>
              </label>
            </div>

            {txMode === 'upload' && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500">
                <p>Upload PDF or CSV file (frontend only)</p>
                <input type="file" accept=".pdf,.csv" className="mt-2" />
              </div>
            )}

            {txMode === 'paste' && (
              <textarea
                className="w-full h-48 border rounded-lg p-3 font-mono text-sm"
                placeholder="Paste transactions: date, description, amount, type (credit/debit)"
                value={txPasteData}
                onChange={e => setTxPasteData(e.target.value)}
              />
            )}

            {txMode === 'demo' && (
              <Button type="button" variant="outline" onClick={handleDemoData}>Generate Demo Transactions</Button>
            )}

            {txTransactions.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Description</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2 text-left">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txTransactions.map((tx, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{tx.date}</td>
                        <td className="px-3 py-2">{tx.description}</td>
                        <td className="px-3 py-2 text-right">{tx.amount.toLocaleString()}</td>
                        <td className="px-3 py-2">{tx.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
