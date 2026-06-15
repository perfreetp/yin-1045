import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Maximize, Beaker, Clock, Wallet, Wind, Users, Ban, AlertTriangle } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { StarRating } from '@/components/StarRating';
import { WeatherBar } from '@/components/WeatherBar';
import type { SceneType, MetricType, RandomEventType } from '@/types';
import { cn } from '@/lib/utils';

const SCENE_LABELS: Record<SceneType, string> = {
  paddy: '水稻田',
  orchard: '果园',
  hillside: '丘陵',
  scatter: '零散地块',
};

const SCENE_COLORS: Record<SceneType, string> = {
  paddy: 'bg-green-100 text-green-800',
  orchard: 'bg-orange-100 text-orange-800',
  hillside: 'bg-amber-100 text-amber-800',
  scatter: 'bg-blue-100 text-blue-800',
};

const METRIC_LABELS: Record<MetricType, string> = {
  acreEfficiency: '亩效',
  onTimeRate: '准点率',
  safetyScore: '安全分',
  costScore: '成本分',
};

const EVENT_ICONS: Record<RandomEventType, typeof Wind> = {
  gust: Wind,
  crowd: Users,
  road_closed: Ban,
  rush_order: AlertTriangle,
};

export default function MissionPanel() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const levels = useGameStore((s) => s.levels);
  const drones = useGameStore((s) => s.drones);
  const setCurrentLevel = useGameStore((s) => s.setCurrentLevel);

  const level = levels.find((l) => l.id === id);

  if (!level) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <p className="text-gray-500">关卡未找到</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 text-green-700 underline"
        >
          返回关卡地图
        </button>
      </div>
    );
  }

  const availableDrones = drones.filter((d) =>
    level.availableDrones.includes(d.id)
  );

  const maxPayload = Math.max(...drones.map((d) => d.payload));
  const maxEndurance = Math.max(...drones.map((d) => d.endurance));
  const maxSpeed = Math.max(...drones.map((d) => d.speed));
  const maxSprayWidth = Math.max(...drones.map((d) => d.sprayWidth));

  const handleStart = () => {
    setCurrentLevel(level.id);
    navigate(`/dispatch/${level.id}`);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>返回关卡地图</span>
      </button>

      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold text-gray-900">{level.name}</h1>
        <span
          className={cn(
            'px-3 py-1 rounded-full text-sm font-medium',
            SCENE_COLORS[level.scene]
          )}
        >
          {SCENE_LABELS[level.scene]}
        </span>
      </div>

      <p className="text-gray-600 text-lg leading-relaxed">
        {level.description}
      </p>

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl bg-white shadow p-4">
          <Maximize className="w-5 h-5 text-green-600 mb-2" />
          <p className="text-sm text-gray-500">面积</p>
          <p className="text-2xl font-bold text-green-800">{level.area}亩</p>
        </div>
        <div className="rounded-xl bg-white shadow p-4">
          <Beaker className="w-5 h-5 text-green-600 mb-2" />
          <p className="text-sm text-gray-500">药剂限量</p>
          <p className="text-2xl font-bold text-green-800">{level.chemicalLimit}L</p>
        </div>
        <div className="rounded-xl bg-white shadow p-4">
          <Clock className="w-5 h-5 text-green-600 mb-2" />
          <p className="text-sm text-gray-500">交付时限</p>
          <p className="text-2xl font-bold text-green-800">{level.timeLimit}分钟</p>
        </div>
        <div className="rounded-xl bg-white shadow p-4">
          <Wallet className="w-5 h-5 text-green-600 mb-2" />
          <p className="text-sm text-gray-500">预算</p>
          <p className="text-2xl font-bold text-green-800">{level.budget}元</p>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-3">天气预报</h2>
        <WeatherBar timeline={level.weatherTimeline} />
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-3">可用机型</h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {availableDrones.map((drone) => (
            <div
              key={drone.id}
              className="min-w-48 rounded-lg bg-white shadow p-4 shrink-0"
            >
              <p className="font-bold text-gray-900 mb-3">{drone.name}</p>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                    <span>载药量</span>
                    <span>{drone.payload}L</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${(drone.payload / maxPayload) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                    <span>续航</span>
                    <span>{drone.endurance}min</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(drone.endurance / maxEndurance) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                    <span>速度</span>
                    <span>{drone.speed}m/s</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${(drone.speed / maxSpeed) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                    <span>喷幅</span>
                    <span>{drone.sprayWidth}m</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${(drone.sprayWidth / maxSprayWidth) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm font-semibold text-green-700">
                {drone.costPerSortie}元/架次
              </p>
            </div>
          ))}
        </div>
      </div>

      {level.events.length > 0 && (
        <div
          className="rounded-lg border-l-4 p-4 space-y-2"
          style={{ borderColor: '#EF6C00', backgroundColor: '#FFF8E1' }}
        >
          <h3 className="font-bold text-gray-900">⚠ 突发事件预告</h3>
          <ul className="space-y-1">
            {level.events.map((event) => {
              const Icon = EVENT_ICONS[event.type];
              return (
                <li key={event.id} className="flex items-start gap-2 text-gray-700 text-sm">
                  <Icon className="w-4 h-4 mt-0.5 shrink-0 text-orange-600" />
                  <span>{event.description}</span>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-gray-500">
            以下事件可能在作业过程中触发，请做好应对准备
          </p>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-3">目标与评级</h2>
        <div className="space-y-3">
          {level.starTargets.map((target) => (
            <div
              key={target.stars}
              className="flex items-center gap-4 rounded-lg bg-white shadow px-4 py-3"
            >
              <StarRating stars={target.stars} />
              <span className="text-gray-700 text-sm">
                {target.conditions
                  .map(
                    (c) =>
                      `${METRIC_LABELS[c.metric]} > ${c.min}%`
                  )
                  .join(' AND ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button
          onClick={handleStart}
          className="flex-1 py-3 px-6 rounded-lg text-white font-bold text-lg bg-green-700 hover:bg-green-800 transition-colors"
        >
          开始调度
        </button>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 rounded-lg font-bold text-lg border-2 border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
        >
          返回
        </button>
      </div>
    </div>
  );
}
