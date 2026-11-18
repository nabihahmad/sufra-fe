import { CATEGORIES, type Category, type Meal, type PlanDay } from "./types";
import { localDate } from "./day-outcomes";

const shuffle = <T,>(arr: T[], rnd: () => number) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
};

/**
 * Builds a weekly plan:
 * - each day gets a different category (categories repeat only after all available ones are used)
 * - proposers rotate between users so meals come from everyone, not a single user
 */
export function generateWeekPlan(
  meals: Meal[],
  userIds: string[],
  dates: string[],
  rnd: () => number = Math.random,
): PlanDay[] {
  const available = CATEGORIES.map((c) => c.id).filter((c) => meals.some((m) => m.categories.includes(c)));
  if (!available.length) return [];
  let catQueue: Category[] = [];
  const usedMeals = new Set<string>();
  const users = shuffle(userIds, rnd);
  const plan: PlanDay[] = [];

  dates.forEach((date, i) => {
    if (!catQueue.length) catQueue = shuffle(available, rnd);
    const preferredUser = users[i % users.length];
    // try to find a category in the queue that the preferred user has a meal for
    let idx = catQueue.findIndex((c) =>
      meals.some((m) => m.categories.includes(c) && m.userId === preferredUser && !usedMeals.has(m.id)),
    );
    if (idx === -1) idx = 0;
    const category = catQueue.splice(idx, 1)[0] as Category;
    const pool = meals.filter((m) => m.categories.includes(category) && !usedMeals.has(m.id));
    const fromUser = pool.filter((m) => m.userId === preferredUser);
    const candidates = fromUser.length ? fromUser : pool.length ? pool : meals.filter((m) => m.categories.includes(category));
    const meal = candidates[Math.floor(rnd() * candidates.length)] as Meal;
    usedMeals.add(meal.id);
    plan.push({ date, mealId: meal.id, category, proposedBy: meal.userId });
  });
  return plan;
}

export function weekDates(start = new Date()): string[] {
  // week starts on Saturday
  const d = new Date(start);
  const diff = (d.getDay() + 1) % 7;
  d.setDate(d.getDate() - diff);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    return localDate(x);
  });
}
