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
import { evaluatePlan, canEvaluate } from '@/engine/simulation';

const STORAGE_KEYS = {
  studentRecords: 'drone-game-student-records',
  customCases: 'drone-game-custom-cases',
  currentStudent: 'drone-game-current-student',
} as const;

const DEFAULT_STUDENT = { id: 'student-001', name: '张三' };

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
  currentStudent: { id: string; name: string };
  availableLevels: Level[];
}

interface GameActions {
  setCurrentLevel: (levelId: string) => void;
  addRoute: (route: Route) => void;
  updateRoute: (routeId: string, updates: Partial<Route>) => void;
  removeRoute: (routeId: string) => void;
  addPurchase: (purchase: Purchase) => void;
  removePurchase: (type: string) => void;
  startSimulation: () => { ok: boolean; reason?: string };
  updateSimulationTime: (time: number) => void;
  setActiveEvent: (event: RandomEvent | null) => void;
  runEvaluation: () => { ok: boolean; reason?: string; result?: SimulationResult };
  completeSimulation: (result: SimulationResult) => void;
  resetSimulation: () => void;
  savePlan: () => boolean;
  loadStudentRecords: () => void;
  addCustomCase: (c: CustomCase) => void;
  updateCustomCase: (id: string, updates: Partial<CustomCase>) => void;
  deleteCustomCase: (id: string) => void;
  assignCaseToStudent: (caseId: string, studentId: string) => void;
  unassignCaseFromStudent: (caseId: string, studentId: string) => void;
  getBestResult: (levelId: string) => SimulationResult | null;
  getLevelStars: (levelId: string) => 0 | 1 | 2 | 3;
  getStudentPlans: (studentId: string, levelId: string) => { plan: DispatchPlan; result: SimulationResult; timestamp: number }[];
  getAllStudents: () => { id: string; name: string }[];
  setCurrentStudent: (student: { id: string; name: string }) => void;
  refreshAvailableLevels: () => void;
}

const MOCK_STUDENTS = [
  { id: 'student-001', name: '张三' },
  { id: 'student-002', name: '李四' },
  { id: 'student-003', name: '王五' },
];

export const useGameStore = create<GameState & GameActions>()((set, get) => {
  const initialCustomCases = loadFromStorage<CustomCase[]>(STORAGE_KEYS.customCases, []);
  const initialStudent = loadFromStorage<{ id: string; name: string }>(STORAGE_KEYS.currentStudent, DEFAULT_STUDENT);

  const computeAvailableLevels = (cases: CustomCase[], studentId: string): Level[] => {
    const assignedCases = cases
      .filter((c) => c.assignedStudents.includes(studentId))
      .map((c) => c.level);
    return [...LEVELS, ...assignedCases];
  };

  return {
    levels: LEVELS,
    currentLevelId: null,
    drones: DRONE_MODELS,
    currentPlan: null,
    simulationResult: null,
    isSimulating: false,
    simulationTime: 0,
    studentRecords: loadFromStorage<StudentRecord[]>(STORAGE_KEYS.studentRecords, []),
    customCases: initialCustomCases,
    activeEvent: null,
    currentStudent: initialStudent,
    availableLevels: computeAvailableLevels(initialCustomCases, initialStudent.id),

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
      const existing = plan.purchases.find((p) => p.type === purchase.type);
      if (existing) {
        set({
          currentPlan: {
            ...plan,
            purchases: plan.purchases.map((p) =>
              p.type === purchase.type
                ? { ...p, count: p.count + purchase.count, cost: p.cost + purchase.cost }
                : p
            ),
          },
        });
      } else {
        set({
          currentPlan: { ...plan, purchases: [...plan.purchases, purchase] },
        });
      }
    },

    removePurchase: (type: string) => {
      const plan = get().currentPlan;
      if (!plan) return;
      set({
        currentPlan: { ...plan, purchases: plan.purchases.filter((p) => p.type !== type) },
      });
    },

    startSimulation: () => {
      const plan = get().currentPlan;
      if (!plan) return { ok: false, reason: '请先选择关卡' };
      const check = canEvaluate(plan);
      if (!check.ok) return check;
      set({ isSimulating: true, simulationTime: 0, simulationResult: null, activeEvent: null });
      return { ok: true };
    },

    updateSimulationTime: (time: number) => {
      set({ simulationTime: time });
    },

    setActiveEvent: (event: RandomEvent | null) => {
      set({ activeEvent: event });
    },

    runEvaluation: () => {
      const { currentPlan, currentLevelId, availableLevels, drones } = get();
      if (!currentPlan || !currentLevelId) return { ok: false, reason: '请先选择关卡' };
      const level = availableLevels.find((l) => l.id === currentLevelId);
      if (!level) return { ok: false, reason: '关卡不存在' };
      const check = canEvaluate(currentPlan);
      if (!check.ok) return check;
      const result = evaluatePlan(currentPlan, level, drones);
      set({ simulationResult: result, isSimulating: false, activeEvent: null });
      return { ok: true, result };
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

    savePlan: (): boolean => {
      const { currentPlan, simulationResult, studentRecords, currentStudent } = get();
      if (!currentPlan || !simulationResult) return false;

      const levelId = currentPlan.levelId;
      const entry = { plan: currentPlan, result: simulationResult, timestamp: Date.now() };

      let updated = [...studentRecords];
      const studentIdx = updated.findIndex((r) => r.studentId === currentStudent.id && r.levelId === levelId);

      if (studentIdx >= 0) {
        updated[studentIdx] = {
          ...updated[studentIdx],
          plans: [...updated[studentIdx].plans, entry],
        };
      } else {
        updated.push({
          studentId: currentStudent.id,
          levelId,
          plans: [entry],
        });
      }

      set({ studentRecords: updated });
      saveToStorage(STORAGE_KEYS.studentRecords, updated);
      return true;
    },

    loadStudentRecords: () => {
      const records = loadFromStorage<StudentRecord[]>(STORAGE_KEYS.studentRecords, []);
      set({ studentRecords: records });
    },

    addCustomCase: (c: CustomCase) => {
      const updated = [...get().customCases, c];
      set({ customCases: updated });
      saveToStorage(STORAGE_KEYS.customCases, updated);
      get().refreshAvailableLevels();
    },

    updateCustomCase: (id: string, updates: Partial<CustomCase>) => {
      const updated = get().customCases.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      );
      set({ customCases: updated });
      saveToStorage(STORAGE_KEYS.customCases, updated);
      get().refreshAvailableLevels();
    },

    deleteCustomCase: (id: string) => {
      const updated = get().customCases.filter((c) => c.id !== id);
      set({ customCases: updated });
      saveToStorage(STORAGE_KEYS.customCases, updated);
      get().refreshAvailableLevels();
    },

    assignCaseToStudent: (caseId: string, studentId: string) => {
      const customCases = get().customCases;
      const updated = customCases.map((c) =>
        c.id === caseId && !c.assignedStudents.includes(studentId)
          ? { ...c, assignedStudents: [...c.assignedStudents, studentId] }
          : c
      );
      set({ customCases: updated });
      saveToStorage(STORAGE_KEYS.customCases, updated);
      get().refreshAvailableLevels();
    },

    unassignCaseFromStudent: (caseId: string, studentId: string) => {
      const customCases = get().customCases;
      const updated = customCases.map((c) =>
        c.id === caseId
          ? { ...c, assignedStudents: c.assignedStudents.filter((s) => s !== studentId) }
          : c
      );
      set({ customCases: updated });
      saveToStorage(STORAGE_KEYS.customCases, updated);
      get().refreshAvailableLevels();
    },

    getBestResult: (levelId: string): SimulationResult | null => {
      const { studentRecords, currentStudent } = get();
      const record = studentRecords.find(
        (r) => r.studentId === currentStudent.id && r.levelId === levelId
      );
      if (!record || record.plans.length === 0) return null;
      return record.plans.reduce((best, cur) =>
        cur.result.stars > best.result.stars ? cur : best
      ).result;
    },

    getLevelStars: (levelId: string): 0 | 1 | 2 | 3 => {
      const best = get().getBestResult(levelId);
      return best ? best.stars : 0;
    },

    getStudentPlans: (studentId: string, levelId: string) => {
      const { studentRecords } = get();
      const record = studentRecords.find(
        (r) => r.studentId === studentId && r.levelId === levelId
      );
      return record ? record.plans : [];
    },

    getAllStudents: () => MOCK_STUDENTS,

    setCurrentStudent: (student) => {
      set({ currentStudent: student });
      saveToStorage(STORAGE_KEYS.currentStudent, student);
      get().refreshAvailableLevels();
    },

    refreshAvailableLevels: () => {
      const { customCases, currentStudent } = get();
      set({
        availableLevels: computeAvailableLevels(customCases, currentStudent.id),
      });
    },
  };
});
