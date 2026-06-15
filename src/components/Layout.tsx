import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Plane, Map, BookOpen, GraduationCap, User, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useGameStore } from '@/stores/gameStore'

const navItems = [
  { to: '/', label: '关卡地图', icon: Map },
  { to: '/encyclopedia', label: '知识图鉴', icon: BookOpen },
  { to: '/teacher', label: '教师管理', icon: GraduationCap },
]

const pageNames: Record<string, string> = {
  '/': '关卡地图',
  '/encyclopedia': '知识图鉴',
  '/teacher': '教师管理',
  '/mission': '任务面板',
  '/dispatch': '调度沙盘',
  '/result': '结果结算',
}

function StudentSelector() {
  const currentStudent = useGameStore((s) => s.currentStudent)
  const getAllStudents = useGameStore((s) => s.getAllStudents)
  const setCurrentStudent = useGameStore((s) => s.setCurrentStudent)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const students = getAllStudents()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition"
      >
        <User className="w-4 h-4 text-white/70" />
        <span className="flex-1 text-left text-sm text-white/90 truncate">{currentStudent.name}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-white/50" /> : <ChevronDown className="w-3.5 h-3.5 text-white/50" />}
      </button>
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
          <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-100">切换学员</div>
          {students.map((s) => (
            <button
              key={s.id}
              onClick={() => { setCurrentStudent(s); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition hover:bg-gray-50 ${
                s.id === currentStudent.id ? 'text-green-700 bg-green-50' : 'text-gray-700'
              }`}
            >
              <span className="flex-1 text-left">{s.name}</span>
              {s.id === currentStudent.id && <Check className="w-4 h-4 text-green-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const location = useLocation()
  const pathPrefix = '/' + location.pathname.split('/')[1]
  const currentPage = pageNames[location.pathname] || pageNames[pathPrefix] || '植保调度仿真'
  const isFullscreen = pathPrefix === '/dispatch'
  const currentStudent = useGameStore((s) => s.currentStudent)

  return (
    <div className="flex h-screen overflow-hidden">
      {!isFullscreen && (
        <aside className="w-64 flex flex-col shrink-0" style={{ backgroundColor: '#1B5E20' }}>
          <div className="flex items-center gap-3 px-6 py-6">
            <Plane className="w-8 h-8" style={{ color: '#F9A825' }} />
            <span className="font-display text-xl font-bold" style={{ color: '#F9A825' }}>
              植保调度仿真
            </span>
          </div>

          <nav className="flex-1 px-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? 'text-yellow-300 bg-white/15'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="px-3 pb-6">
            <StudentSelector />
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0" style={{ backgroundColor: isFullscreen ? '#263238' : '#FFF8E1' }}>
        {!isFullscreen && (
          <header className="flex items-center justify-between px-8 py-3 bg-white/50 border-b border-black/5">
            <span className="font-display text-lg font-semibold" style={{ color: '#1B5E20' }}>
              {currentPage}
            </span>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" style={{ color: '#1B5E20' }} />
              <span className="text-sm" style={{ color: '#1B5E20' }}>{currentStudent.name}</span>
            </div>
          </header>
        )}

        <main className={`flex-1 ${isFullscreen ? '' : 'overflow-auto'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
