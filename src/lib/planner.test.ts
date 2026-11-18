import { describe, expect, it } from "vitest";
import { generateWeekPlan } from "./planner";
import { CATEGORIES, type Meal } from "./types";

const users = ["u1", "u2", "u3", "u4"];
const meals: Meal[] = users.flatMap((u) =>
  CATEGORIES.map((c) => ({ id: `${u}-${c.id}`, name: c.label, categories: [c.id], userId: u, timesCooked: 0 })),
);
const dates = ["d1", "d2", "d3", "d4", "d5", "d6", "d7"];

describe("generateWeekPlan", () => {
  it("gives every day of the week a different category", () => {
    const plan = generateWeekPlan(meals, users, dates);
    expect(new Set(plan.map((p) => p.category)).size).toBe(7);
  });
  it("picks meals from all 4 users, not a single one", () => {
    const plan = generateWeekPlan(meals, users, dates);
    expect(new Set(plan.map((p) => p.proposedBy)).size).toBe(4);
  });
});
