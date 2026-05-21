import { useState, useEffect } from 'react'
import {
  BarChart3, Database, LogOut, ChevronRight,
  TrendingUp, FileText, ArrowRight, Loader2,
} from 'lucide-react'
import type { User, DataSource } from '../types'
import { getDataSources } from '../api'

interface Props {
  user: User
  onSelect: (ds: DataSource) => void
  onLogout: () => void
}

export default function DataSourcePage({ user, onSelect, onLogout }: Props) {
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    getDataSources()
      .then(list => {
        if (!cancelled) setDataSources(list)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载数据源失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  const recordCounts: Record<string, string> = {
    ds_order: '12,480',
    ds_customer: '5,632',
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-surface-200/60">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <span className="text-surface-900 font-bold tracking-tight">SmartPivot</span>
            <span className="text-surface-300 text-xs font-medium ml-1">|</span>
            <span className="text-surface-400 text-sm">数据源选择</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center">
                <span className="text-brand-700 text-xs font-bold">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-surface-600 text-sm">{user.username}</span>
            </div>
            <button
              onClick={onLogout}
              className="btn-ghost text-surface-400 hover:text-red-500"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">退出</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-surface-900 text-2xl font-bold mb-2">选择数据源</h1>
          <p className="text-surface-500 text-sm">请选择要分析的数据模型，进入透视分析</p>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map(i => (
              <div key={i} className="card p-6">
                <div className="skeleton-pulse h-5 w-40 mb-3" />
                <div className="skeleton-pulse h-4 w-full mb-2" />
                <div className="skeleton-pulse h-4 w-2/3 mb-4" />
                <div className="flex items-center gap-4">
                  <div className="skeleton-pulse h-4 w-24" />
                  <div className="skeleton-pulse h-4 w-20" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="card p-8 text-center animate-fade-in">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-surface-600 text-sm mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary"
            >
              重新加载
            </button>
          </div>
        )}

        {!loading && !error && dataSources.length === 0 && (
          <div className="card p-12 text-center animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-100 flex items-center justify-center">
              <Database className="w-7 h-7 text-surface-300" />
            </div>
            <h3 className="text-surface-700 font-semibold mb-2">暂无可用数据源</h3>
            <p className="text-surface-400 text-sm max-w-sm mx-auto">
              当前账号下没有可用的数据模型，请联系管理员配置数据源后再进行透视分析。
            </p>
          </div>
        )}

        {!loading && !error && dataSources.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 entrance-stagger">
            {dataSources.map((ds) => (
              <button
                key={ds.id}
                onClick={() => onSelect(ds)}
                className="card-hover p-6 text-left group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                      <Database className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                      <h3 className="text-surface-900 font-semibold group-hover:text-brand-700 transition-colors">
                        {ds.name}
                      </h3>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-surface-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
                </div>

                <p className="text-surface-500 text-sm mb-4 leading-relaxed">
                  {ds.description}
                </p>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-surface-400 text-xs">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>记录数</span>
                    <span className="text-surface-600 font-medium">{recordCounts[ds.id] || '-'}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-surface-100 flex items-center gap-2 text-brand-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>进入分析</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-surface-100 py-6 px-6 text-center">
        <p className="text-surface-300 text-2xs">
          &copy; 2026 SmartPivot — 自助数据分析工具
        </p>
      </footer>
    </div>
  )
}
