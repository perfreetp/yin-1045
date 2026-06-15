export interface Point {
  x: number;
  y: number;
}

export type Polygon = Point[];

export interface Field {
  id: string;
  name: string;
  polygon: Point[];
  area: number;
  cropType: string;
}

export type ObstacleType = 'building' | 'powerline' | 'tree' | 'water';

export interface Obstacle {
  id: string;
  name: string;
  polygon: Point[];
  type: ObstacleType;
}

export interface Waypoint {
  x: number;
  y: number;
  altitude: number;
  speed: number;
  isSpraying: boolean;
}

export type SupplyType = 'battery' | 'chemical';

export interface SupplyPoint {
  x: number;
  y: number;
  type: SupplyType;
  interval: number;
}

export interface DroneModel {
  id: string;
  name: string;
  payload: number;
  endurance: number;
  speed: number;
  sprayWidth: number;
  costPerSortie: number;
  description: string;
}

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'windy' | 'storm';

export interface WeatherNode {
  time: number;
  type: WeatherType;
  windSpeed: number;
  windDirection: number;
}

export type RandomEventType = 'gust' | 'crowd' | 'road_closed' | 'rush_order';

export interface RandomEvent {
  id: string;
  type: RandomEventType;
  triggerTime: number;
  duration: number;
  description: string;
  affectedFieldIds: string[];
}

export type StarCount = 1 | 2 | 3;

export type MetricType = 'acreEfficiency' | 'onTimeRate' | 'safetyScore' | 'costScore';

export interface StarCondition {
  metric: MetricType;
  min: number;
}

export interface StarTarget {
  stars: StarCount;
  conditions: StarCondition[];
}

export type SceneType = 'paddy' | 'orchard' | 'hillside' | 'scatter';

export interface Level {
  id: string;
  name: string;
  scene: SceneType;
  difficulty: number;
  area: number;
  chemicalLimit: number;
  weatherTimeline: WeatherNode[];
  timeLimit: number;
  starTargets: StarTarget[];
  fields: Field[];
  obstacles: Obstacle[];
  events: RandomEvent[];
  budget: number;
  availableDrones: string[];
  description: string;
}

export interface Route {
  id: string;
  droneModelId: string;
  waypoints: Waypoint[];
  supplyPoints: SupplyPoint[];
  targetFieldIds: string[];
  color: string;
}

export type PurchaseType = 'battery' | 'pilot';

export interface Purchase {
  type: PurchaseType;
  count: number;
  cost: number;
}

export interface DispatchPlan {
  id: string;
  levelId: string;
  routes: Route[];
  purchases: Purchase[];
  timestamp: number;
}

export type SuggestionType = 'overlap' | 'miss' | 'danger' | 'inefficient' | 'wait';
export type SeverityLevel = 'high' | 'medium' | 'low';

export interface Suggestion {
  type: SuggestionType;
  severity: SeverityLevel;
  message: string;
  relatedRouteIds: string[];
  relatedFieldIds: string[];
}

export interface SimulationResult {
  acreEfficiency: number;
  onTimeRate: number;
  safetyScore: number;
  costScore: number;
  stars: 0 | 1 | 2 | 3;
  suggestions: Suggestion[];
  overlapPercentage: number;
  missPercentage: number;
  totalTime: number;
  totalCost: number;
}

export type EncyclopediaCategory = 'error' | 'strategy' | 'weather' | 'drone';

export interface EncyclopediaEntry {
  id: string;
  category: EncyclopediaCategory;
  title: string;
  content: string;
  icon: string;
  relatedEntries: string[];
}

export interface StudentRecord {
  studentId: string;
  levelId: string;
  plans: {
    plan: DispatchPlan;
    result: SimulationResult;
    timestamp: number;
  }[];
}

export interface CustomCase {
  id: string;
  teacherId: string;
  name: string;
  level: Level;
  assignedStudents: string[];
}
