import { useState, useMemo } from 'react'
import {
  AlertTriangle,
  Lightbulb,
  Cloud,
  Cpu,
  Search,
  Copy,
  EyeOff,
  Wind,
  CloudRain,
  Thermometer,
  Fuel,
  Battery,
  Route,
  MapPin,
  AlignJustify,
} from 'lucide-react'
import { ENCYCLOPEDIA_ENTRIES } from '@/data/encyclopedia'
import type { EncyclopediaCategory } from '@/types'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Copy,
  EyeOff,
  AlertTriangle,
  AlignJustify,
  Route,
  MapPin,
  Wind,
  CloudRain,
  Thermometer,
  Cpu,
  Fuel,
  Battery,
  Lightbulb,
  Cloud,
}

const CATEGORIES: { key: EncyclopediaCategory; label: string; accent: string; bgTint: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'error', label: '常见错误', accent: 'border-red-500', bgTint: 'bg-red-50', Icon: AlertTriangle },
  { key: 'strategy', label: '作业策略', accent: 'border-green-500', bgTint: 'bg-green-50', Icon: Lightbulb },
  { key: 'weather', label: '天气影响', accent: 'border-blue-500', bgTint: 'bg-blue-50', Icon: Cloud },
  { key: 'drone', label: '机型知识', accent: 'border-purple-500', bgTint: 'bg-purple-50', Icon: Cpu },
]

const ACCENT_COLORS: Record<EncyclopediaCategory, string> = {
  error: 'text-red-600',
  strategy: 'text-green-600',
  weather: 'text-blue-600',
  drone: 'text-purple-600',
}

export default function Encyclopedia() {
  const [activeCategory, setActiveCategory] = useState<EncyclopediaCategory>('error')
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const categoryEntries = useMemo(
    () => ENCYCLOPEDIA_ENTRIES.filter((e) => e.category === activeCategory),
    [activeCategory],
  )

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return categoryEntries
    const q = searchQuery.toLowerCase()
    return categoryEntries.filter(
      (e) => e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q),
    )
  }, [categoryEntries, searchQuery])

  const activeEntry = useMemo(
    () => ENCYCLOPEDIA_ENTRIES.find((e) => e.id === activeEntryId) ?? null,
    [activeEntryId],
  )

  const handleSelectCategory = (cat: EncyclopediaCategory) => {
    setActiveCategory(cat)
    setActiveEntryId(null)
    setSearchQuery('')
  }

  const handleSelectEntry = (id: string) => {
    const entry = ENCYCLOPEDIA_ENTRIES.find((e) => e.id === id)
    if (entry) {
      setActiveCategory(entry.category)
      setActiveEntryId(id)
    }
  }

  const handleRelatedClick = (id: string) => {
    const entry = ENCYCLOPEDIA_ENTRIES.find((e) => e.id === id)
    if (entry) {
      setActiveCategory(entry.category)
      setActiveEntryId(id)
      setSearchQuery('')
    }
  }

  const currentCatConfig = CATEGORIES.find((c) => c.key === activeCategory)!

  return (
    <div className="flex h-full gap-6">
      <div className="w-56 flex flex-col bg-white rounded-xl shadow-sm overflow-hidden flex-shrink-0">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold" style={{ color: '#1B5E20' }}>知识图鉴</h2>
        </div>

        <div className="px-3 py-3 space-y-1">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key
            return (
              <button
                key={cat.key}
                onClick={() => handleSelectCategory(cat.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition border-l-4 ${
                  isActive
                    ? `${cat.accent} ${cat.bgTint} border-l-current`
                    : 'border-transparent text-gray-600 hover:bg-gray-50'
                }`}
              >
                <cat.Icon className={`w-4 h-4 ${isActive ? ACCENT_COLORS[cat.key] : ''}`} />
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>

        <div className="flex-1 overflow-auto px-3 pb-3 space-y-1 border-t border-gray-100 pt-3">
          {filteredEntries.map((entry) => {
            const EntryIcon = ICON_MAP[entry.icon] ?? Cpu
            const isActive = activeEntryId === entry.id
            return (
              <button
                key={entry.id}
                onClick={() => setActiveEntryId(entry.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                  isActive
                    ? 'bg-green-100 text-green-800 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <EntryIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{entry.title}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col rounded-xl overflow-hidden" style={{ backgroundColor: '#FFF8E1' }}>
        <div className="px-6 pt-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索词条..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 pb-6">
          {activeEntry ? (
            <div className="bg-white rounded-xl shadow-sm p-8">
              <h1 className="text-2xl font-bold mb-6" style={{ color: '#1B5E20' }}>
                {activeEntry.title}
              </h1>

              {activeEntry.content.split('。').filter(Boolean).map((sentence, i) => (
                <p key={i} className="text-gray-700 leading-relaxed mb-3">
                  {sentence.trim()}{sentence.trim().endsWith('。') ? '' : '。'}
                </p>
              ))}

              {activeEntry.relatedEntries.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-500 mb-3">相关词条</h3>
                  <div className="flex flex-wrap gap-2">
                    {activeEntry.relatedEntries.map((rid) => {
                      const related = ENCYCLOPEDIA_ENTRIES.find((e) => e.id === rid)
                      if (!related) return null
                      const RIcon = ICON_MAP[related.icon] ?? Cpu
                      return (
                        <button
                          key={rid}
                          onClick={() => handleRelatedClick(rid)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-green-50 text-green-700 hover:bg-green-100 transition"
                        >
                          <RIcon className="w-3.5 h-3.5" />
                          {related.title}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
                <Search className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-bold mb-3" style={{ color: '#1B5E20' }}>
                欢迎使用知识图鉴
              </h2>
              <p className="text-gray-500 max-w-md leading-relaxed">
                这里汇集了植保无人机作业的常见错误、策略技巧、天气影响和机型知识。请在左侧选择分类和词条开始学习，也可以使用搜索快速查找。
              </p>
              <div className="flex gap-4 mt-8">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => handleSelectCategory(cat.key)}
                    className={`flex flex-col items-center gap-2 px-5 py-4 rounded-xl ${cat.bgTint} hover:shadow-md transition`}
                  >
                    <cat.Icon className={`w-6 h-6 ${ACCENT_COLORS[cat.key]}`} />
                    <span className="text-xs font-medium text-gray-700">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
