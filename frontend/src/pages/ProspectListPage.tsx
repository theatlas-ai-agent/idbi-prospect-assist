import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'

const API_URL = 'http://13.127.91.178:5000'

export function ProspectListPage() {
  const [prospects, setProspects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/api/prospects`)
      .then(r => r.json())
      .then(data => setProspects(data.prospects || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="max-w-5xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Prospects ({prospects.length})</CardTitle>
          <div className="flex gap-2">
            <Button asChild className="bg-blue-900 hover:bg-blue-800">
              <a href="/manager/add">+ Add</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/manager/dashboard">Back</a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : prospects.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No prospects yet. Add some!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Phone</th>
                    <th className="text-right p-2">Income</th>
                    <th className="text-right p-2">Credit</th>
                    <th className="text-right p-2">Score</th>
                    <th className="text-left p-2">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {prospects.map((p, i) => (
                    <tr key={i} className="border-b hover:bg-slate-50">
                      <td className="p-2">{p.name || '—'}</td>
                      <td className="p-2">{p.customer_id}</td>
                      <td className="p-2">{p.phone || '—'}</td>
                      <td className="text-right p-2">₹{(p.monthly_inflow || 0).toLocaleString()}</td>
                      <td className="text-right p-2">{p.credit_score || '—'}</td>
                      <td className="text-right p-2 font-medium">{p.lead_score || '—'}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          p.priority === 'High' ? 'bg-green-100 text-green-800' :
                          p.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {p.priority || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
