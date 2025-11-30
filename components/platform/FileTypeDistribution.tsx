import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#14b8a6', '#8b5cf6']

type FileTypeDistributionProps = {
  data: { type: string; value: number }[]
}

export function FileTypeDistribution({ data }: FileTypeDistributionProps) {
  if (!data.length) {
    return <p className="text-sm text-slate-500">Run an analysis to see file type distribution.</p>
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="type" innerRadius={50} outerRadius={90} paddingAngle={2}>
            {data.map((entry, index) => (
              <Cell key={`cell-${entry.type}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

