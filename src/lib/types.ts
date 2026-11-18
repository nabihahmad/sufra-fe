export type Category = "meat" | "chicken" | "fish" | "pasta" | "rice" | "stew" | "vegetarian";

export const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: "meat", label: "لحم", emoji: "🥩" },
  { id: "chicken", label: "دجاج", emoji: "🍗" },
  { id: "fish", label: "سمك", emoji: "🐟" },
  { id: "pasta", label: "معكرونة", emoji: "🍝" },
  { id: "rice", label: "أرز", emoji: "🍚" },
  { id: "stew", label: "يخنة", emoji: "🍲" },
  { id: "vegetarian", label: "نباتي", emoji: "🥗" },
];

export const categoryLabel = (c: Category) => CATEGORIES.find((x) => x.id === c)?.label ?? c;
export const categoryEmoji = (c: Category) => CATEGORIES.find((x) => x.id === c)?.emoji ?? "🍽️";

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export interface Meal {
  id: string;
  name: string;
  categories: Category[];
  userId: string;
  notes?: string;
  timesCooked: number;
}

export interface PlanDay {
  date: string; // YYYY-MM-DD
  mealId: string;
  category: Category;
  proposedBy: string; // userId
  status?: "pending" | "cooked" | "free";
  mealName?: string; // Snapshot retained when a day is closed
  mealCategories?: Category[];
}

export type DayOutcome = "cooked" | "free";

/** Read legacy single-category records without losing existing browser dishes. */
export function normalizeMeal(meal: Meal | (Omit<Meal, "categories"> & { category: Category })): Meal {
  if ("categories" in meal) return { ...meal, categories: [...new Set(meal.categories)] };
  const { category, ...rest } = meal;
  return { ...rest, categories: [category] };
}

export const matchesCategory = (meal: Meal, category: Category | "all") => category === "all" || meal.categories.includes(category);
