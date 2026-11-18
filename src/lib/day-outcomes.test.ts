import { beforeEach, describe, expect, it } from "vitest";
import { canDecideDay, decideDay, isClosed, mergeRegeneratedPlan } from "./day-outcomes";
import { getMeals, getPlanHistory, recordDayOutcome, regenerateWeekPlan, replacePlanMeal } from "./api";
import { weekDates } from "./planner";
import type { Meal, PlanDay } from "./types";

const meal: Meal = { id: "test-meal", name: "طبق اختبار", categories: ["chicken"], userId: "u1", timesCooked: 0 };
const day: PlanDay = { date: "2026-11-16", mealId: meal.id, category: "chicken", proposedBy: "u1" };

describe("daily outcome rules", () => {
  it("permits cooked and free-day decisions on past days and today", () => {
    expect(canDecideDay({ ...day, date: "2026-11-15" }, "2026-11-16")).toBe(true);
    expect(canDecideDay(day, "2026-11-16")).toBe(true);
  });
  it("rejects outcomes on future days", () => {
    expect(() => decideDay({ ...day, date: "2026-11-17" }, "cooked", meal, "2026-11-16")).toThrow();
    expect(() => decideDay({ ...day, date: "2026-11-17" }, "free", meal, "2026-11-16")).toThrow();
  });
  it("closes cooked days and retains a dish snapshot", () => {
    const closed = decideDay(day, "cooked", meal, "2026-11-16");
    expect(closed.mealName).toBe(meal.name);
    expect(isClosed(closed)).toBe(true);
    expect(() => decideDay(closed, "free", meal, "2026-11-16")).toThrow();
  });
  it("closes free days", () => {
    const closed = decideDay(day, "free", meal, "2026-11-16");
    expect(isClosed(closed)).toBe(true);
    expect(() => decideDay(closed, "cooked", meal, "2026-11-16")).toThrow();
  });
  it("preserves closed days when regenerating while allowing open days to change", () => {
    const cooked = { ...day, status: "cooked" as const };
    const free = { ...day, date: "2026-11-15", status: "free" as const };
    const pending = { ...day, date: "2026-11-17" };
    const next = [cooked, free, pending].map((d) => ({ ...d, mealId: "replacement" }));
    expect(mergeRegeneratedPlan([cooked, free, pending], next).map((d) => d.mealId)).toEqual([meal.id, meal.id, "replacement"]);
  });
});

describe("placeholder outcome API", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("mock_meals", JSON.stringify([meal, { ...meal, id: "replacement" }]));
    localStorage.setItem(`mock_plan_${weekDates(new Date(day.date + "T12:00:00"))[0]}`, JSON.stringify([day]));
  });
  it("counts cooked exactly once, locks replacement, and exposes history", async () => {
    await recordDayOutcome(day.date, "cooked");
    await expect(recordDayOutcome(day.date, "cooked")).rejects.toThrow();
    await expect(replacePlanMeal(day.date, "replacement")).rejects.toThrow();
    expect((await getMeals()).find((m) => m.id === meal.id)?.timesCooked).toBe(1);
    expect((await getPlanHistory("2026-11-01", "2026-11-30"))[0]?.mealName).toBe(meal.name);
    expect((await regenerateWeekPlan(new Date(day.date + "T12:00:00"))).find((d) => d.date === day.date)?.status).toBe("cooked");
  });
  it("does not increment any dish on a free day", async () => {
    await recordDayOutcome(day.date, "free");
    expect((await getMeals()).map((m) => m.timesCooked)).toEqual([0, 0]);
    await expect(replacePlanMeal(day.date, "replacement")).rejects.toThrow();
  });
  it("allows future pending dishes to be changed", async () => {
    const future = { ...day, date: "2099-11-17" };
    localStorage.setItem(`mock_plan_${weekDates(new Date(future.date + "T12:00:00"))[0]}`, JSON.stringify([future]));
    expect((await replacePlanMeal(future.date, "replacement"))[0]?.mealId).toBe("replacement");
    await expect(recordDayOutcome(future.date, "free")).rejects.toThrow();
  });
});