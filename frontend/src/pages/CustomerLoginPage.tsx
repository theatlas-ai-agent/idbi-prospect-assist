import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'

const API_URL = 'http://13.127.91.178:5000'

export function CustomerLoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email || !formData.password) {
      setError('Please fill all fields')
      return
    }

    setLoading(true)
    setError('')

    try {
      const resp = await fetch(`${API_URL}/api/customer/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Login failed')

      localStorage.setItem('customer_token', data.token)
      localStorage.setItem('customer', JSON.stringify(data.customer))
      window.location.href = '/customer/dashboard'
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">👤</div>
          <CardTitle className="text-2xl">Customer Login</CardTitle>
          <CardDescription>Access your loan applications</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
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
              <p className="font-medium text-blue-700 mb-1">Demo Account:</p>
              <p className="text-blue-600">Email: <code className="bg-white px-1 rounded">demo@test.com</code></p>
              <p className="text-blue-600">Password: <code className="bg-white px-1 rounded">demo1234</code></p>
            </div>

            <p className="text-center text-sm text-gray-500">
              Don't have an account? <a href="/customer/register" className="text-blue-600 hover:underline">Register here</a>
            </p>
            <p className="text-center text-sm">
              <a href="/" className="text-gray-500 hover:underline">← Back to home</a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
