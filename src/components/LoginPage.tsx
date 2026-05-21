import { useState, FormEvent } from 'react'
import { Eye, EyeOff, Loader2, BarChart3 } from 'lucide-react'
import type { User, LoginParams } from '../types'
import { login } from '../api'

interface Props {
  onLogin: (user: User) => void
}

export default function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim()) {
      setError('请输入用户名')
      return
    }
    if (!password) {
      setError('请输入密码')
      return
    }

    setLoading(true)
    try {
      const params: LoginParams = { username: username.trim(), password }
      const user = await login(params)
      onLogin(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      <div className="hidden lg:flex lg:w-[540px] xl:w-[600px] relative bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 flex-col justify-between p-12 xl:p-16">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[-160px] right-[-120px] w-[500px] h-[500px] rounded-full bg-brand-700/20 blur-3xl" />
          <div className="absolute bottom-[-80px] left-[-100px] w-[400px] h-[400px] rounded-full bg-brand-600/15 blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-white text-xl font-bold tracking-tight">SmartPivot</span>
          </div>

          <h1 className="text-white text-[2.25rem] xl:text-[2.75rem] font-bold leading-tight tracking-tight mb-4">
            透视分析
            <br />
            让数据洞察更简单
          </h1>
          <p className="text-brand-200/80 text-base leading-relaxed max-w-md">
            多维交叉表、灵活过滤、智能汇总 ——
            无需编写代码，像使用 Excel 透视表一样轻松完成数据分析。
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3 text-brand-200/70 text-sm">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
              <span className="text-xs font-bold text-white">01</span>
            </div>
            <span>多维度交叉表，灵活拖拽行/列维度</span>
          </div>
          <div className="flex items-center gap-3 text-brand-200/70 text-sm">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
              <span className="text-xs font-bold text-white">02</span>
            </div>
            <span>智能分类汇总，层级折叠展开</span>
          </div>
          <div className="flex items-center gap-3 text-brand-200/70 text-sm">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
              <span className="text-xs font-bold text-white">03</span>
            </div>
            <span>精准数据筛选，一键导出 Excel</span>
          </div>
        </div>

        <div className="relative z-10 text-brand-200/40 text-2xs">
          &copy; 2026 SmartPivot. All rights reserved.
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[400px] animate-fade-in">
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-surface-900 text-xl font-bold tracking-tight">SmartPivot</span>
          </div>

          <div className="mb-8">
            <h2 className="text-surface-900 text-2xl font-bold mb-2">欢迎回来</h2>
            <p className="text-surface-500 text-sm">请登录您的账号以继续</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm animate-slide-up">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">!</span>
                </span>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="username" className="label-text">用户名</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError('') }}
                className="input-field"
                placeholder="请输入用户名"
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="label-text">密码</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  className="input-field pr-10"
                  placeholder="请输入密码"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-11 text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </button>
          </form>

          <div className="mt-8 p-4 rounded-xl bg-surface-50 border border-surface-100">
            <p className="text-surface-400 text-2xs font-medium mb-2">演示账号</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-surface-400">管理员：</span>
                <span className="text-surface-700 font-medium">admin / admin123</span>
              </div>
              <div>
                <span className="text-surface-400">演示：</span>
                <span className="text-surface-700 font-medium">demo / demo123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
