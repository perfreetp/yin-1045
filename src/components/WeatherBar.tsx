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

  return (
    <div className="flex h-10 rounded overflow-hidden">
      {timeline.map((node, i) => {
        const startPercent = i === 0 ? 0 : (timeline[i - 1].time / maxTime) * 100
        const endPercent = (node.time / maxTime) * 100
        const width = endPercent - startPercent

        if (width <= 0) return null

        return (
          <div
            key={i}
            className="relative flex items-center justify-center group"
            style={{
              width: `${width}%`,
              backgroundColor: weatherColors[node.type],
            }}
          >
            <WeatherIcon type={node.type} />

            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap">
              时间: {node.time}分 | 风速: {node.windSpeed}m/s | 风向: {node.windDirection}°
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default WeatherBar
export { WeatherBar }
