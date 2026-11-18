import type { DayOutcome, Meal, PlanDay } from "./types";

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export const isClosed = (day: PlanDay) => day.status === "cooked" || day.status === "free";
export const canDecideDay = (day: PlanDay, today = localDate()) => day.date <= today && !isClosed(day);

export function decideDay(day: PlanDay, outcome: DayOutcome, meal: Meal | undefined, today = localDate()): PlanDay {
  if (!canDecideDay(day, today)) throw new Error("لا يمكن تسجيل نتيجة لهذا اليوم");
  if (outcome === "cooked" && !meal) throw new Error("الطبق غير موجود");
  const name = meal?.name ?? day.mealName;
  return { ...day, status: outcome, ...(name !== undefined ? { mealName: name } : {}), ...(meal ? { mealCategories: [...meal.categories] } : {}) };
}

export function mergeRegeneratedPlan(previous: PlanDay[], generated: PlanDay[]): PlanDay[] {
  return generated.map((day) => previous.find((old) => old.date === day.date && isClosed(old)) ?? day);
}