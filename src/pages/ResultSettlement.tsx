import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Copy, EyeOff, AlertTriangle, TrendingDown, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { useGameStore } from '@/stores/gameStore'
import RadarChart from '@/components/RadarChart'
import StarRating from '@/components/StarRating'
import type { SuggestionType, SeverityLevel } from '@/types'

const severityColors: Record<SeverityLevel, string> = {
  high: '#EF4444',
  medium: '#EAB308',
  low: '#22C55E',
}

const suggestionIcons: Record<SuggestionType, typeof Copy> = {
  overlap: Copy,
  miss: EyeOff,
  danger: AlertTriangle,
  inefficient: TrendingDown,
  wait: Clock,
}

const scoreCards = [
  { key: 'acreEfficiency' as const, label: '亩效', color: '#4CAF50' },
  { key: 'onTimeRate' as const, label: '准点率', color: '#2196F3' },
  { key: 'safetyScore' as const, label: '安全分', color: '#FF9800' },
  { key: 'costScore' as const, label: '成本分', color: '#9C27B0' },
]

const starMessages: Record<number, string> = {
  3: '完美调度！你是真正的调度大师！',
  2: '调度合格！还有优化空间哦',
  1: '勉强达标，建议重新规划航线',
  0: '未达标，请认真查看调度建议',
}

function AnimatedCounter({ value, suffix = '%' }: { value: number; suffix?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-2xl font-bold"
    >
      {suffix === '%'
        ? (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {Math.round(value)}
            </motion.span>
          )
        : Math.round(value)
      }
      {suffix}
    </motion.span>
  )
}

export default function ResultSettlement() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { simulationResult: result, levels, savePlan } = useGameStore()
  const [saved, setSaved] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const level = levels.find((l) => l.id === id)

  if (!result) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-4">
        <p className="text-xl text-gray-500">暂无结算数据</p>
        <Link to="/" className="text-blue-500 underline hover:text-blue-700">
          返回地图
        </Link>
      </div>
    )
  }

  const handleSave = () => {
    savePlan()
    setSaved(true)
  }

  return (
    <div className="min-h-full flex items-center justify-center py-12">
      <div className="max-w-5xl mx-auto w-full px-4 space-y-8">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-center"
        >
          调度结果{level ? ` — ${level.name}` : ''}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col md:flex-row items-center md:items-start gap-8 justify-center"
        >
          <RadarChart
            scores={{
              acreEfficiency: result.acreEfficiency,
              onTimeRate: result.onTimeRate,
              safetyScore: result.safetyScore,
              costScore: result.costScore,
            }}
          />

          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            {scoreCards.map((card, i) => (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
                className="rounded-lg p-4 bg-white shadow-sm"
                style={{ borderLeft: `4px solid ${card.color}` }}
              >
                <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                <AnimatedCounter value={result[card.key]} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2, type: 'spring', stiffness: 200, damping: 15 }}
          className="flex flex-col items-center gap-3"
        >
          <StarRating stars={result.stars} animated size="lg" />
          <p className="text-lg text-gray-700">{starMessages[result.stars]}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.5 }}
          className="bg-white rounded-lg shadow-sm p-6"
        >
          <h2 className="text-xl font-semibold mb-4">调度建议</h2>
          {result.suggestions.length === 0 ? (
            <p className="text-gray-400">暂无建议</p>
          ) : (
            <ul className="space-y-3">
              {result.suggestions.map((s, i) => {
                const Icon = suggestionIcons[s.type]
                return (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 2.6 + i * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-md bg-gray-50"
                    style={{ borderLeft: `4px solid ${severityColors[s.severity]}` }}
                  >
                    <Icon className="w-5 h-5 mt-0.5 shrink-0 text-gray-600" />
                    <div>
                      <p className="text-gray-800">{s.message}</p>
                      {(s.relatedRouteIds.length > 0 || s.relatedFieldIds.length > 0) && (
                        <p className="text-xs text-gray-400 mt-1">
                          {s.relatedRouteIds.length > 0 && `航线: ${s.relatedRouteIds.join(', ')}`}
                          {s.relatedRouteIds.length > 0 && s.relatedFieldIds.length > 0 && ' / '}
                          {s.relatedFieldIds.length > 0 && `地块: ${s.relatedFieldIds.join(', ')}`}
                        </p>
                      )}
                    </div>
                  </motion.li>
                )
              })}
            </ul>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.8 }}
          className="bg-white rounded-lg shadow-sm"
        >
          <button
            onClick={() => setDetailsOpen((v) => !v)}
            className="w-full flex items-center justify-between p-4 text-left font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <span>详细指标</span>
            {detailsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          {detailsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">重叠率</p>
                <p className="text-xl font-semibold">{result.overlapPercentage}%</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">漏喷率</p>
                <p className="text-xl font-semibold">{result.missPercentage}%</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">总耗时</p>
                <p className="text-xl font-semibold">{result.totalTime}分钟</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">总成本</p>
                <p className="text-xl font-semibold">{result.totalCost}元</p>
              </div>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3 }}
          className="flex items-center justify-center gap-4 pt-4"
        >
          <button
            onClick={handleSave}
            disabled={saved}
            className={`px-6 py-2.5 rounded-lg font-medium text-white transition-colors ${
              saved ? 'bg-gray-400 cursor-default' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {saved ? '已保存' : '保存方案'}
          </button>
          <button
            onClick={() => navigate(`/dispatch/${id}`)}
            className="px-6 py-2.5 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            重新调度
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            返回地图
          </button>
        </motion.div>
      </div>
    </div>
  )
}
