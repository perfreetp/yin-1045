import type {
  Point,
  DispatchPlan,
  Level,
  Suggestion,
  SimulationResult,
  WeatherNode,
  RandomEvent,
  StarCount,
  MetricType,
  DroneModel,
} from '@/types';

const CELL_SIZE = 5;
const SPRAY_EFFICIENCY = 0.8;
const SUPPLY_STOP_MINUTES = 2;
const PIXELS_PER_METER = 2;
const MU_PER_SQUARE_PIXEL = 25 / (270 * 200);

function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function getBounds(polygons: Point[][]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const poly of polygons) {
    for (const p of poly) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  return { minX: Math.floor(minX - 10), minY: Math.floor(minY - 10), maxX: Math.ceil(maxX + 10), maxY: Math.ceil(maxY + 10) };
}

function segmentCoverageCells(
  p1: Point,
  p2: Point,
  sprayWidth: number,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
): Set<string> {
  const cells = new Set<string>();
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  const halfW = sprayWidth / 2;

  if (len < 0.5) {
    const cx0 = Math.floor((p1.x - halfW - bounds.minX) / CELL_SIZE);
    const cy0 = Math.floor((p1.y - halfW - bounds.minY) / CELL_SIZE);
    const cx1 = Math.floor((p1.x + halfW - bounds.minX) / CELL_SIZE);
    const cy1 = Math.floor((p1.y + halfW - bounds.minY) / CELL_SIZE);
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        cells.add(`${cx},${cy}`);
      }
    }
    return cells;
  }

  const steps = Math.max(Math.ceil(len / 2), 3);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const px = p1.x + dx * t;
    const py = p1.y + dy * t;

    const angle = Math.atan2(dy, dx);
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);

    const x0 = px + perpX * halfW;
    const y0 = py + perpY * halfW;
    const x1 = px - perpX * halfW;
    const y1 = py - perpY * halfW;

    const minPx = Math.min(x0, x1);
    const maxPx = Math.max(x0, x1);
    const minPy = Math.min(y0, y1);
    const maxPy = Math.max(y0, y1);

    const cx0 = Math.floor((minPx - bounds.minX) / CELL_SIZE);
    const cy0 = Math.floor((minPy - bounds.minY) / CELL_SIZE);
    const cx1 = Math.floor((maxPx - bounds.minX) / CELL_SIZE);
    const cy1 = Math.floor((maxPy - bounds.minY) / CELL_SIZE);

    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        cells.add(`${cx},${cy}`);
      }
    }
  }
  return cells;
}

function getDroneModel(plan: DispatchPlan, routeId: string, droneList: DroneModel[]): DroneModel | null {
  const route = plan.routes.find((r) => r.id === routeId);
  if (!route || !route.droneModelId) return null;
  return droneList.find((d) => d.id === route.droneModelId) ?? null;
}

export function calculateCoverage(
  plan: DispatchPlan,
  level: Level,
  droneList: DroneModel[],
): {
  overlapPercentage: number;
  missPercentage: number;
  overlapAreas: Point[][];
  missedAreas: Point[][];
} {
  const fieldPolygons = level.fields.map((f) => f.polygon);
  const bounds = getBounds(fieldPolygons);
  const routeCoverSets: Map<string, Set<string>> = new Map();

  for (const route of plan.routes) {
    const drone = getDroneModel(plan, route.id, droneList);
    const sprayWidthMeters = drone?.sprayWidth ?? 4;
    const sprayWidthPixels = sprayWidthMeters * PIXELS_PER_METER;

    const covered = new Set<string>();
    for (let i = 0; i < route.waypoints.length - 1; i++) {
      const w1 = route.waypoints[i];
      const w2 = route.waypoints[i + 1];
      if (!w1.isSpraying && !w2.isSpraying) continue;
      const segCells = segmentCoverageCells(
        { x: w1.x, y: w1.y },
        { x: w2.x, y: w2.y },
        sprayWidthPixels,
        bounds,
      );
      for (const c of segCells) covered.add(c);
    }
    routeCoverSets.set(route.id, covered);
  }

  const allFieldCells = new Set<string>();
  for (const field of level.fields) {
    for (let cx = -2; cx < 200; cx++) {
      for (let cy = -2; cy < 150; cy++) {
        const cellCenter: Point = {
          x: bounds.minX + cx * CELL_SIZE + CELL_SIZE / 2,
          y: bounds.minY + cy * CELL_SIZE + CELL_SIZE / 2,
        };
        if (isPointInPolygon(cellCenter, field.polygon)) {
          allFieldCells.add(`${cx},${cy}`);
        }
      }
    }
  }

  const totalFieldCells = allFieldCells.size;

  if (totalFieldCells === 0) {
    return {
      overlapPercentage: 0,
      missPercentage: 0,
      overlapAreas: [],
      missedAreas: [],
    };
  }

  let overlapCount = 0;
  let coveredCount = 0;
  const overlapCellKeys: string[] = [];
  const missedCellKeys: string[] = [];

  for (const cellKey of allFieldCells) {
    let routeCount = 0;
    for (const [, coverSet] of routeCoverSets) {
      if (coverSet.has(cellKey)) routeCount++;
    }
    if (routeCount > 0) coveredCount++;
    if (routeCount >= 2) {
      overlapCount++;
      overlapCellKeys.push(cellKey);
    }
  }

  for (const cellKey of allFieldCells) {
    let isCovered = false;
    for (const [, coverSet] of routeCoverSets) {
      if (coverSet.has(cellKey)) {
        isCovered = true;
        break;
      }
    }
    if (!isCovered) missedCellKeys.push(cellKey);
  }

  const overlapAreas = cellKeysToAreaPolygons(overlapCellKeys, bounds);
  const missedAreas = cellKeysToAreaPolygons(missedCellKeys, bounds);

  return {
    overlapPercentage: (overlapCount / totalFieldCells) * 100,
    missPercentage: ((totalFieldCells - coveredCount) / totalFieldCells) * 100,
    overlapAreas,
    missedAreas,
  };
}

function cellKeysToAreaPolygons(
  keys: string[],
  bounds: { minX: number; minY: number },
): Point[][] {
  if (keys.length === 0) return [];
  const groups = groupAdjacentCells(keys);
  return groups.map((group) => {
    const points: Point[] = [];
    for (const key of group) {
      const [cx, cy] = key.split(',').map(Number);
      const x = bounds.minX + cx * CELL_SIZE;
      const y = bounds.minY + cy * CELL_SIZE;
      points.push(
        { x, y },
        { x: x + CELL_SIZE, y },
        { x: x + CELL_SIZE, y: y + CELL_SIZE },
        { x, y: y + CELL_SIZE },
      );
    }
    return points;
  });
}

function groupAdjacentCells(keys: string[]): string[][] {
  const keySet = new Set(keys);
  const visited = new Set<string>();
  const groups: string[][] = [];

  for (const key of keys) {
    if (visited.has(key)) continue;
    const group: string[] = [];
    const stack = [key];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      group.push(current);
      const [cx, cy] = current.split(',').map(Number);
      const neighbors = [
        `${cx - 1},${cy}`,
        `${cx + 1},${cy}`,
        `${cx},${cy - 1}`,
        `${cx},${cy + 1}`,
      ];
      for (const n of neighbors) {
        if (keySet.has(n) && !visited.has(n)) stack.push(n);
      }
    }
    groups.push(group);
  }
  return groups;
}

export function checkDangerousCrossings(
  plan: DispatchPlan,
  level: Level,
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  for (const route of plan.routes) {
    const foundObstacles = new Set<string>();

    for (let i = 0; i < route.waypoints.length - 1; i++) {
      const w1 = route.waypoints[i];
      const w2 = route.waypoints[i + 1];
      const dist = Math.sqrt((w2.x - w1.x) ** 2 + (w2.y - w1.y) ** 2);
      const steps = Math.max(Math.ceil(dist / 8), 2);

      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const point: Point = {
          x: w1.x + (w2.x - w1.x) * t,
          y: w1.y + (w2.y - w1.y) * t,
        };
        for (const obstacle of level.obstacles) {
          if (foundObstacles.has(obstacle.id)) continue;
          if (isPointInPolygon(point, obstacle.polygon)) {
            foundObstacles.add(obstacle.id);
            suggestions.push({
              type: 'danger',
              severity: obstacle.type === 'powerline' ? 'high' : 'medium',
              message: `航线「${route.id.slice(0, 6)}」穿越障碍物「${obstacle.name}」`,
              relatedRouteIds: [route.id],
              relatedFieldIds: route.targetFieldIds,
            });
          }
        }
      }
    }
  }

  return suggestions;
}

export function calculateTotalTime(
  plan: DispatchPlan,
  level: Level,
  droneList: DroneModel[],
): number {
  let maxTime = 0;

  for (const route of plan.routes) {
    const drone = getDroneModel(plan, route.id, droneList);
    if (!drone) continue;

    let totalDistance = 0;
    for (let i = 0; i < route.waypoints.length - 1; i++) {
      const w1 = route.waypoints[i];
      const w2 = route.waypoints[i + 1];
      totalDistance += Math.sqrt((w2.x - w1.x) ** 2 + (w2.y - w1.y) ** 2);
    }

    const distanceMeters = totalDistance / PIXELS_PER_METER;
    const speedMps = drone.speed;
    const flightMinutes = distanceMeters / speedMps / 60;
    const supplyMinutes = route.supplyPoints.length * SUPPLY_STOP_MINUTES;
    const routeTime = flightMinutes + supplyMinutes;

    if (routeTime > maxTime) maxTime = routeTime;
  }

  return maxTime;
}

export function calculateTotalCost(
  plan: DispatchPlan,
  level: Level,
  droneList: DroneModel[],
): number {
  let totalCost = 0;

  for (const route of plan.routes) {
    const drone = getDroneModel(plan, route.id, droneList);
    if (!drone) continue;

    const targetFields = level.fields.filter((f) =>
      route.targetFieldIds.includes(f.id),
    );
    const coveredAreaMu = targetFields.reduce((sum, f) => sum + f.area, 0);

    const litersPerMu = 0.8;
    const chemicalNeeded = coveredAreaMu * litersPerMu;
    const sorties = Math.ceil(chemicalNeeded / (drone.payload * SPRAY_EFFICIENCY));

    totalCost += sorties * drone.costPerSortie;
  }

  for (const purchase of plan.purchases) {
    totalCost += purchase.count * purchase.cost;
  }

  return totalCost;
}

export function canEvaluate(plan: DispatchPlan): { ok: boolean; reason?: string } {
  if (plan.routes.length === 0) {
    return { ok: false, reason: '请至少创建一条航线' };
  }
  for (const route of plan.routes) {
    if (!route.droneModelId) {
      return { ok: false, reason: `航线「${route.id.slice(0, 6)}」尚未选择机型` };
    }
    if (route.waypoints.length < 2) {
      return { ok: false, reason: `航线「${route.id.slice(0, 6)}」至少需要 2 个航点` };
    }
  }
  return { ok: true };
}

export function evaluatePlan(
  plan: DispatchPlan,
  level: Level,
  droneList: DroneModel[],
): SimulationResult {
  const coverage = calculateCoverage(plan, level, droneList);
  const dangerSuggestions = checkDangerousCrossings(plan, level);
  const totalTime = calculateTotalTime(plan, level, droneList);
  const totalCost = calculateTotalCost(plan, level, droneList);

  const acreEfficiency = Math.max(
    0,
    Math.min(
      100,
      100 - coverage.overlapPercentage * 1.5 - coverage.missPercentage * 2.5,
    ),
  );

  const onTimeRate =
    totalTime <= level.timeLimit
      ? 100
      : Math.max(0, 100 - ((totalTime - level.timeLimit) / level.timeLimit) * 80);

  const safetyScore = Math.max(
    0,
    100 - dangerSuggestions.length * 20,
  );

  const budgetRatio = totalCost / level.budget;
  const costScore = budgetRatio <= 0.8
    ? 100
    : Math.max(0, 100 - (budgetRatio - 0.8) * 150);

  const suggestions: Suggestion[] = [];

  if (coverage.overlapPercentage > 3) {
    suggestions.push({
      type: 'overlap',
      severity: coverage.overlapPercentage > 15 ? 'high' : coverage.overlapPercentage > 8 ? 'medium' : 'low',
      message: `重复喷洒率 ${coverage.overlapPercentage.toFixed(1)}%，建议优化航线间距减少浪费`,
      relatedRouteIds: plan.routes.map((r) => r.id),
      relatedFieldIds: level.fields.map((f) => f.id),
    });
  }

  if (coverage.missPercentage > 5) {
    suggestions.push({
      type: 'miss',
      severity: coverage.missPercentage > 20 ? 'high' : coverage.missPercentage > 10 ? 'medium' : 'low',
      message: `漏喷率 ${coverage.missPercentage.toFixed(1)}%，建议增加航线覆盖遗漏区域`,
      relatedRouteIds: plan.routes.map((r) => r.id),
      relatedFieldIds: level.fields.map((f) => f.id),
    });
  }

  suggestions.push(...dangerSuggestions);

  if (acreEfficiency < 70) {
    suggestions.push({
      type: 'inefficient',
      severity: 'medium',
      message: `作业效率 ${acreEfficiency.toFixed(0)} 分，建议参考知识图鉴优化航线布局`,
      relatedRouteIds: plan.routes.map((r) => r.id),
      relatedFieldIds: [],
    });
  }

  if (budgetRatio > 1) {
    suggestions.push({
      type: 'inefficient',
      severity: 'high',
      message: `超出预算 ${((budgetRatio - 1) * 100).toFixed(0)}%，建议更换机型或减少采购`,
      relatedRouteIds: plan.routes.map((r) => r.id),
      relatedFieldIds: [],
    });
  }

  const metrics: Record<MetricType, number> = {
    acreEfficiency,
    onTimeRate,
    safetyScore,
    costScore,
  };

  let stars: 0 | 1 | 2 | 3 = 0;
  const sortedTargets = [...level.starTargets].sort(
    (a, b) => b.stars - a.stars,
  );

  for (const target of sortedTargets) {
    const allMet = target.conditions.every(
      (cond) => metrics[cond.metric] >= cond.min,
    );
    if (allMet) {
      stars = target.stars as 0 | 1 | 2 | 3;
      break;
    }
  }

  return {
    acreEfficiency,
    onTimeRate,
    safetyScore,
    costScore,
    stars,
    suggestions,
    overlapPercentage: coverage.overlapPercentage,
    missPercentage: coverage.missPercentage,
    totalTime,
    totalCost,
  };
}

export function getWeatherAtTime(
  timeline: WeatherNode[],
  time: number,
): WeatherNode {
  if (timeline.length === 0) {
    return { time, type: 'sunny', windSpeed: 0, windDirection: 0 };
  }
  if (timeline.length === 1) return { ...timeline[0] };

  const clamped = Math.max(0, Math.min(100, time));

  let before = timeline[0];
  let after = timeline[timeline.length - 1];

  for (let i = 0; i < timeline.length - 1; i++) {
    if (timeline[i].time <= clamped && timeline[i + 1].time >= clamped) {
      before = timeline[i];
      after = timeline[i + 1];
      break;
    }
  }

  if (clamped <= before.time) return { ...before };
  if (clamped >= after.time) return { ...after };

  const range = after.time - before.time;
  const t = range > 0 ? (clamped - before.time) / range : 0;

  return {
    time: clamped,
    type: t < 0.5 ? before.type : after.type,
    windSpeed: before.windSpeed + (after.windSpeed - before.windSpeed) * t,
    windDirection:
      before.windDirection + (after.windDirection - before.windDirection) * t,
  };
}

export function getActiveEvents(
  events: RandomEvent[],
  time: number,
): RandomEvent[] {
  return events.filter(
    (e) => time >= e.triggerTime && time <= e.triggerTime + e.duration,
  );
}
