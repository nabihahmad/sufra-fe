import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Coffee } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getMeals, getPlanHistory } from "@/lib/api";
import { localDate } from "@/lib/day-outcomes";
import { categoryEmoji, categoryLabel, type Meal, type PlanDay, type User } from "@/lib/types";

export const Route = createFileRoute("/statistics")({
  head: () => ({ meta: [
    { title: "إحصاءات الطبخ | سفرة البيت" },
    { name: "description", content: "مقارنة الأطباق المطبوخة وسجل وجبات البيت خلال الأشهر الماضية." },
    { property: "og:title", content: "إحصاءات الطبخ | سفرة البيت" },
    { property: "og:description", content: "مقارنة الأطباق المطبوخة وسجل وجبات البيت خلال الأشهر الماضية." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <AppShell>{(me) => <StatisticsPage me={me} />}</AppShell>,
});

const MONTH = new Intl.DateTimeFormat("ar", { month: "long", year: "numeric" });
const WEEKDAYS = ["سبت", "أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة"];

function StatisticsPage({ me }: { me: User }) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [history, setHistory] = useState<PlanDay[]>([]);
  const [monthsCount, setMonthsCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const now = new Date();
  const months = Array.from({ length: monthsCount }, (_, i) => new Date(now.getFullYear(), now.getMonth() - i, 1));
  const from = localDate(new Date(now.getFullYear(), now.getMonth() - monthsCount + 1, 1));
  const today = localDate(now);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([getMeals(), getPlanHistory(from, today)])
      .then(([m, h]) => { if (active) { setMeals(m); setHistory(h); } })
      .catch(() => { if (active) setError("تعذّر تحميل الإحصاءات"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, today]);

  const sorted = [...meals].sort((a, b) => b.timesCooked - a.timesCooked);
  const total = meals.reduce((sum, meal) => sum + meal.timesCooked, 0);
  const max = Math.max(1, ...meals.map((meal) => meal.timesCooked));

  return <div>
    <h1 className="mb-6 text-3xl font-bold">إحصاءات الطبخ</h1>
    {loading ? <p role="status" className="py-8 text-muted-foreground">جارٍ تحميل الإحصاءات…</p> : error ? <p role="alert" className="py-8 text-destructive">{error}</p> : <>
      <section className="mb-10 border-b border-border pb-8">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-bold">كم مرة طُبخ؟</h2>
          <span className="text-sm text-muted-foreground">المجموع: {total} وجبة · كل الأوقات</span>
        </div>
        <ul className="grid gap-x-8 gap-y-4 md:grid-cols-2">
          {sorted.map((meal) => <li key={meal.id}>
            <div className="mb-1 flex items-start justify-between gap-3 text-sm">
              <span><span className={meal.userId === me.id ? "font-bold" : ""}>{meal.name}</span><span className="block text-xs text-muted-foreground">{meal.categories.map(categoryLabel).join("، ")}</span></span>
              <span className="shrink-0 text-muted-foreground">{meal.timesCooked} · {total ? Math.round(meal.timesCooked / total * 100) : 0}%</span>
            </div>
            <meter aria-label={`عدد مرات طبخ ${meal.name}`} min={0} max={max} value={meal.timesCooked} className={`cooked-meter ${meal.userId === me.id ? "cooked-meter-mine" : ""}`} />
          </li>)}
        </ul>
        {!meals.length && <p className="text-muted-foreground">لا توجد أطباق بعد.</p>}
      </section>
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">سجل الأيام</h2>
          <select aria-label="فترة سجل الطبخ" value={monthsCount} onChange={(e) => setMonthsCount(Number(e.target.value))} className="rounded-lg border border-input bg-card px-3 py-2 text-sm">
            <option value={1}>آخر شهر</option><option value={3}>آخر ٣ أشهر</option><option value={6}>آخر ٦ أشهر</option><option value={12}>آخر ١٢ شهراً</option>
          </select>
        </div>
        <div className="mb-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Check className="h-3 w-3 text-olive" />تم الطبخ</span>
          <span className="flex items-center gap-1"><Coffee className="h-3 w-3" />يوم حر</span>
          <span>— لم يُسجّل</span>
        </div>
        {!history.length && <p className="mb-5 text-sm text-muted-foreground">لا توجد أيام مسجّلة في هذه الفترة.</p>}
        <div className="grid gap-8 lg:grid-cols-2">
          {months.map((month) => <MonthHistory key={localDate(month)} month={month} history={history} today={today} />)}
        </div>
      </section>
    </>}
  </div>;
}

function MonthHistory({ month, history, today }: { month: Date; history: PlanDay[]; today: string }) {
  const padding = (month.getDay() + 1) % 7;
  const length = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return <div>
    <h3 className="mb-3 font-bold">{MONTH.format(month)}</h3>
    <div className="grid grid-cols-7">
      {WEEKDAYS.map((day) => <span key={day} className="py-2 text-center text-[10px] text-muted-foreground sm:text-xs">{day}</span>)}
      {Array.from({ length: padding }, (_, i) => <div key={`pad-${i}`} />)}
      {Array.from({ length }, (_, i) => {
        const date = localDate(new Date(month.getFullYear(), month.getMonth(), i + 1));
        const day = history.find((entry) => entry.date === date);
        const label = day?.status === "cooked" ? day.mealName ?? "طبق مطبوخ" : day?.status === "free" ? "يوم حر" : date > today ? "" : "—";
        return <div key={date} data-history-date={date} title={`${date} ${label} ${day?.status === "cooked" ? (day.mealCategories ?? [day.category]).map(categoryLabel).join("، ") : ""}`} className={`min-h-24 min-w-0 border border-border p-1.5 ${day?.status === "cooked" ? "bg-olive/10" : day?.status === "free" ? "bg-secondary" : "bg-card"} ${date > today ? "opacity-40" : ""}`}>
          <span className={`text-xs ${date === today ? "font-bold text-primary" : "text-muted-foreground"}`}>{i + 1}</span>
          {day && <span className="mt-1 block text-sm">{day.status === "free" ? "☕" : categoryEmoji(day.category)}</span>}
          <p className="mt-1 break-words text-[10px] leading-snug sm:text-xs">{label}</p>
        </div>;
      })}
    </div>
  </div>;
}