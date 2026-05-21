import { useState } from 'react'
import type { User, DataSource } from './types'
import LoginPage from './components/LoginPage'
import DataSourcePage from './components/DataSourcePage'
import PivotAnalysisPage from './components/PivotAnalysisPage'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null)

  const handleLogin = (u: User) => {
    setUser(u)
  }

  const handleSelectDataSource = (ds: DataSource) => {
    setSelectedDataSource(ds)
  }

  const handleLogout = () => {
    setUser(null)
    setSelectedDataSource(null)
  }

  const handleBack = () => {
    setSelectedDataSource(null)
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  if (!selectedDataSource) {
    return (
      <DataSourcePage
        user={user}
        onSelect={handleSelectDataSource}
        onLogout={handleLogout}
      />
    )
  }

  return (
    <PivotAnalysisPage
      user={user}
      dataSource={selectedDataSource}
      onBack={handleBack}
      onLogout={handleLogout}
    />
  )
}
