interface RadarChartProps {
  scores: {
    acreEfficiency: number
    onTimeRate: number
    safetyScore: number
    costScore: number
  }
  size?: number
}

const axes = [
  { key: 'acreEfficiency', label: '亩效', angle: -90 },
  { key: 'onTimeRate', label: '准点', angle: 0 },
  { key: 'safetyScore', label: '安全', angle: 90 },
  { key: 'costScore', label: '成本', angle: 180 },
] as const

export default function RadarChart({ scores, size = 300 }: RadarChartProps) {
  const center = size / 2
  const maxRadius = size / 2 - 40

  const getPoint = (angleDeg: number, radius: number) => {
    const rad = (angleDeg * Math.PI) / 180
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    }
  }

  const scorePoints = axes.map((axis) => {
    const value = scores[axis.key] / 100
    return getPoint(axis.angle, maxRadius * value)
  })

  const scorePath = scorePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'

  const gridLevels = [0.33, 0.66, 1]

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridLevels.map((level) => {
        const points = axes.map((axis) => {
          const p = getPoint(axis.angle, maxRadius * level)
          return `${p.x},${p.y}`
        })
        return (
          <polygon
            key={level}
            points={points.join(' ')}
            fill="none"
            stroke="#D1D5DB"
            strokeWidth={1}
          />
        )
      })}

      {axes.map((axis) => {
        const end = getPoint(axis.angle, maxRadius)
        return (
          <line
            key={axis.key}
            x1={center}
            y1={center}
            x2={end.x}
            y2={end.y}
            stroke="#D1D5DB"
            strokeWidth={1}
          />
        )
      })}

      <path d={scorePath} fill="rgba(27, 94, 32, 0.3)" stroke="#1B5E20" strokeWidth={2} />

      {scorePoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="#1B5E20" />
      ))}

      {axes.map((axis) => {
        const labelPos = getPoint(axis.angle, maxRadius + 20)
        return (
          <text
            key={axis.key}
            x={labelPos.x}
            y={labelPos.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={12}
            fill="#1B5E20"
          >
            {axis.label}
          </text>
        )
      })}
    </svg>
  )
}
