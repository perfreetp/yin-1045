import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  Download,
  X,
  Star,
  ChevronDown,
  ChevronRight,
  GitCompareArrows,
  Cloud,
  Plane,
  Minus,
} from 'lucide-react'
import { useGameStore } from '@/stores/gameStore'
import type { SceneType, CustomCase, Level, WeatherNode, WeatherType, DispatchPlan, SimulationResult } from '@/types'

const SCENE_OPTIONS: { value: SceneType; label: string }[] = [
  { value: 'paddy', label: '水稻田' },
  { value: 'orchard', label: '果园' },
  { value: 'hillside', label: '丘陵' },
  { value: 'scatter', label: '零散地块' },
]

const WEATHER_OPTIONS: { value: WeatherType; label: string }[] = [
  { value: 'sunny', label: '晴天' },
  { value: 'cloudy', label: '阴天' },
  { value: 'windy', label: '大风' },
  { value: 'rainy', label: '雨天' },
  { value: 'storm', label: '暴风雨' },
]

const DRONE_OPTIONS = [
  { id: 'yunbee-10', name: '云蜂-10' },
  { id: 'yunbee-16', name: '云蜂-16' },
  { id: 'yunbee-25', name: '云蜂-25' },
  { id: 'yuneagle-40', name: '云鹰-40' },
]

const METRIC_LABELS: Record<string, string> = {
  acreEfficiency: '亩效',
  onTimeRate: '准时率',
  safetyScore: '安全分',
  costScore: '成本分',
}

const METRIC_COLORS: Record<string, string> = {
  acreEfficiency: '#4CAF50',
  onTimeRate: '#2196F3',
  safetyScore: '#FF9800',
  costScore: '#9C27B0',
}

interface CaseFormData {
  name: string
  scene: SceneType
  difficulty: number
  area: number
  chemicalLimit: number
  timeLimit: number
  budget: number
}

const DEFAULT_FORM: CaseFormData = {
  name: '',
  scene: 'paddy',
  difficulty: 3,
  area: 60,
  chemicalLimit: 200,
  timeLimit: 30,
  budget: 600,
}

export default function TeacherPanel() {
  const {
    customCases,
    studentRecords,
    levels,
    addCustomCase,
    updateCustomCase,
    deleteCustomCase,
    assignCaseToStudent,
    unassignCaseFromStudent,
    getAllStudents,
  } = useGameStore()
  const [activeTab, setActiveTab] = useState<'cases' | 'records'>('cases')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [form, setForm] = useState<CaseFormData>(DEFAULT_FORM)
  const allStudents = getAllStudents()
  const [selectedStudentId, setSelectedStudentId] = useState('all')
  const [selectedLevelFilter, setSelectedLevelFilter] = useState('all')
  const [assigningCaseId, setAssigningCaseId] = useState<string | null>(null)
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null)
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareKeys, setCompareKeys] = useState<[string, string] | null>(null)

  const allLevels = useMemo(() => {
    const customLevels = customCases.map((c) => c.level)
    return [...levels, ...customLevels]
  }, [levels, customCases])

  const getLevelName = (levelId: string) => {
    const level = allLevels.find((l) => l.id === levelId)
    return level?.name ?? levelId
  }

  const handleCreateCase = () => {
    const caseId = crypto.randomUUID()
    const levelId = crypto.randomUUID()
    const halfArea = form.area / 2

    const level: Level = {
      id: levelId,
      name: form.name,
      scene: form.scene,
      difficulty: form.difficulty,
      area: form.area,
      chemicalLimit: form.chemicalLimit,
      timeLimit: form.timeLimit,
      budget: form.budget,
      weatherTimeline: [
        { time: 0, type: 'sunny', windSpeed: 0, windDirection: 0 },
        { time: 100, type: 'sunny', windSpeed: 0, windDirection: 0 },
      ],
      starTargets: [
        { stars: 1, conditions: [{ metric: 'acreEfficiency', min: 60 }] },
        { stars: 2, conditions: [{ metric: 'acreEfficiency', min: 75 }, { metric: 'onTimeRate', min: 70 }] },
        { stars: 3, conditions: [{ metric: 'acreEfficiency', min: 85 }, { metric: 'onTimeRate', min: 85 }, { metric: 'safetyScore', min: 80 }] },
      ],
      fields: [
        {
          id: `${levelId}-f1`,
          name: '地块A',
          polygon: [{ x: 80, y: 100 }, { x: 350, y: 100 }, { x: 350, y: 300 }, { x: 80, y: 300 }],
          area: halfArea,
          cropType: '自定义作物',
        },
        {
          id: `${levelId}-f2`,
          name: '地块B',
          polygon: [{ x: 400, y: 100 }, { x: 670, y: 100 }, { x: 670, y: 300 }, { x: 400, y: 300 }],
          area: halfArea,
          cropType: '自定义作物',
        },
      ],
      obstacles: [],
      events: [],
      availableDrones: ['yunbee-10', 'yunbee-16'],
      description: `自定义案例：${form.name}`,
    }

    const customCase: CustomCase = {
      id: caseId,
      teacherId: 'teacher-1',
      name: form.name,
      level,
      assignedStudents: [],
    }

    addCustomCase(customCase)
    setShowCreateModal(false)
    setForm(DEFAULT_FORM)
  }

  const handleAssignStudent = (caseId: string, studentId: string) => {
    const caseItem = customCases.find((c) => c.id === caseId)
    if (!caseItem) return
    if (caseItem.assignedStudents.includes(studentId)) {
      unassignCaseFromStudent(caseId, studentId)
    } else {
      assignCaseToStudent(caseId, studentId)
    }
  }

  const handleDeleteCase = (caseId: string) => {
    if (confirm('确定删除此自定义案例？')) {
      deleteCustomCase(caseId)
    }
  }

  const allPlanEntries = useMemo(() => {
    const entries: {
      studentId: string
      studentName: string
      levelId: string
      levelName: string
      planIndex: number
      plan: DispatchPlan
      result: SimulationResult
      timestamp: number
    }[] = []
    for (const record of studentRecords) {
      const student = allStudents.find((s) => s.id === record.studentId)
      const studentName = student?.name ?? record.studentId
      const levelName = getLevelName(record.levelId)
      record.plans.forEach((p, idx) => {
        entries.push({
          studentId: record.studentId,
          studentName,
          levelId: record.levelId,
          levelName,
          planIndex: idx,
          plan: p.plan,
          result: p.result,
          timestamp: p.timestamp,
        })
      })
    }
    return entries.sort((a, b) => b.timestamp - a.timestamp)
  }, [studentRecords, allStudents, allLevels])

  const filteredEntries = useMemo(() => {
    return allPlanEntries.filter((e) => {
      if (selectedStudentId !== 'all' && e.studentId !== selectedStudentId) return false
      if (selectedLevelFilter !== 'all' && e.levelId !== selectedLevelFilter) return false
      return true
    })
  }, [allPlanEntries, selectedStudentId, selectedLevelFilter])

  const uniqueLevelIds = useMemo(() => {
    const ids = new Set<string>()
    allPlanEntries.forEach((e) => ids.add(e.levelId))
    return Array.from(ids)
  }, [allPlanEntries])

  const toggleCompare = (key: string) => {
    if (!compareKeys) {
      setCompareKeys([key, ''])
    } else if (compareKeys[1] === '') {
      if (compareKeys[0] === key) return
      setCompareKeys([compareKeys[0], key])
      setCompareMode(true)
    } else {
      setCompareKeys(null)
      setCompareMode(false)
    }
  }

  const entryKey = (e: { studentId: string; levelId: string; planIndex: number }) =>
    `${e.studentId}::${e.levelId}::${e.planIndex}`

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-gray-200 mb-6">
        {(['cases', 'records'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setCompareMode(false); setCompareKeys(null) }}
            className={`relative px-6 py-3 text-sm font-medium transition ${
              activeTab === tab ? 'text-green-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'cases' ? '自定义案例' : '学员记录'}
            {activeTab === tab && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600"
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'cases' ? (
          <motion.div
            key="cases"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-auto"
          >
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold" style={{ color: '#1B5E20' }}>自定义案例</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition hover:opacity-90"
                style={{ backgroundColor: '#2E7D32' }}
              >
                <Plus className="w-4 h-4" />
                创建新案例
              </button>
            </div>

            {customCases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Plus className="w-12 h-12 mb-3" />
                <p className="text-sm">暂无自定义案例，点击上方按钮创建</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customCases.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-800">{c.name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="px-2 py-0.5 rounded bg-green-50 text-green-700">
                            {SCENE_OPTIONS.find((s) => s.value === c.level.scene)?.label}
                          </span>
                          <span>难度 {c.level.difficulty}</span>
                          <span>已分配 {c.assignedStudents.length} 人</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingCaseId(c.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-500 transition"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCase(c.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setAssigningCaseId(c.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-green-500 transition"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mb-2">
                      <div>面积: {c.level.area}亩</div>
                      <div>药量: {c.level.chemicalLimit}L</div>
                      <div>预算: ¥{c.level.budget}</div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Cloud className="w-3 h-3" />
                      <span>{c.level.weatherTimeline.length}个天气节点</span>
                      <Plane className="w-3 h-3 ml-2" />
                      <span>{c.level.availableDrones.map((d) => DRONE_OPTIONS.find((o) => o.id === d)?.name ?? d).join('、')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="records"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-auto"
          >
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold" style={{ color: '#1B5E20' }}>班级作业记录</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setCompareMode((v) => !v)
                    if (compareMode) { setCompareKeys(null) }
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    compareMode ? 'bg-green-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <GitCompareArrows className="w-4 h-4" />
                  {compareMode ? '取消对比' : '方案对比'}
                </button>
              </div>
            </div>

            <div className="flex gap-3 mb-5">
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
              >
                <option value="all">全部学员</option>
                {allStudents.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <select
                value={selectedLevelFilter}
                onChange={(e) => setSelectedLevelFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
              >
                <option value="all">全部关卡</option>
                {uniqueLevelIds.map((lid) => (
                  <option key={lid} value={lid}>{getLevelName(lid)}</option>
                ))}
              </select>
            </div>

            {filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Star className="w-12 h-12 mb-3" />
                <p className="text-sm">暂无作业记录</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEntries.map((entry) => {
                  const key = entryKey(entry)
                  const isExpanded = expandedRecord === key
                  const isSelected = compareKeys && (compareKeys[0] === key || compareKeys[1] === key)
                  return (
                    <div
                      key={key}
                      className={`bg-white rounded-xl shadow-sm border transition ${
                        isSelected ? 'border-green-400 ring-1 ring-green-200' : 'border-gray-100'
                      }`}
                    >
                      <div
                        className="flex items-center gap-4 px-5 py-3 cursor-pointer hover:bg-gray-50 transition"
                        onClick={() => { if (!compareMode) setExpandedRecord(isExpanded ? null : key) }}
                      >
                        {compareMode && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleCompare(key) }}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${
                              isSelected ? 'bg-green-600 border-green-600' : 'border-gray-300 hover:border-green-400'
                            }`}
                          >
                            {isSelected && <span className="text-white text-xs">✓</span>}
                          </button>
                        )}
                        <span className="text-gray-500 text-sm w-28">{entry.studentName}</span>
                        <span className="text-gray-800 text-sm font-medium w-36 truncate">{entry.levelName}</span>
                        <span className="text-gray-400 text-xs w-24">{new Date(entry.timestamp).toLocaleDateString()}</span>
                        <span className="flex items-center gap-0.5">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < entry.result.stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </span>
                        <span className="text-gray-600 text-xs">亩效 {Math.round(entry.result.acreEfficiency)}</span>
                        <span className="text-gray-600 text-xs">准时 {Math.round(entry.result.onTimeRate)}</span>
                        <span className="text-gray-600 text-xs">安全 {Math.round(entry.result.safetyScore)}</span>
                        <span className="text-gray-600 text-xs">成本 {Math.round(entry.result.costScore)}</span>
                        {!compareMode && (
                          isExpanded
                            ? <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
                            : <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                        )}
                      </div>

                      <AnimatePresence>
                        {isExpanded && !compareMode && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-4 pt-1 border-t border-gray-100">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <p className="text-gray-500 text-xs">航线数量</p>
                                  <p className="font-semibold text-gray-800">{entry.plan.routes.length}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <p className="text-gray-500 text-xs">机型选择</p>
                                  <p className="font-semibold text-gray-800">
                                    {entry.plan.routes
                                      .map((r) => DRONE_OPTIONS.find((d) => d.id === r.droneModelId)?.name ?? '未分配')
                                      .join('、') || '无'}
                                  </p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <p className="text-gray-500 text-xs">总成本</p>
                                  <p className="font-semibold text-gray-800">¥{Math.round(entry.result.totalCost)}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <p className="text-gray-500 text-xs">总耗时</p>
                                  <p className="font-semibold text-gray-800">{Math.round(entry.result.totalTime)}分钟</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                                <div className="rounded-lg p-3" style={{ borderLeft: '4px solid #4CAF50', backgroundColor: '#F1F8E9' }}>
                                  <p className="text-gray-500 text-xs">亩效</p>
                                  <p className="font-bold text-green-700">{Math.round(entry.result.acreEfficiency)}</p>
                                </div>
                                <div className="rounded-lg p-3" style={{ borderLeft: '4px solid #2196F3', backgroundColor: '#E3F2FD' }}>
                                  <p className="text-gray-500 text-xs">准时率</p>
                                  <p className="font-bold text-blue-700">{Math.round(entry.result.onTimeRate)}</p>
                                </div>
                                <div className="rounded-lg p-3" style={{ borderLeft: '4px solid #FF9800', backgroundColor: '#FFF3E0' }}>
                                  <p className="text-gray-500 text-xs">安全分</p>
                                  <p className="font-bold text-orange-700">{Math.round(entry.result.safetyScore)}</p>
                                </div>
                                <div className="rounded-lg p-3" style={{ borderLeft: '4px solid #9C27B0', backgroundColor: '#F3E5F5' }}>
                                  <p className="text-gray-500 text-xs">成本分</p>
                                  <p className="font-bold text-purple-700">{Math.round(entry.result.costScore)}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <p className="text-gray-500 text-xs">重叠率</p>
                                  <p className="font-semibold text-gray-800">{entry.result.overlapPercentage.toFixed(1)}%</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <p className="text-gray-500 text-xs">漏喷率</p>
                                  <p className="font-semibold text-gray-800">{entry.result.missPercentage.toFixed(1)}%</p>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            )}

            <AnimatePresence>
              {compareMode && compareKeys && compareKeys[1] !== '' && (
                <CompareView
                  entries={allPlanEntries}
                  keyA={compareKeys[0]}
                  keyB={compareKeys[1]}
                  getLevelName={getLevelName}
                  onClose={() => { setCompareKeys(null); setCompareMode(false) }}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold" style={{ color: '#1B5E20' }}>创建新案例</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">案例名称</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                    placeholder="输入案例名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">场景类型</label>
                  <select
                    value={form.scene}
                    onChange={(e) => setForm({ ...form, scene: e.target.value as SceneType })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
                  >
                    {SCENE_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">难度: {form.difficulty}</label>
                  <input
                    type="range" min={1} max={5}
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: Number(e.target.value) })}
                    className="w-full accent-green-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">面积(亩)</label>
                    <input type="number" value={form.area}
                      onChange={(e) => setForm({ ...form, area: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">药量限制(L)</label>
                    <input type="number" value={form.chemicalLimit}
                      onChange={(e) => setForm({ ...form, chemicalLimit: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">时间限制(min)</label>
                    <input type="number" value={form.timeLimit}
                      onChange={(e) => setForm({ ...form, timeLimit: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">预算(元)</label>
                    <input type="number" value={form.budget}
                      onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                  取消
                </button>
                <button onClick={handleCreateCase} disabled={!form.name.trim()}
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#2E7D32' }}>
                  保存
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {assigningCaseId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setAssigningCaseId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs"
            >
              <h3 className="text-base font-bold mb-4" style={{ color: '#1B5E20' }}>分配学员</h3>
              <div className="space-y-2">
                {allStudents.map((s) => {
                  const caseItem = customCases.find((c) => c.id === assigningCaseId)
                  const isAssigned = caseItem?.assignedStudents.includes(s.id) ?? false
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleAssignStudent(assigningCaseId!, s.id)}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition ${
                        isAssigned ? 'bg-green-50 text-green-700' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className="flex items-center justify-between">
                        <span>{s.name}</span>
                        <span className="text-xs">{isAssigned ? '点击取消' : '点击分配'}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => setAssigningCaseId(null)}
                className="w-full mt-4 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                关闭
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingCaseId && (
          <EditCaseModal
            caseId={editingCaseId}
            onClose={() => setEditingCaseId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function CompareView({ entries, keyA, keyB, getLevelName, onClose }: {
  entries: any[]
  keyA: string
  keyB: string
  getLevelName: (id: string) => string
  onClose: () => void
}) {
  const parseKey = (k: string) => {
    const [studentId, levelId, idx] = k.split('::')
    return { studentId, levelId, planIndex: Number(idx) }
  }
  const a = parseKey(keyA)
  const b = parseKey(keyB)
  const entryA = entries.find((e) => e.studentId === a.studentId && e.levelId === a.levelId && e.planIndex === a.planIndex)
  const entryB = entries.find((e) => e.studentId === b.studentId && e.levelId === b.levelId && e.planIndex === b.planIndex)

  if (!entryA || !entryB) return null

  const metrics: { key: string; label: string; lowerBetter?: boolean }[] = [
    { key: 'stars', label: '星级' },
    { key: 'totalCost', label: '总成本(元)', lowerBetter: true },
    { key: 'overlapPercentage', label: '重叠率(%)', lowerBetter: true },
    { key: 'missPercentage', label: '漏喷率(%)', lowerBetter: true },
    { key: 'acreEfficiency', label: '亩效' },
    { key: 'onTimeRate', label: '准时率' },
    { key: 'safetyScore', label: '安全分' },
    { key: 'costScore', label: '成本分' },
  ]

  const getVal = (obj: any, k: string) => {
    if (k === 'stars') return obj[k]
    return Math.round(obj[k] * 10) / 10
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold" style={{ color: '#1B5E20' }}>方案对比</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="font-semibold text-gray-500">指标</div>
          <div className="font-semibold text-center text-blue-700">
            {entryA.studentName} - {entryA.levelName}
          </div>
          <div className="font-semibold text-center text-orange-700">
            {entryB.studentName} - {entryB.levelName}
          </div>

          {metrics.map((m) => {
            const valA = getVal(entryA.result, m.key)
            const valB = getVal(entryB.result, m.key)
            const numA = typeof valA === 'number' ? valA : 0
            const numB = typeof valB === 'number' ? valB : 0
            const better = m.lowerBetter ? numA < numB : numA > numB
            return (
              <div key={m.key} className="contents">
                <div className="py-2 text-gray-600 border-b border-gray-100">{m.label}</div>
                <div className={`py-2 text-center font-medium border-b border-gray-100 ${
                  better ? 'text-green-600' : numA === numB ? 'text-gray-700' : 'text-gray-400'
                }`}>
                  {m.key === 'stars' ? '⭐'.repeat(valA as number) || '0' : valA}
                </div>
                <div className={`py-2 text-center font-medium border-b border-gray-100 ${
                  !better ? 'text-green-600' : numA === numB ? 'text-gray-700' : 'text-gray-400'
                }`}>
                  {m.key === 'stars' ? '⭐'.repeat(valB as number) || '0' : valB}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-end mt-5">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            关闭
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function EditCaseModal({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const customCases = useGameStore((s) => s.customCases)
  const updateCustomCase = useGameStore((s) => s.updateCustomCase)
  const caseItem = customCases.find((c) => c.id === caseId)

  const [weatherNodes, setWeatherNodes] = useState<WeatherNode[]>(
    caseItem?.level.weatherTimeline ?? [{ time: 0, type: 'sunny', windSpeed: 0, windDirection: 0 }]
  )
  const [availableDrones, setAvailableDrones] = useState<string[]>(
    caseItem?.level.availableDrones ?? ['yunbee-10', 'yunbee-16']
  )

  if (!caseItem) return null

  const addWeatherNode = () => {
    const lastTime = weatherNodes.length > 0 ? weatherNodes[weatherNodes.length - 1].time : 0
    setWeatherNodes([...weatherNodes, { time: lastTime + 30, type: 'sunny', windSpeed: 0, windDirection: 0 }])
  }

  const removeWeatherNode = (idx: number) => {
    if (weatherNodes.length <= 1) return
    setWeatherNodes(weatherNodes.filter((_, i) => i !== idx))
  }

  const updateWeatherNode = (idx: number, updates: Partial<WeatherNode>) => {
    setWeatherNodes(weatherNodes.map((n, i) => (i === idx ? { ...n, ...updates } : n)))
  }

  const toggleDrone = (droneId: string) => {
    setAvailableDrones((prev) =>
      prev.includes(droneId) ? prev.filter((d) => d !== droneId) : [...prev, droneId]
    )
  }

  const handleSave = () => {
    updateCustomCase(caseId, {
      level: {
        ...caseItem.level,
        weatherTimeline: weatherNodes,
        availableDrones,
      },
    })
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold" style={{ color: '#1B5E20' }}>编辑案例 — {caseItem.name}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">天气节点</label>
              <button onClick={addWeatherNode}
                className="flex items-center gap-1 px-2 py-1 text-xs text-green-700 bg-green-50 rounded hover:bg-green-100 transition">
                <Plus className="w-3 h-3" />添加节点
              </button>
            </div>
            <div className="space-y-2">
              {weatherNodes.map((node, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-xs text-gray-400">时间</label>
                      <input
                        type="number" min={0} max={100}
                        value={node.time}
                        onChange={(e) => updateWeatherNode(idx, { time: Number(e.target.value) })}
                        className="w-full px-2 py-1 border rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">天气</label>
                      <select
                        value={node.type}
                        onChange={(e) => updateWeatherNode(idx, { type: e.target.value as WeatherType })}
                        className="w-full px-2 py-1 border rounded text-xs bg-white"
                      >
                        {WEATHER_OPTIONS.map((w) => (
                          <option key={w.value} value={w.value}>{w.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">风速(m/s)</label>
                      <input
                        type="number" min={0} max={20}
                        value={node.windSpeed}
                        onChange={(e) => updateWeatherNode(idx, { windSpeed: Number(e.target.value) })}
                        className="w-full px-2 py-1 border rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">风向(°)</label>
                      <input
                        type="number" min={0} max={360}
                        value={node.windDirection}
                        onChange={(e) => updateWeatherNode(idx, { windDirection: Number(e.target.value) })}
                        className="w-full px-2 py-1 border rounded text-xs"
                      />
                    </div>
                  </div>
                  {weatherNodes.length > 1 && (
                    <button
                      onClick={() => removeWeatherNode(idx)}
                      className="p-1 text-gray-400 hover:text-red-500 transition"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">可用机型</label>
            <div className="space-y-1.5">
              {DRONE_OPTIONS.map((drone) => (
                <label key={drone.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                  <input
                    type="checkbox"
                    checked={availableDrones.includes(drone.id)}
                    onChange={() => toggleDrone(drone.id)}
                    className="accent-green-600"
                  />
                  <span className="text-sm text-gray-700">{drone.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            取消
          </button>
          <button onClick={handleSave}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium transition hover:opacity-90"
            style={{ backgroundColor: '#2E7D32' }}>
            保存修改
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
