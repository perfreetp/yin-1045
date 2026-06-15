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
} from '@/types';

const CELL_SIZE = 10;
const SPRAY_EFFICIENCY = 0.8;
const SUPPLY_STOP_MINUTES = 2;

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
  return { minX, minY, maxX, maxY };
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
  if (len === 0) {
    const halfW = sprayWidth / 2;
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

  const ux = dx / len;
  const uy = dy / len;
  const perpX = -uy;
  const perpY = ux;
  const halfW = sprayWidth / 2;
  const steps = Math.max(Math.ceil(len / (CELL_SIZE / 2)), 1);

  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const px = p1.x + dx * t;
    const py = p1.y + dy * t;
    const cx0 = Math.floor((px + perpX * halfW - bounds.minX) / CELL_SIZE);
    const cy0 = Math.floor((py + perpY * halfW - bounds.minY) / CELL_SIZE);
    const cx1 = Math.floor((px - perpX * halfW - bounds.minX) / CELL_SIZE);
    const cy1 = Math.floor((py - perpY * halfW - bounds.minY) / CELL_SIZE);
    const minCx = Math.min(cx0, cx1);
    const maxCx = Math.max(cx0, cx1);
    const minCy = Math.min(cy0, cy1);
    const maxCy = Math.max(cy0, cy1);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        cells.add(`${cx},${cy}`);
      }
    }
  }
  return cells;
}

export function calculateCoverage(
  plan: DispatchPlan,
  level: Level,
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
    const droneModel = { sprayWidth: 5 };
    for (const availId of level.availableDrones) {
      void availId;
    }
    const sprayWidth = route.waypoints.length > 0 ? 6 : droneModel.sprayWidth;
    const covered = new Set<string>();
    for (let i = 0; i < route.waypoints.length - 1; i++) {
      const w1 = route.waypoints[i];
      const w2 = route.waypoints[i + 1];
      if (!w1.isSpraying && !w2.isSpraying) continue;
      const segCells = segmentCoverageCells(
        { x: w1.x, y: w1.y },
        { x: w2.x, y: w2.y },
        sprayWidth,
        bounds,
      );
      for (const c of segCells) covered.add(c);
    }
    routeCoverSets.set(route.id, covered);
  }

  const fieldCellCounts: number[] = [];
  let totalFieldCells = 0;
  for (const field of level.fields) {
    let count = 0;
    const fMinX = Math.floor((bounds.minX) / CELL_SIZE);
    const fMinY = Math.floor((bounds.minY) / CELL_SIZE);
    const fMaxX = Math.ceil((bounds.maxX) / CELL_SIZE);
    const fMaxY = Math.ceil((bounds.maxY) / CELL_SIZE);
    for (let cx = fMinX; cx <= fMaxX; cx++) {
      for (let cy = fMinY; cy <= fMaxY; cy++) {
        const cellCenter: Point = {
          x: bounds.minX + cx * CELL_SIZE + CELL_SIZE / 2,
          y: bounds.minY + cy * CELL_SIZE + CELL_SIZE / 2,
        };
        if (isPointInPolygon(cellCenter, field.polygon)) {
          count++;
        }
      }
    }
    fieldCellCounts.push(count);
    totalFieldCells += count;
  }

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

  const allFieldCells = new Set<string>();
  for (let fi = 0; fi < level.fields.length; fi++) {
    const field = level.fields[fi];
    const fMinX = Math.floor(bounds.minX / CELL_SIZE);
    const fMinY = Math.floor(bounds.minY / CELL_SIZE);
    const fMaxX = Math.ceil(bounds.maxX / CELL_SIZE);
    const fMaxY = Math.ceil(bounds.maxY / CELL_SIZE);
    for (let cx = fMinX; cx <= fMaxX; cx++) {
      for (let cy = fMinY; cy <= fMaxY; cy++) {
        const key = `${cx},${cy}`;
        const cellCenter: Point = {
          x: bounds.minX + cx * CELL_SIZE + CELL_SIZE / 2,
          y: bounds.minY + cy * CELL_SIZE + CELL_SIZE / 2,
        };
        if (isPointInPolygon(cellCenter, field.polygon)) {
          allFieldCells.add(key);
        }
      }
    }
  }

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
    for (let i = 0; i < route.waypoints.length; i++) {
      const wp = route.waypoints[i];
      const point: Point = { x: wp.x, y: wp.y };
      for (const obstacle of level.obstacles) {
        if (isPointInPolygon(point, obstacle.polygon)) {
          const fieldIds = route.targetFieldIds;
          suggestions.push({
            type: 'danger',
            severity: obstacle.type === 'powerline' ? 'high' : 'medium',
            message: `航线 ${route.id} 的航点 ${i + 1} 穿越障碍物「${obstacle.name}」(${obstacle.type})`,
            relatedRouteIds: [route.id],
            relatedFieldIds: fieldIds,
          });
        }
      }
    }

    for (let i = 0; i < route.waypoints.length - 1; i++) {
      const w1 = route.waypoints[i];
      const w2 = route.waypoints[i + 1];
      const steps = Math.max(
        Math.ceil(
          Math.sqrt((w2.x - w1.x) ** 2 + (w2.y - w1.y) ** 2) / 10,
        ),
        1,
      );
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const point: Point = {
          x: w1.x + (w2.x - w1.x) * t,
          y: w1.y + (w2.y - w1.y) * t,
        };
        for (const obstacle of level.obstacles) {
          if (isPointInPolygon(point, obstacle.polygon)) {
            const already = suggestions.some(
              (sg) =>
                sg.relatedRouteIds.includes(route.id) &&
                sg.message.includes(obstacle.name),
            );
            if (!already) {
              suggestions.push({
                type: 'danger',
                severity: obstacle.type === 'powerline' ? 'high' : 'medium',
                message: `航线 ${route.id} 的航段 ${i + 1}-${i + 2} 穿越障碍物「${obstacle.name}」(${obstacle.type})`,
                relatedRouteIds: [route.id],
                relatedFieldIds: route.targetFieldIds,
              });
            }
          }
        }
      }
    }
  }

  return suggestions;
}

export function calculateTotalTime(plan: DispatchPlan, level: Level): number {
  let maxTime = 0;

  for (const route of plan.routes) {
    let routeTime = 0;
    for (let i = 0; i < route.waypoints.length - 1; i++) {
      const w1 = route.waypoints[i];
      const w2 = route.waypoints[i + 1];
      const dist = Math.sqrt((w2.x - w1.x) ** 2 + (w2.y - w1.y) ** 2);
      const speed = (w1.speed + w2.speed) / 2;
      routeTime += speed > 0 ? dist / speed : 0;
    }
    routeTime += route.supplyPoints.length * SUPPLY_STOP_MINUTES;
    if (routeTime > maxTime) maxTime = routeTime;
  }

  return maxTime;
}

export function calculateTotalCost(plan: DispatchPlan, level: Level): number {
  let totalCost = 0;

  for (const route of plan.routes) {
    const targetFields = level.fields.filter((f) =>
      route.targetFieldIds.includes(f.id),
    );
    const coveredArea = targetFields.reduce((sum, f) => sum + f.area, 0);
    const payload = 50;
    const sorties = Math.ceil(
      coveredArea / (payload * SPRAY_EFFICIENCY),
    );
    const costPerSortie = 100;
    totalCost += sorties * costPerSortie;
  }

  for (const purchase of plan.purchases) {
    totalCost += purchase.count * purchase.cost;
  }

  return totalCost;
}

export function evaluatePlan(
  plan: DispatchPlan,
  level: Level,
): SimulationResult {
  const coverage = calculateCoverage(plan, level);
  const dangerSuggestions = checkDangerousCrossings(plan, level);
  const totalTime = calculateTotalTime(plan, level);
  const totalCost = calculateTotalCost(plan, level);

  const acreEfficiency = Math.max(
    0,
    Math.min(
      100,
      100 - coverage.overlapPercentage * 2 - coverage.missPercentage * 1.5,
    ),
  );

  const onTimeRate = Math.max(
    0,
    100 - Math.max(0, (totalTime - level.timeLimit) / level.timeLimit) * 100,
  );

  const activeEvents = getActiveEvents(level.events, 50);
  const safetyScore = Math.max(
    0,
    100 - dangerSuggestions.length * 15 - activeEvents.length * 5,
  );

  const budgetRatio = totalCost / level.budget;
  const costScore = Math.max(0, Math.min(100, 100 - (budgetRatio - 0.5) * 100));

  const suggestions: Suggestion[] = [];

  if (coverage.overlapPercentage > 5) {
    suggestions.push({
      type: 'overlap',
      severity: coverage.overlapPercentage > 20 ? 'high' : 'medium',
      message: `喷洒重叠率为 ${coverage.overlapPercentage.toFixed(1)}%，建议优化航线减少重叠`,
      relatedRouteIds: plan.routes.map((r) => r.id),
      relatedFieldIds: level.fields.map((f) => f.id),
    });
  }

  if (coverage.missPercentage > 5) {
    suggestions.push({
      type: 'miss',
      severity: coverage.missPercentage > 20 ? 'high' : 'medium',
      message: `漏喷率为 ${coverage.missPercentage.toFixed(1)}%，建议增加航线覆盖遗漏区域`,
      relatedRouteIds: plan.routes.map((r) => r.id),
      relatedFieldIds: level.fields.map((f) => f.id),
    });
  }

  suggestions.push(...dangerSuggestions);

  if (acreEfficiency < 70) {
    suggestions.push({
      type: 'inefficient',
      severity: 'medium',
      message: `作业效率仅 ${acreEfficiency.toFixed(1)} 分，低于 70 分阈值，建议调整航线规划`,
      relatedRouteIds: plan.routes.map((r) => r.id),
      relatedFieldIds: [],
    });
  }

  for (const route of plan.routes) {
    if (route.waypoints.length >= 2) {
      let lastFieldEnd = -1;
      for (let i = 1; i < route.waypoints.length; i++) {
        const w1 = route.waypoints[i - 1];
        const w2 = route.waypoints[i];
        const dist = Math.sqrt((w2.x - w1.x) ** 2 + (w2.y - w1.y) ** 2);
        const speed = (w1.speed + w2.speed) / 2;
        const segTime = speed > 0 ? dist / speed : 0;
        if (segTime > 5 && !w1.isSpraying && !w2.isSpraying) {
          if (lastFieldEnd >= 0 && i - lastFieldEnd > 1) {
            suggestions.push({
              type: 'wait',
              severity: 'low',
              message: `航线 ${route.id} 在航段 ${i}-${i + 1} 存在超过 5 分钟的空飞等待`,
              relatedRouteIds: [route.id],
              relatedFieldIds: route.targetFieldIds,
            });
          }
        }
        if (w2.isSpraying) lastFieldEnd = i;
      }
    }
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
