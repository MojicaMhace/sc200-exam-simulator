import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

interface DomainRow {
  domain: string
  attempts: number
  correct: number
}

interface Props {
  rows: DomainRow[]
}

export function AnalyticsPanel({ rows }: Props) {
  const chartData = rows.map((r) => ({
    domain: r.domain.replace('Manage a security operations environment', 'Manage SOC').replace('Respond to security incidents', 'Respond').replace('Perform threat hunting', 'Hunt'),
    accuracy: r.attempts > 0 ? Math.round((Number(r.correct) / Number(r.attempts)) * 100) : 0,
  }))

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-3 text-base font-semibold">Domain Accuracy</h3>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="domain" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Bar dataKey="accuracy" fill="#0ea5e9" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
