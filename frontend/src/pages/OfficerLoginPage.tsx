import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'

const API_URL = '/api'

export function OfficerLoginPage() {
  const location = useLocation()
  const isManager = location.pathname.startsWith('/manager')
  const [formData, setFormData] = useState({ employeeId: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.employeeId || !formData.password) {
      setError('Please fill all fields')
      return
    }

    setLoading(true)
    setError('')

    try {
      const resp = await fetch(`${API_URL}/officer/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Login failed')

      localStorage.setItem('officer_token', data.token)
      localStorage.setItem('officer', JSON.stringify(data.officer))
      window.location.href = isManager ? '/manager/dashboard' : '/officer/dashboard'
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">{isManager ? '📊' : '👔'}</div>
          <CardTitle className="text-2xl">{isManager ? 'Prospect Manager Login' : 'Officer Login'}</CardTitle>
          <CardDescription>{isManager ? 'Add and manage prospects' : 'Access lead dashboard'}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

            <div className="space-y-2">
              <label className="text-sm font-medium">Employee ID</label>
              <Input
                name="employeeId"
                placeholder="EMP001"
                value={formData.employeeId}
                onChange={e => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                name="password"
                type="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>

            <Button type="submit" className="w-full bg-blue-900 hover:bg-blue-800" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>

            {/* ponytail: demo creds inline, no config file */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-blue-900 mb-1">Demo Credentials:</p>
              {isManager ? (
                <>
                  <p className="text-blue-700">Employee ID: <code className="bg-white px-1 rounded">MGR001</code></p>
                  <p className="text-blue-700">Password: <code className="bg-white px-1 rounded">manager123</code></p>
                </>
              ) : (
                <>
                  <p className="text-blue-700">Employee ID: <code className="bg-white px-1 rounded">EMP001</code></p>
                  <p className="text-blue-700">Password: <code className="bg-white px-1 rounded">officer123</code></p>
                </>
              )}
            </div>

            <p className="text-center text-sm text-gray-500">
              <a href="/" className="text-blue-600 hover:underline">← Back to home</a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
