import { create } from 'zustand';
import type {
  Level,
  DroneModel,
  DispatchPlan,
  SimulationResult,
  StudentRecord,
  CustomCase,
  Route,
  Purchase,
  RandomEvent,
} from '@/types';
import { LEVELS } from '@/data/levels';
import { DRONE_MODELS } from '@/data/drones';

const STORAGE_KEYS = {
  studentRecords: 'drone-game-student-records',
  customCases: 'drone-game-custom-cases',
} as const;

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable
  }
}

interface GameState {
  levels: Level[];
  currentLevelId: string | null;
  drones: DroneModel[];
  currentPlan: DispatchPlan | null;
  simulationResult: SimulationResult | null;
  isSimulating: boolean;
  simulationTime: number;
  studentRecords: StudentRecord[];
  customCases: CustomCase[];
  activeEvent: RandomEvent | null;
}

interface GameActions {
  setCurrentLevel: (levelId: string) => void;
  addRoute: (route: Route) => void;
  updateRoute: (routeId: string, updates: Partial<Route>) => void;
  removeRoute: (routeId: string) => void;
  addPurchase: (purchase: Purchase) => void;
  removePurchase: (type: string) => void;
  startSimulation: () => void;
  updateSimulationTime: (time: number) => void;
  setActiveEvent: (event: RandomEvent | null) => void;
  completeSimulation: (result: SimulationResult) => void;
  resetSimulation: () => void;
  savePlan: () => void;
  loadStudentRecords: () => void;
  addCustomCase: (c: CustomCase) => void;
  getBestResult: (levelId: string) => SimulationResult | null;
  getLevelStars: (levelId: string) => 0 | 1 | 2 | 3;
}

export const useGameStore = create<GameState & GameActions>()((set, get) => ({
  levels: LEVELS,
  currentLevelId: null,
  drones: DRONE_MODELS,
  currentPlan: null,
  simulationResult: null,
  isSimulating: false,
  simulationTime: 0,
  studentRecords: loadFromStorage<StudentRecord[]>(STORAGE_KEYS.studentRecords, []),
  customCases: loadFromStorage<CustomCase[]>(STORAGE_KEYS.customCases, []),
  activeEvent: null,

  setCurrentLevel: (levelId: string) => {
    set({
      currentLevelId: levelId,
      currentPlan: {
        id: crypto.randomUUID(),
        levelId,
        routes: [],
        purchases: [],
        timestamp: Date.now(),
      },
      simulationResult: null,
      isSimulating: false,
      simulationTime: 0,
      activeEvent: null,
    });
  },

  addRoute: (route: Route) => {
    const plan = get().currentPlan;
    if (!plan) return;
    set({ currentPlan: { ...plan, routes: [...plan.routes, route] } });
  },

  updateRoute: (routeId: string, updates: Partial<Route>) => {
    const plan = get().currentPlan;
    if (!plan) return;
    set({
      currentPlan: {
        ...plan,
        routes: plan.routes.map((r) =>
          r.id === routeId ? { ...r, ...updates } : r
        ),
      },
    });
  },

  removeRoute: (routeId: string) => {
    const plan = get().currentPlan;
    if (!plan) return;
    set({
      currentPlan: { ...plan, routes: plan.routes.filter((r) => r.id !== routeId) },
    });
  },

  addPurchase: (purchase: Purchase) => {
    const plan = get().currentPlan;
    if (!plan) return;
    set({
      currentPlan: { ...plan, purchases: [...plan.purchases, purchase] },
    });
  },

  removePurchase: (type: string) => {
    const plan = get().currentPlan;
    if (!plan) return;
    set({
      currentPlan: { ...plan, purchases: plan.purchases.filter((p) => p.type !== type) },
    });
  },

  startSimulation: () => {
    set({ isSimulating: true, simulationTime: 0, simulationResult: null, activeEvent: null });
  },

  updateSimulationTime: (time: number) => {
    set({ simulationTime: time });
  },

  setActiveEvent: (event: RandomEvent | null) => {
    set({ activeEvent: event });
  },

  completeSimulation: (result: SimulationResult) => {
    set({ simulationResult: result, isSimulating: false, activeEvent: null });
  },

  resetSimulation: () => {
    set({
      simulationResult: null,
      isSimulating: false,
      simulationTime: 0,
      activeEvent: null,
    });
  },

  savePlan: () => {
    const { currentPlan, simulationResult, studentRecords } = get();
    if (!currentPlan || !simulationResult) return;

    const levelId = currentPlan.levelId;
    const existing = studentRecords.find((r) => r.levelId === levelId);

    let updated: StudentRecord[];
    const entry = { plan: currentPlan, result: simulationResult, timestamp: Date.now() };

    if (existing) {
      updated = studentRecords.map((r) =>
        r.levelId === levelId
          ? { ...r, plans: [...r.plans, entry] }
          : r
      );
    } else {
      updated = [
        ...studentRecords,
        { studentId: 'default', levelId, plans: [entry] },
      ];
    }

    set({ studentRecords: updated });
    saveToStorage(STORAGE_KEYS.studentRecords, updated);
  },

  loadStudentRecords: () => {
    const records = loadFromStorage<StudentRecord[]>(STORAGE_KEYS.studentRecords, []);
    set({ studentRecords: records });
  },

  addCustomCase: (c: CustomCase) => {
    const updated = [...get().customCases, c];
    set({ customCases: updated });
    saveToStorage(STORAGE_KEYS.customCases, updated);
  },

  getBestResult: (levelId: string): SimulationResult | null => {
    const record = get().studentRecords.find((r) => r.levelId === levelId);
    if (!record || record.plans.length === 0) return null;
    return record.plans.reduce((best, cur) =>
      cur.result.stars > best.result.stars ? cur : best
    ).result;
  },

  getLevelStars: (levelId: string): 0 | 1 | 2 | 3 => {
    const best = get().getBestResult(levelId);
    return best ? best.stars : 0;
  },
}));
