import { Sun, Cloud, CloudRain, Wind, CloudLightning } from 'lucide-react'
import type { WeatherNode, WeatherType } from '@/types'

interface WeatherBarProps {
  timeline: WeatherNode[]
}

const weatherColors: Record<WeatherType, string> = {
  sunny: '#4CAF50',
  cloudy: '#90A4AE',
  rainy: '#42A5F5',
  windy: '#FF9800',
  storm: '#F44336',
}

const weatherLabels: Record<WeatherType, string> = {
  sunny: '晴天',
  cloudy: '阴天',
  rainy: '雨天',
  windy: '大风',
  storm: '暴雨',
}

const WeatherIcon = ({ type }: { type: WeatherType }) => {
  const props = { className: 'w-4 h-4 text-white' }
  switch (type) {
    case 'sunny':
      return <Sun {...props} />
    case 'cloudy':
      return <Cloud {...props} />
    case 'rainy':
      return <CloudRain {...props} />
    case 'windy':
      return <Wind {...props} />
    case 'storm':
      return <CloudLightning {...props} />
  }
}

function WeatherBar({ timeline }: WeatherBarProps) {
  if (timeline.length === 0) return null

  const maxTime = timeline[timeline.length - 1].time
  if (maxTime <= 0) return null

  const segments: { start: number; end: number; fromType: WeatherType; toType: WeatherType; fromWind: number; toWind: number }[] = []

  for (let i = 0; i < timeline.length - 1; i++) {
    segments.push({
      start: (timeline[i].time / maxTime) * 100,
      end: (timeline[i + 1].time / maxTime) * 100,
      fromType: timeline[i].type,
      toType: timeline[i + 1].type,
      fromWind: timeline[i].windSpeed,
      toWind: timeline[i + 1].windSpeed,
    })
  }

  return (
    <div className="flex h-10 rounded overflow-hidden relative">
      {segments.map((seg, i) => {
        const width = seg.end - seg.start
        if (width <= 0) return null

        const showIcon = width > 8
        const showLabel = width > 15

        return (
          <div
            key={i}
            className="relative flex items-center justify-center group transition-all"
            style={{
              width: `${width}%`,
              background: `linear-gradient(to right, ${weatherColors[seg.fromType]}, ${weatherColors[seg.toType]})`,
            }}
          >
            {showIcon && (
              <div className="flex items-center gap-1">
                <WeatherIcon type={seg.fromType} />
                {showLabel && (
                  <span className="text-xs text-white font-medium">
                    {weatherLabels[seg.fromType]}
                  </span>
                )}
              </div>
            )}

            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 px-3 py-2 bg-gray-800 text-white text-xs rounded whitespace-nowrap shadow-lg">
              <div className="font-medium">
                第{Math.round(seg.start / 100 * (maxTime / 100 * 60))}分 - 第{Math.round(seg.end / 100 * (maxTime / 100 * 60))}分
              </div>
              <div className="text-gray-300 mt-1">
                {weatherLabels[seg.fromType]} → {weatherLabels[seg.toType]}
              </div>
              <div className="text-gray-300">
                风速: {seg.fromWind} → {seg.toWind} m/s
              </div>
            </div>
          </div>
        )
      })}

      <div className="absolute bottom-0 left-0 right-0 h-1 flex">
        {timeline.map((node, i) => {
          if (i === 0 || i === timeline.length - 1) return null
          return (
            <div
              key={i}
              className="w-px h-full bg-white/40"
              style={{ left: `${(node.time / maxTime) * 100}%` }}
            />
          )
        })}
      </div>
    </div>
  )
}

export default WeatherBar
export { WeatherBar }
