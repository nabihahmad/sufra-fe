import { beforeEach, describe, expect, it } from "vitest";
import { createMeal, getMeals, replacePlanMeal, updateMeal } from "./api";
import { generateWeekPlan, weekDates } from "./planner";
import { matchesCategory, normalizeMeal, type Meal } from "./types";
import { decideDay } from "./day-outcomes";

const riceChicken: Meal = { id: "rice-chicken", name: "رز بدجاج", categories: ["rice", "chicken"], userId: "u1", timesCooked: 0 };

describe("multi-category dishes", () => {
  beforeEach(() => localStorage.clear());
  it("matches rice and chicken independently without matching meat", () => {
    expect(matchesCategory(riceChicken, "rice")).toBe(true);
    expect(matchesCategory(riceChicken, "chicken")).toBe(true);
    expect(matchesCategory(riceChicken, "meat")).toBe(false);
  });
  it("matches pasta and meat independently", () => {
    const pastaMeat = { ...riceChicken, categories: ["pasta", "meat"] as Meal["categories"] };
    expect(matchesCategory(pastaMeat, "pasta")).toBe(true);
    expect(matchesCategory(pastaMeat, "meat")).toBe(true);
    expect(matchesCategory(pastaMeat, "chicken")).toBe(false);
  });
  it("creates and edits multiple categories in placeholder APIs", async () => {
    const created = await createMeal({ name: riceChicken.name, categories: ["rice", "chicken"], userId: "u1" });
    expect((await getMeals()).find((m) => m.id === created.id)?.categories).toEqual(["rice", "chicken"]);
    await updateMeal(created.id, { categories: ["pasta", "meat"] });
    expect((await getMeals()).find((m) => m.id === created.id)?.categories).toEqual(["pasta", "meat"]);
  });
  it("retains legacy dishes on read", () => {
    const { categories, ...legacy } = riceChicken;
    expect(normalizeMeal({ ...legacy, category: "rice" }).categories).toEqual(["rice"]);
  });
  it("plans using any assigned category", () => {
    const plan = generateWeekPlan([riceChicken], ["u1"], ["2026-11-18", "2026-11-19"]);
    expect(new Set(plan.map((d) => d.category))).toEqual(new Set(["rice", "chicken"]));
  });
  it("allows replacement matching a secondary category", async () => {
    localStorage.setItem("mock_meals", JSON.stringify([riceChicken]));
    const date = "2099-11-18";
    localStorage.setItem(`mock_plan_${weekDates(new Date(date + "T12:00:00"))[0]}`, JSON.stringify([{ date, mealId: "old", category: "chicken", proposedBy: "u1" }]));
    expect((await replacePlanMeal(date, riceChicken.id))[0]?.mealId).toBe(riceChicken.id);
  });
  it("captures every category in closed history", () => {
    const closed = decideDay({ date: "2026-11-18", mealId: riceChicken.id, category: "rice", proposedBy: "u1" }, "cooked", riceChicken, "2026-11-18");
    expect(closed.mealCategories).toEqual(["rice", "chicken"]);
  });
});