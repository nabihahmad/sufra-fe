import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChefHat, Loader2 } from "lucide-react";
import { getMeals, getWeekPlan, login } from "@/lib/api";
import { setSession } from "@/lib/auth";
import { localDate } from "@/lib/day-outcomes";
import { weekDates } from "@/lib/planner";
import type { Meal, PlanDay } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | سفرة البيت" },
      { name: "description", content: "سجّل دخولك لإدارة وجبات البيت الأسبوعية." },
      { property: "og:title", content: "تسجيل الدخول | سفرة البيت" },
      { property: "og:description", content: "سجّل دخولك لإدارة وجبات البيت الأسبوعية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await login(username, password);
      if (res.success && res.user && res.token) {
        setSession(res.user, res.token);
        navigate({ to: "/calendar" });
      } else setError("اسم المستخدم أو كلمة المرور غير صحيحة");
    } catch {
      setError("تعذّر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const input = "w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring";
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-warm text-primary-foreground shadow-soft"><ChefHat className="h-8 w-8" /></div>
          <h1 className="text-4xl font-bold">سفرة البيت</h1>
          <p className="mt-2 text-muted-foreground">شو منطبخ هالأسبوع؟</p>
        </div>
        <WeekMenu />
        <form onSubmit={submit} className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-soft">
          <label className="block space-y-1.5"><span className="text-sm font-medium">اسم المستخدم</span>
            <input className={input} value={username} onChange={(e) => setUsername(e.target.value)} required /></label>
          <label className="block space-y-1.5"><span className="text-sm font-medium">كلمة المرور</span>
            <input type="password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-warm py-3 font-bold text-primary-foreground shadow-soft transition hover:opacity-90 disabled:opacity-60">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}دخول
          </button>
          {/* <p className="text-center text-xs text-muted-foreground">تجريبي: نبيه / سارة / كريم / ليلى — كلمة المرور 1234</p> */}
        </form>
      </div>
    </div>
  );
}

const dayName = (date: string) =>
  new Intl.DateTimeFormat("ar", { weekday: "long" }).format(new Date(date + "T12:00:00"));
const shortDate = (date: string) =>
  new Intl.DateTimeFormat("ar", { day: "numeric", month: "numeric" }).format(new Date(date + "T12:00:00"));

/** Public list of the past and upcoming week's dishes, shown above the login form. */
function WeekMenu() {
  const [weeks, setWeeks] = useState<{ title: string; days: PlanDay[] }[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);

  useEffect(() => {
    const today = new Date();
    Promise.all([getWeekPlan(today), getMeals()])
      .then(([current, mealList]) => {
        setWeeks([
          { title: "هالأسبوع", days: current },
        ]);
        setMeals(mealList);
      })
      .catch(() => {});
  }, []);

  if (!weeks.length) return null;
  const todayStr = localDate();
  const dishName = (day: PlanDay) =>
    day.status === "free" ? "يوم حر" : day.mealName ?? meals.find((m) => m.id === day.mealId)?.name ?? "—";

  return (
    <section className="mb-8 space-y-4">
      {weeks.map((week) => (
        <div key={week.title} className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <h2 className="mb-3 text-lg font-bold">{week.title}</h2>
          <ul className="divide-y divide-border">
            {week.days.map((day) => (
              <li key={day.date} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className={day.date === todayStr ? "font-bold text-primary" : "text-muted-foreground"}>
                  {dayName(day.date)} {shortDate(day.date)}
                </span>
                <span className={day.date === todayStr ? "font-bold" : ""}>{dishName(day)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
