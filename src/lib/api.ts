/**
 * Placeholder API layer. Every function documents the backend endpoint it will call.
 * Set VITE_API_URL to hit the real backend; otherwise an in-browser mock (localStorage) is used.
 */
import type { DayOutcome, Meal, PlanDay, User } from "./types";
import { matchesCategory, normalizeMeal } from "./types";
import { generateWeekPlan, weekDates } from "./planner";
import { decideDay, isClosed, mergeRegeneratedPlan } from "./day-outcomes";

const API_URL = import.meta.env["VITE_API_URL"] as string | undefined;

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
  });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ---------- mock store ----------
const MOCK_USERS: User[] = [
  { id: "u1", name: "نبيه", isAdmin: true, isSuperAdmin: true },
  { id: "u2", name: "سارة", isAdmin: true, isSuperAdmin: false },
  { id: "u3", name: "كريم", isAdmin: true, isSuperAdmin: false },
  { id: "u4", name: "ليلى", isAdmin: true, isSuperAdmin: false },
];
const SEED: Meal[] = [
  ["كبة بالصينية", "meat", "u1", 6], ["مشاوي لحم", "meat", "u2", 4], ["شيش طاووق", "chicken", "u1", 8],
  ["دجاج بالفرن", "chicken", "u3", 5], ["مسخن", "chicken", "u4", 3], ["صيادية سمك", "fish", "u2", 2],
  ["سمكة حرة", "fish", "u4", 3], ["معكرونة بالبشاميل", "pasta", "u3", 7], ["سباغيتي بولونيز", "pasta", "u1", 5],
  ["مقلوبة", "rice", "u2", 9], ["رز بدجاج", "rice", "u4", 6], ["كبسة", "rice", "u3", 4],
  ["بامية بلحمة", "stew", "u4", 5], ["فاصوليا بيضاء", "stew", "u1", 3], ["ملوخية", "stew", "u2", 6],
  ["مجدرة", "vegetarian", "u3", 4], ["فتوش وفلافل", "vegetarian", "u1", 2], ["محشي ورق عنب", "vegetarian", "u4", 5],
].map(([name, category, userId, timesCooked], i) => ({ id: `m${i}`, name, categories: [category], userId, timesCooked } as Meal));

const load = <T,>(k: string, d: T): T => {
  const v = localStorage.getItem(k);
  return v ? JSON.parse(v) : d;
};
const save = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));
const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const getMockMeals = () => load<Parameters<typeof normalizeMeal>[0][]>("mock_meals", SEED).map(normalizeMeal);

// ---------- auth ----------
/** POST /auth/login  { username, password } -> { success, user?, token? } */
export async function login(username: string, password: string): Promise<{ success: boolean; user?: User; token?: string }> {
  if (API_URL) return http("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
  await delay();
  const user = MOCK_USERS.find((u) => u.name === username.trim());
  return user && password === "1234" ? { success: true, user, token: "mock-token" } : { success: false };
}

/** GET /users */
export async function getUsers(): Promise<User[]> {
  if (API_URL) return http("/users");
  return MOCK_USERS;
}

// ---------- meals ----------
/** GET /meals -> Meal[] with categories: Category[] (legacy category is accepted on reads). */
export async function getMeals(): Promise<Meal[]> {
  if (API_URL) return (await http<Parameters<typeof normalizeMeal>[0][]>("/meals")).map(normalizeMeal);
  await delay(100);
  return getMockMeals();
}

/** POST /meals { name, categories: Category[], notes?, userId } -> Meal */
export async function createMeal(meal: Omit<Meal, "id" | "timesCooked">): Promise<Meal> {
  if (!meal.categories.length) throw new Error("اختر تصنيفاً واحداً على الأقل");
  if (API_URL) return normalizeMeal(await http<Meal>("/meals", { method: "POST", body: JSON.stringify(meal) }));
  const m: Meal = { ...meal, id: crypto.randomUUID(), timesCooked: 0 };
  save("mock_meals", [...getMockMeals(), m]);
  return m;
}

/** PUT /meals/:id { name?, categories?: Category[], notes?, ... } -> Meal */
export async function updateMeal(id: string, patch: Partial<Meal>): Promise<Meal> {
  if (patch.categories && !patch.categories.length) throw new Error("اختر تصنيفاً واحداً على الأقل");
  if (API_URL) return normalizeMeal(await http<Meal>(`/meals/${id}`, { method: "PUT", body: JSON.stringify(patch) }));
  const all = getMockMeals().map((m) => (m.id === id ? { ...m, ...patch } : m));
  save("mock_meals", all);
  const meal = all.find((m) => m.id === id);
  if (!meal) throw new Error("الطبق غير موجود");
  return meal;
}

/** DELETE /meals/:id */
export async function deleteMeal(id: string): Promise<void> {
  if (API_URL) return http(`/meals/${id}`, { method: "DELETE" });
  save("mock_meals", getMockMeals().filter((m) => m.id !== id));
}

// ---------- weekly plan ----------
/** GET /plan/week?start=YYYY-MM-DD  (backend generates the plan if none exists) */
export async function getWeekPlan(start = new Date()): Promise<PlanDay[]> {
  const dates = weekDates(start);
  if (API_URL) return http(`/plan/week?start=${dates[0]}`);
  const key = `mock_plan_${dates[0]}`;
  const existing = load<PlanDay[] | null>(key, null);
  if (existing) return existing;
  const plan = generateWeekPlan(getMockMeals(), MOCK_USERS.map((u) => u.id), dates);
  save(key, plan);
  return plan;
}

/** POST /plan/week/regenerate */
export async function regenerateWeekPlan(start = new Date()): Promise<PlanDay[]> {
  const dates = weekDates(start);
  if (API_URL) return http(`/plan/week/regenerate`, { method: "POST", body: JSON.stringify({ start: dates[0] }) });
  const previous = load<PlanDay[]>(`mock_plan_${dates[0]}`, []);
  const plan = mergeRegeneratedPlan(previous, generateWeekPlan(getMockMeals(), MOCK_USERS.map((u) => u.id), dates));
  save(`mock_plan_${dates[0]}`, plan);
  return plan;
}

/** PUT /plan/day/:date  { mealId } */
export async function replacePlanMeal(date: string, mealId: string): Promise<PlanDay[]> {
  if (API_URL) return http(`/plan/day/${date}`, { method: "PUT", body: JSON.stringify({ mealId }) });
  const key = `mock_plan_${weekDates(new Date(date + "T12:00:00"))[0]}`;
  const meal = getMockMeals().find((m) => m.id === mealId);
  const existing = load<PlanDay[]>(key, []);
  const day = existing.find((d) => d.date === date);
  if (!day || isClosed(day)) throw new Error("هذا اليوم مغلق ولا يمكن تغييره");
  if (!meal || !matchesCategory(meal, day.category)) throw new Error("اختر طبقاً من التصنيف نفسه");
  const plan = existing.map((d) => (d.date === date ? { ...d, mealId, proposedBy: meal.userId } : d));
  save(key, plan);
  return plan;
}

/** POST /plan/day/:date/outcome { status: "cooked" | "free" } -> updated week.
 * Backend must atomically close the day, retain a dish snapshot, increment only for
 * cooked, reject future/closed days, and enforce authenticated permissions.
 */
export async function recordDayOutcome(date: string, status: DayOutcome): Promise<PlanDay[]> {
  if (API_URL) return http(`/plan/day/${date}/outcome`, { method: "POST", body: JSON.stringify({ status }) });
  const key = `mock_plan_${weekDates(new Date(date + "T12:00:00"))[0]}`;
  const plan = load<PlanDay[]>(key, []);
  const day = plan.find((d) => d.date === date);
  if (!day) throw new Error("اليوم غير موجود");
  const meals = getMockMeals();
  const meal = meals.find((m) => m.id === day.mealId);
  const closed = decideDay(day, status, meal);
  const next = plan.map((d) => d.date === date ? closed : d);
  // Synchronous mock writes prevent duplicate clicks from counting twice.
  save(key, next);
  if (status === "cooked") save("mock_meals", meals.map((m) => m.id === day.mealId ? { ...m, timesCooked: m.timesCooked + 1 } : m));
  return next;
}

/** GET /plan/history?from=YYYY-MM-DD&to=YYYY-MM-DD -> closed days with dish snapshots */
export async function getPlanHistory(from: string, to: string): Promise<PlanDay[]> {
  if (API_URL) return http(`/plan/history?from=${from}&to=${to}`);
  const days: PlanDay[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("mock_plan_")) days.push(...load<PlanDay[]>(key, []));
  }
  return days.filter((d) => isClosed(d) && d.date >= from && d.date <= to).sort((a, b) => a.date.localeCompare(b.date));
}
