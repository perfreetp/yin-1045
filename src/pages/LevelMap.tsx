import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wheat, TreePine, Mountain, LayoutGrid, Star, CheckCircle } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import StarRating from '@/components/StarRating';
import type { SceneType } from '@/types';

const SCENE_CONFIG: Record<SceneType, {
  label: string;
  gradient: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = {
  paddy: {
    label: '水稻田',
    gradient: 'from-[#4CAF50] to-[#2E7D32]',
    Icon: Wheat,
  },
  orchard: {
    label: '果园',
    gradient: 'from-[#8BC34A] to-[#558B2F]',
    Icon: TreePine,
  },
  hillside: {
    label: '丘陵',
    gradient: 'from-[#795548] to-[#4E342E]',
    Icon: Mountain,
  },
  scatter: {
    label: '零散地块',
    gradient: 'from-[#607D8B] to-[#37474F]',
    Icon: LayoutGrid,
  },
};

type FilterKey = 'all' | SceneType;

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'paddy', label: '水稻田' },
  { key: 'orchard', label: '果园' },
  { key: 'hillside', label: '丘陵' },
  { key: 'scatter', label: '零散地块' },
];

function getRank(totalStars: number): string {
  if (totalStars >= 16) return '大师';
  if (totalStars >= 10) return '调度员';
  if (totalStars >= 4) return '学徒';
  return '实习生';
}

function getRankColor(totalStars: number): string {
  if (totalStars >= 16) return 'text-yellow-500';
  if (totalStars >= 10) return 'text-purple-500';
  if (totalStars >= 4) return 'text-blue-500';
  return 'text-gray-500';
}

function ProgressRing({ progress, totalStars, maxStars }: {
  progress: number;
  totalStars: number;
  maxStars: number;
}) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="120" height="120" className="-rotate-90">
        <circle
          cx="60" cy="60" r={radius}
          fill="none" stroke="#e5e7eb" strokeWidth="8"
        />
        <circle
          cx="60" cy="60" r={radius}
          fill="none" stroke="#1B5E20" strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-[#1B5E20]">{totalStars}</span>
        <span className="text-xs text-gray-400">/{maxStars}</span>
      </div>
    </div>
  );
}

export default function LevelMap() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const navigate = useNavigate();
  const availableLevels = useGameStore((s) => s.availableLevels);
  const customCases = useGameStore((s) => s.customCases);
  const getLevelStars = useGameStore((s) => s.getLevelStars);

  const isCustomCase = (levelId: string) => {
    return customCases.some((c) => c.level.id === levelId);
  };

  const filteredLevels = useMemo(() => {
    if (activeFilter === 'all') return availableLevels;
    return availableLevels.filter((l) => l.scene === activeFilter);
  }, [availableLevels, activeFilter]);

  const totalStars = useMemo(
    () => availableLevels.reduce((sum, l) => sum + getLevelStars(l.id), 0),
    [availableLevels, getLevelStars]
  );
  const maxStars = availableLevels.length * 3;
  const progress = maxStars > 0 ? (totalStars / maxStars) * 100 : 0;
  const rank = getRank(totalStars);
  const rankColor = getRankColor(totalStars);

  const completedLevels = useMemo(
    () => availableLevels.filter((l) => getLevelStars(l.id) > 0),
    [availableLevels, getLevelStars]
  );

  return (
    <div className="min-h-full bg-gray-50 flex">
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1B5E20]">选择训练场景</h1>
          <p className="mt-1 text-gray-500">在接近真实的任务约束下学习航线调度</p>
        </div>

        <div className="flex items-center gap-1 mb-6 rounded-lg bg-[#1B5E20] p-1 w-fit">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`relative px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeFilter === tab.key
                  ? 'text-white'
                  : 'text-green-200 hover:text-white'
              }`}
            >
              {tab.label}
              {activeFilter === tab.key && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-2 right-2 h-0.5 bg-yellow-400 rounded-full"
                />
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {filteredLevels.map((level, index) => {
            const config = SCENE_CONFIG[level.scene];
            const stars = getLevelStars(level.id);
            const Icon = config.Icon;

            return (
              <motion.div
                key={level.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                onClick={() => navigate(`/mission/${level.id}`)}
                className="rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-white"
              >
                <div className={`relative h-36 bg-gradient-to-br ${config.gradient} flex items-center justify-center`}>
                  <Icon className="w-16 h-16 text-white opacity-80" />
                  <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/30 rounded-full px-2 py-0.5">
                    {Array.from({ length: level.difficulty }, (_, i) => (
                      <Star key={i} size={10} className="fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  {isCustomCase(level.id) && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#F9A825] text-[#1B5E20] text-xs font-bold rounded-full">
                      教师布置
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-800">{level.name}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {config.label} · {level.area}亩
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <StarRating count={stars} />
                    <button className="px-3 py-1 bg-[#1B5E20] text-white text-sm rounded-md hover:bg-[#2E7D32] transition-colors">
                      进入关卡
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="hidden lg:flex flex-col w-56 border-l border-gray-200 bg-white p-5 shrink-0">
        <h2 className="text-lg font-bold text-gray-800 mb-4">训练进度</h2>

        <div className="flex justify-center mb-4">
          <ProgressRing progress={progress} totalStars={totalStars} maxStars={maxStars} />
        </div>

        <div className="flex justify-center mb-5">
          <span className={`text-xl font-bold ${rankColor}`}>{rank}</span>
        </div>

        {completedLevels.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-500 mb-2">已完成</h3>
            {completedLevels.map((level) => (
              <div key={level.id} className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle size={14} className="text-green-600 shrink-0" />
                <span className="truncate">{level.name}</span>
              </div>
            ))}
          </div>
        )}

        {completedLevels.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-2">尚无完成记录</p>
        )}
      </div>
    </div>
  );
}
