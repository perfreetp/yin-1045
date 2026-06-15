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
} from 'lucide-react'
import { useGameStore } from '@/stores/gameStore'
import type { SceneType, CustomCase, Level } from '@/types'

const SCENE_OPTIONS: { value: SceneType; label: string }[] = [
  { value: 'paddy', label: '水稻田' },
  { value: 'orchard', label: '果园' },
  { value: 'hillside', label: '丘陵' },
  { value: 'scatter', label: '零散地块' },
]

const MOCK_STUDENTS = [
  { id: 's1', name: '张三' },
  { id: 's2', name: '李四' },
  { id: 's3', name: '王五' },
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
  const { customCases, studentRecords, addCustomCase } = useGameStore()
  const [activeTab, setActiveTab] = useState<'cases' | 'records'>('cases')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [form, setForm] = useState<CaseFormData>(DEFAULT_FORM)
  const [selectedStudentId, setSelectedStudentId] = useState('s1')
  const [assigningCaseId, setAssigningCaseId] = useState<string | null>(null)

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
    if (caseItem.assignedStudents.includes(studentId)) return
    const updated: CustomCase = {
      ...caseItem,
      assignedStudents: [...caseItem.assignedStudents, studentId],
    }
    useGameStore.setState((state) => ({
      customCases: state.customCases.map((c) => (c.id === caseId ? updated : c)),
    }))
    setAssigningCaseId(null)
  }

  const handleDeleteCase = (caseId: string) => {
    useGameStore.setState((state) => ({
      customCases: state.customCases.filter((c) => c.id !== caseId),
    }))
  }

  const studentAttempts = useMemo(() => {
    return studentRecords.filter((r) => r.studentId === selectedStudentId)
  }, [studentRecords, selectedStudentId])

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-gray-200 mb-6">
        {(['cases', 'records'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
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
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-500 transition">
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
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                      <div>面积: {c.level.area}亩</div>
                      <div>药量: {c.level.chemicalLimit}L</div>
                      <div>预算: ¥{c.level.budget}</div>
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
              <h2 className="text-lg font-bold" style={{ color: '#1B5E20' }}>学员记录</h2>
              <button
                onClick={() => alert('功能开发中')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                <Download className="w-4 h-4" />
                导出记录
              </button>
            </div>

            <div className="mb-5">
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
              >
                {MOCK_STUDENTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {studentAttempts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Star className="w-12 h-12 mb-3" />
                <p className="text-sm">该学员暂无作业记录</p>
              </div>
            ) : (
              <div className="space-y-6">
                {studentAttempts.map((record) => {
                  const levelName = record.levelId
                  const plans = record.plans
                  return (
                    <div key={record.levelId} className="bg-white rounded-xl shadow-sm p-5">
                      <h3 className="font-semibold text-gray-800 mb-3">{levelName}</h3>

                      <div className="space-y-2 mb-5">
                        {plans.map((plan, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-4 px-3 py-2 rounded-lg bg-gray-50 text-sm"
                          >
                            <span className="text-gray-500 w-20">
                              {new Date(plan.timestamp).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              {Array.from({ length: 3 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < plan.result.stars
                                      ? 'text-yellow-400 fill-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </span>
                            <span className="text-gray-600">
                              亩效 {plan.result.acreEfficiency}
                            </span>
                            <span className="text-gray-600">
                              准时 {plan.result.onTimeRate}
                            </span>
                            <span className="text-gray-600">
                              安全 {plan.result.safetyScore}
                            </span>
                            <span className="text-gray-600">
                              成本 {plan.result.costScore}
                            </span>
                          </div>
                        ))}
                      </div>

                      {plans.length >= 2 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 mb-2">成绩趋势</h4>
                          <div className="flex items-end gap-2 h-32 px-2">
                            {plans.map((plan, idx) => (
                              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                                <div className="flex items-end gap-0.5 h-24">
                                  {(['acreEfficiency', 'onTimeRate', 'safetyScore', 'costScore'] as const).map(
                                    (metric) => {
                                      const val = plan.result[metric]
                                      const height = Math.max(val * 0.24, 2)
                                      return (
                                        <div
                                          key={metric}
                                          className="w-2 rounded-t"
                                          style={{
                                            height: `${height}px`,
                                            backgroundColor: METRIC_COLORS[metric],
                                          }}
                                          title={`${METRIC_LABELS[metric]}: ${val}`}
                                        />
                                      )
                                    },
                                  )}
                                </div>
                                <span className="text-xs text-gray-400">第{idx + 1}次</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-4 mt-2 px-2">
                            {(['acreEfficiency', 'onTimeRate', 'safetyScore', 'costScore'] as const).map(
                              (metric) => (
                                <div key={metric} className="flex items-center gap-1 text-xs text-gray-500">
                                  <div
                                    className="w-2.5 h-2.5 rounded-sm"
                                    style={{ backgroundColor: METRIC_COLORS[metric] }}
                                  />
                                  {METRIC_LABELS[metric]}
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
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
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
                >
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    难度: {form.difficulty}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={5}
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
                    <input
                      type="number"
                      value={form.area}
                      onChange={(e) => setForm({ ...form, area: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">药量限制(L)</label>
                    <input
                      type="number"
                      value={form.chemicalLimit}
                      onChange={(e) => setForm({ ...form, chemicalLimit: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">时间限制(min)</label>
                    <input
                      type="number"
                      value={form.timeLimit}
                      onChange={(e) => setForm({ ...form, timeLimit: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">预算(元)</label>
                    <input
                      type="number"
                      value={form.budget}
                      onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateCase}
                  disabled={!form.name.trim()}
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#2E7D32' }}
                >
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
                {MOCK_STUDENTS.map((s) => {
                  const caseItem = customCases.find((c) => c.id === assigningCaseId)
                  const isAssigned = caseItem?.assignedStudents.includes(s.id)
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleAssignStudent(assigningCaseId, s.id)}
                      disabled={isAssigned}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition ${
                        isAssigned
                          ? 'bg-green-50 text-green-700 cursor-default'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {s.name}
                      {isAssigned && <span className="ml-2 text-xs text-green-500">已分配</span>}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => setAssigningCaseId(null)}
                className="w-full mt-4 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                关闭
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
