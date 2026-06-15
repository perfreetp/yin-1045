import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MousePointer, PenTool, Battery, Eraser,
  Play, Pause, Plus, X, ArrowLeft,
  AlertTriangle, AlertCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import {
  evaluatePlan, getActiveEvents,
  calculateTotalCost, checkDangerousCrossings,
} from '@/engine/simulation';
import EventNotification from '@/components/EventNotification';
import type { Route as TRoute, SceneType, Level } from '@/types';

const ROUTE_COLORS = ['#42A5F5', '#AB47BC', '#FF7043', '#26C6DA', '#FFCA28', '#66BB6A'];
const SCENE_FILL: Record<SceneType, string> = {
  paddy: 'rgba(102,187,106,0.35)', orchard: 'rgba(174,213,129,0.35)',
  hillside: 'rgba(141,110,99,0.35)', scatter: 'rgba(120,144,156,0.35)',
};
type Tool = 'select' | 'draw' | 'supply' | 'eraser';

function drawPoly(
  ctx: CanvasRenderingContext2D,
  pts: { x: number; y: number }[],
  fill: string, stroke?: string, dash?: number[],
) {
  if (pts.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.setLineDash(dash ?? []);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function CanvasMap({
  level, routes, selectedRouteId, selectedTool,
  simulationTime, isSimulating, onCanvasClick,
}: {
  level: Level;
  routes: TRoute[];
  selectedRouteId: string | null;
  selectedTool: Tool;
  simulationTime: number;
  isSimulating: boolean;
  onCanvasClick: (x: number, y: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [transform, setTransform] = useState({ offsetX: 0, offsetY: 0, zoom: 1 });
  const isPanning = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setTransform((p) => ({
        ...p,
        zoom: Math.max(0.5, Math.min(3, p.zoom - e.deltaY * 0.001)),
      }));
    };
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const { width, height } = canvas;

    ctx.fillStyle = '#263238';
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(transform.offsetX, transform.offsetY);
    ctx.scale(transform.zoom, transform.zoom);

    for (const field of level.fields) {
      drawPoly(ctx, field.polygon, SCENE_FILL[level.scene], 'rgba(255,255,255,0.6)');
      const cx = field.polygon.reduce((s, p) => s + p.x, 0) / field.polygon.length;
      const cy = field.polygon.reduce((s, p) => s + p.y, 0) / field.polygon.length;
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(field.name, cx, cy);
    }

    for (const obs of level.obstacles) {
      drawPoly(ctx, obs.polygon, 'rgba(239,83,80,0.5)', 'rgba(239,83,80,0.8)', [6, 4]);
    }

    for (const route of routes) {
      const wps = route.waypoints;
      if (wps.length >= 2) {
        for (let i = 0; i < wps.length - 1; i++) {
          ctx.beginPath();
          ctx.moveTo(wps[i].x, wps[i].y);
          ctx.lineTo(wps[i + 1].x, wps[i + 1].y);
          ctx.strokeStyle = route.color;
          ctx.lineWidth = 2.5;
          ctx.setLineDash(wps[i].isSpraying || wps[i + 1].isSpraying ? [] : [8, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      for (const wp of wps) {
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = route.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      if (isSimulating && wps.length >= 2) {
        const totalLen = wps.slice(0, -1).reduce(
          (s, w, i) => s + Math.hypot(wps[i + 1].x - w.x, wps[i + 1].y - w.y), 0,
        );
        const targetDist = ((simulationTime / 100) % 1) * totalLen;
        let acc = 0;
        for (let i = 0; i < wps.length - 1; i++) {
          const segLen = Math.hypot(wps[i + 1].x - wps[i].x, wps[i + 1].y - wps[i].y);
          if (acc + segLen >= targetDist) {
            const t = (targetDist - acc) / segLen;
            ctx.beginPath();
            ctx.arc(
              wps[i].x + (wps[i + 1].x - wps[i].x) * t,
              wps[i].y + (wps[i + 1].y - wps[i].y) * t,
              7, 0, Math.PI * 2,
            );
            ctx.fillStyle = route.color;
            ctx.globalAlpha = 0.8;
            ctx.fill();
            ctx.globalAlpha = 1;
            break;
          }
          acc += segLen;
        }
      }
      for (const sp of route.supplyPoints) {
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#FFA726';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('B', sp.x, sp.y);
      }
    }
    ctx.restore();
  }, [level, routes, transform, simulationTime, isSimulating, selectedRouteId]);

  const toWorld = useCallback((sx: number, sy: number) => ({
    x: (sx - transform.offsetX) / transform.zoom,
    y: (sy - transform.offsetY) / transform.zoom,
  }), [transform]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ cursor: selectedTool === 'draw' || selectedTool === 'supply' ? 'crosshair' : 'default' }}
      onMouseDown={(e) => {
        if (e.button === 1) {
          isPanning.current = true;
          lastPan.current = { x: e.clientX, y: e.clientY };
        }
      }}
      onMouseMove={(e) => {
        if (isPanning.current) {
          setTransform((p) => ({
            ...p,
            offsetX: p.offsetX + e.clientX - lastPan.current.x,
            offsetY: p.offsetY + e.clientY - lastPan.current.y,
          }));
          lastPan.current = { x: e.clientX, y: e.clientY };
        }
      }}
      onMouseUp={() => { isPanning.current = false; }}
      onMouseLeave={() => { isPanning.current = false; }}
      onClick={(e) => {
        const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const w = toWorld(e.clientX - r.left, e.clientY - r.top);
        onCanvasClick(w.x, w.y);
      }}
    />
  );
}

export default function DispatchSandbox() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const levels = useGameStore((s) => s.levels);
  const currentPlan = useGameStore((s) => s.currentPlan);
  const drones = useGameStore((s) => s.drones);
  const isSimulating = useGameStore((s) => s.isSimulating);
  const simulationTime = useGameStore((s) => s.simulationTime);
  const activeEvent = useGameStore((s) => s.activeEvent);
  const addRoute = useGameStore((s) => s.addRoute);
  const updateRoute = useGameStore((s) => s.updateRoute);
  const removeRoute = useGameStore((s) => s.removeRoute);
  const addPurchase = useGameStore((s) => s.addPurchase);
  const startSimulation = useGameStore((s) => s.startSimulation);
  const updateSimulationTime = useGameStore((s) => s.updateSimulationTime);
  const setActiveEvent = useGameStore((s) => s.setActiveEvent);
  const completeSimulation = useGameStore((s) => s.completeSimulation);

  const [selectedTool, setSelectedTool] = useState<Tool>('select');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [simSpeed, setSimSpeed] = useState<1 | 2 | 4>(1);
  const [isPlaying, setIsPlaying] = useState(false);

  const level = levels.find((l) => l.id === id);
  const routes = currentPlan?.routes ?? [];
  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? null;

  const handleCanvasClick = useCallback((x: number, y: number) => {
    if (isSimulating) return;
    if (selectedTool === 'draw') {
      if (!selectedRouteId) {
        const newId = crypto.randomUUID();
        addRoute({
          id: newId, droneModelId: '',
          waypoints: [{ x, y, altitude: 3, speed: 5, isSpraying: true }],
          supplyPoints: [], targetFieldIds: [],
          color: ROUTE_COLORS[routes.length % ROUTE_COLORS.length],
        });
        setSelectedRouteId(newId);
      } else {
        const route = useGameStore.getState().currentPlan?.routes.find((r) => r.id === selectedRouteId);
        if (route) {
          updateRoute(selectedRouteId, {
            waypoints: [...route.waypoints, { x, y, altitude: 3, speed: 5, isSpraying: true }],
          });
        }
      }
    } else if (selectedTool === 'supply' && selectedRouteId) {
      const route = useGameStore.getState().currentPlan?.routes.find((r) => r.id === selectedRouteId);
      if (route) {
        updateRoute(selectedRouteId, {
          supplyPoints: [...route.supplyPoints, { x, y, type: 'battery' as const, interval: 10 }],
        });
      }
    } else if (selectedTool === 'eraser' && selectedRouteId) {
      const route = useGameStore.getState().currentPlan?.routes.find((r) => r.id === selectedRouteId);
      if (route && route.waypoints.length > 0) {
        let minDist = Infinity, minIdx = -1;
        route.waypoints.forEach((wp, i) => {
          const d = Math.hypot(wp.x - x, wp.y - y);
          if (d < minDist) { minDist = d; minIdx = i; }
        });
        if (minDist < 30) {
          updateRoute(selectedRouteId, {
            waypoints: route.waypoints.filter((_, i) => i !== minIdx),
          });
        }
      }
    } else if (selectedTool === 'select') {
      let closest: string | null = null, closestDist = 40;
      for (const route of routes) {
        for (const wp of route.waypoints) {
          const d = Math.hypot(wp.x - x, wp.y - y);
          if (d < closestDist) { closestDist = d; closest = route.id; }
        }
      }
      if (closest) setSelectedRouteId(closest);
    }
  }, [selectedTool, selectedRouteId, routes, isSimulating, addRoute, updateRoute]);

  useEffect(() => {
    if (!isPlaying || !isSimulating) return;
    const interval = setInterval(() => {
      const cur = useGameStore.getState().simulationTime;
      const next = Math.min(100, cur + simSpeed * 0.5);
      updateSimulationTime(next);
      const events = getActiveEvents(level?.events ?? [], next);
      setActiveEvent(events.length > 0 ? events[0] : null);
      if (next >= 100) setIsPlaying(false);
    }, 50);
    return () => clearInterval(interval);
  }, [isPlaying, isSimulating, simSpeed, level, updateSimulationTime, setActiveEvent]);

  const handleStartSimulation = () => {
    if (!currentPlan || !level) return;
    startSimulation();
    setIsPlaying(true);
  };

  const handleFinishEvaluation = () => {
    if (!currentPlan || !level) return;
    const result = evaluatePlan(currentPlan, level);
    completeSimulation(result);
    navigate(`/result/${id}`);
  };

  if (!level || !currentPlan) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        加载中...
      </div>
    );
  }

  const budgetUsed = calculateTotalCost(currentPlan, level);
  const budgetRatio = budgetUsed / level.budget;
  const warnings = checkDangerousCrossings(currentPlan, level);

  const tools: { key: Tool; icon: typeof MousePointer; label: string }[] = [
    { key: 'select', icon: MousePointer, label: '选择' },
    { key: 'draw', icon: PenTool, label: '绘制航线' },
    { key: 'supply', icon: Battery, label: '补给点' },
    { key: 'eraser', icon: Eraser, label: '橡皮擦' },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex flex-1 min-h-0">
        <motion.div
          className="w-56 bg-white shadow-lg flex flex-col shrink-0"
          initial={{ x: -224 }} animate={{ x: 0 }}
        >
          <div className="p-3 border-b">
            <h2 className="font-bold text-gray-800">航线工具</h2>
          </div>
          <div className="p-2 space-y-1">
            {tools.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setSelectedTool(key)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition ${
                  selectedTool === key
                    ? 'bg-green-100 text-green-800 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </div>
          <div className="p-3 border-t mt-auto">
            <h3 className="font-bold text-gray-700 text-sm mb-2">航线列表</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {routes.map((route) => {
                const drone = drones.find((d) => d.id === route.droneModelId);
                const fieldNames = route.targetFieldIds
                  .map((fid) => level.fields.find((f) => f.id === fid)?.name)
                  .filter(Boolean).join(', ');
                return (
                  <div
                    key={route.id}
                    onClick={() => setSelectedRouteId(route.id)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer group text-sm ${
                      selectedRouteId === route.id ? 'bg-green-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: route.color }} />
                    <span className="flex-1 truncate">
                      {drone?.name ?? '未分配'}{fieldNames ? ` → ${fieldNames}` : ''}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRoute(route.id);
                        if (selectedRouteId === route.id) setSelectedRouteId(null);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => {
                const newId = crypto.randomUUID();
                addRoute({
                  id: newId, droneModelId: '', waypoints: [],
                  supplyPoints: [], targetFieldIds: [],
                  color: ROUTE_COLORS[routes.length % ROUTE_COLORS.length],
                });
                setSelectedRouteId(newId);
                setSelectedTool('draw');
              }}
              className="w-full mt-2 flex items-center justify-center gap-1 px-3 py-2 rounded-md text-sm text-green-700 bg-green-50 hover:bg-green-100 transition"
            >
              <Plus className="w-4 h-4" />新增航线
            </button>
          </div>
        </motion.div>

        <div className="flex-1 relative min-w-0">
          <CanvasMap
            level={level}
            routes={routes}
            selectedRouteId={selectedRouteId}
            selectedTool={selectedTool}
            simulationTime={simulationTime}
            isSimulating={isSimulating}
            onCanvasClick={handleCanvasClick}
          />
          {activeEvent && (
            <div className="absolute top-4 right-4 z-10">
              <EventNotification event={activeEvent} onRespond={() => setActiveEvent(null)} />
            </div>
          )}
        </div>

        <motion.div
          className="w-72 bg-white shadow-lg flex flex-col overflow-y-auto shrink-0"
          initial={{ x: 288 }} animate={{ x: 0 }}
        >
          <div className="p-3 border-b">
            <h2 className="font-bold text-gray-800">航线配置</h2>
          </div>
          {!selectedRoute ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-4">
              请选择或创建航线
            </div>
          ) : (
            <div className="p-3 space-y-4">
              <div>
                <label className="text-xs text-gray-500">机型选择</label>
                <select
                  value={selectedRoute.droneModelId}
                  onChange={(e) => updateRoute(selectedRouteId!, { droneModelId: e.target.value })}
                  className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
                >
                  <option value="">-- 选择机型 --</option>
                  {level.availableDrones.map((did) => {
                    const d = drones.find((dr) => dr.id === did);
                    return d ? <option key={did} value={did}>{d.name}</option> : null;
                  })}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">匹配度</label>
                <div className="mt-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${selectedRoute.droneModelId ? 70 : 0}%`,
                      backgroundColor: selectedRoute.droneModelId ? '#4CAF50' : '#9E9E9E',
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">目标地块</label>
                <div className="mt-1 space-y-1">
                  {level.fields.map((f) => (
                    <label key={f.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedRoute.targetFieldIds.includes(f.id)}
                        onChange={(e) => {
                          const ids = e.target.checked
                            ? [...selectedRoute.targetFieldIds, f.id]
                            : selectedRoute.targetFieldIds.filter((i) => i !== f.id);
                          updateRoute(selectedRouteId!, { targetFieldIds: ids });
                        }}
                      />
                      {f.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">喷洒速度</label>
                <input
                  type="range" min={2} max={10} step={0.5}
                  value={selectedRoute.waypoints[0]?.speed ?? 5}
                  onChange={(e) => {
                    const speed = Number(e.target.value);
                    updateRoute(selectedRouteId!, {
                      waypoints: selectedRoute.waypoints.map((w) => ({ ...w, speed })),
                    });
                  }}
                  className="w-full mt-1"
                />
                <span className="text-xs text-gray-500">{selectedRoute.waypoints[0]?.speed ?? 5} m/s</span>
              </div>
              <div>
                <label className="text-xs text-gray-500">飞行高度</label>
                <input
                  type="range" min={1} max={8} step={0.5}
                  value={selectedRoute.waypoints[0]?.altitude ?? 3}
                  onChange={(e) => {
                    const altitude = Number(e.target.value);
                    updateRoute(selectedRouteId!, {
                      waypoints: selectedRoute.waypoints.map((w) => ({ ...w, altitude })),
                    });
                  }}
                  className="w-full mt-1"
                />
                <span className="text-xs text-gray-500">{selectedRoute.waypoints[0]?.altitude ?? 3} m</span>
              </div>
            </div>
          )}
          <div className="p-3 border-t space-y-3">
            <h3 className="font-bold text-gray-700 text-sm">预算与资源</h3>
            <div>
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, budgetRatio * 100)}%`,
                    backgroundColor: budgetRatio < 0.7 ? '#4CAF50' : budgetRatio < 0.9 ? '#FFC107' : '#F44336',
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">剩余: ¥{Math.max(0, level.budget - budgetUsed)}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => addPurchase({ type: 'battery', count: 1, cost: 100 })}
                className="flex-1 px-2 py-1.5 rounded text-xs bg-green-50 text-green-700 hover:bg-green-100 transition"
              >
                购买备用电池 ¥100
              </button>
              <button
                onClick={() => addPurchase({ type: 'pilot', count: 1, cost: 200 })}
                className="flex-1 px-2 py-1.5 rounded text-xs bg-green-50 text-green-700 hover:bg-green-100 transition"
              >
                增派飞手 ¥200
              </button>
            </div>
            {currentPlan.purchases.length > 0 && (
              <div className="space-y-1">
                {currentPlan.purchases.map((p, i) => (
                  <div key={i} className="text-xs text-gray-600">
                    {p.type === 'battery' ? '备用电池' : '飞手'} x{p.count} (¥{p.cost})
                  </div>
                ))}
              </div>
            )}
          </div>
          {warnings.length > 0 && (
            <div className="p-3 border-t space-y-2">
              <h3 className="font-bold text-gray-700 text-sm">警告</h3>
              {warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  {w.type === 'danger'
                    ? <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                    : <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-0.5" />}
                  <span className="text-gray-600">{w.message}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <div className="h-16 bg-gray-900 flex items-center px-4 gap-4 shrink-0">
        <button
          onClick={() => navigate(`/mission/${id}`)}
          className="flex items-center gap-1 text-gray-300 hover:text-white text-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />返回
        </button>
        <div className="flex-1 flex items-center justify-center gap-4">
          <button
            onClick={() => { if (isSimulating) setIsPlaying(!isPlaying); }}
            className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-white hover:bg-gray-600 transition"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <div className="flex gap-1">
            {([1, 2, 4] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSimSpeed(s)}
                className={`px-2 py-0.5 rounded text-xs ${
                  simSpeed === s ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
          <div className="w-48 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${simulationTime}%` }}
            />
          </div>
        </div>
        {!isSimulating && (
          <button
            onClick={handleStartSimulation}
            className="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition"
          >
            模拟运行
          </button>
        )}
        {(isSimulating || simulationTime > 0) && (
          <button
            onClick={handleFinishEvaluation}
            className="px-4 py-2 rounded-md bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition"
          >
            结束评估
          </button>
        )}
      </div>
    </div>
  );
}
