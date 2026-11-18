import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Coffee, LockKeyhole, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { UserAvatar } from "@/components/UserAvatar";
import { getMeals, getUsers, getWeekPlan, recordDayOutcome, regenerateWeekPlan, replacePlanMeal } from "@/lib/api";
import { categoryEmoji, categoryLabel, matchesCategory, type DayOutcome, type Meal, type PlanDay, type User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { canDecideDay, isClosed, localDate } from "@/lib/day-outcomes";
import { weekDates } from "@/lib/planner";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "وجبات الأسبوع | سفرة البيت" },
      { name: "description", content: "خطة وجبات الأسبوع المقترحة من أطباق كل أفراد البيت." },
      { property: "og:title", content: "وجبات الأسبوع | سفرة البيت" },
      { property: "og:description", content: "خطة وجبات الأسبوع المقترحة من أطباق كل أفراد البيت." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AppShell>{(u) => <CalendarPage me={u} />}</AppShell>,
});

const DAY = new Intl.DateTimeFormat("ar", { weekday: "long" });
const DATE = new Intl.DateTimeFormat("ar", { day: "numeric", month: "long" });

function CalendarPage({ me }: { me: User }) {
  const [plan, setPlan] = useState<PlanDay[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [week, setWeek] = useState(() => weekDates()[0] ?? localDate());
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([getWeekPlan(new Date(week + "T12:00:00")), getMeals(), getUsers()])
      .then(([p, m, u]) => { if (active) { setPlan(p); setMeals(m); setUsers(u); } })
      .catch(() => { if (active) setError("تعذّر تحميل الأسبوع"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [week]);

  const today = localDate();
  const userIdx = (id: string) => users.findIndex((u) => u.id === id);

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try { await action(); } catch (e) { toast.error(e instanceof Error ? e.message : "تعذّر حفظ التغيير"); }
    finally { setBusy(false); }
  };
  const change = (date: string, mealId: string) => run(async () => {
    setPlan(await replacePlanMeal(date, mealId));
    toast.success("تم تغيير الطبق");
  });
  const decide = (date: string, status: DayOutcome) => run(async () => {
    if (!window.confirm(status === "cooked" ? "تسجيل الطبق كمطبوخ وإغلاق اليوم؟" : "تسجيل يوم حر دون احتساب طبق وإغلاق اليوم؟")) return;
    setPlan(await recordDayOutcome(date, status));
    setMeals(await getMeals());
    toast.success(status === "cooked" ? "تم تسجيل الطبخ وإغلاق اليوم" : "تم تسجيل يوم حر");
  });
  const moveWeek = (offset: number) => {
    const next = new Date(week + "T12:00:00");
    next.setDate(next.getDate() + offset);
    setWeek(localDate(next));
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">وجبات الأسبوع</h1>
          <p className="text-muted-foreground">كل يوم صنف مختلف، ومن اقتراحات الجميع</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2 space-x-reverse">{users.map((u, i) => <UserAvatar key={u.id} user={u} size="sm" index={i} />)}</div>
          {me.isSuperAdmin && (
            <Button variant="outline" disabled={busy || loading} onClick={() => run(async () => setPlan(await regenerateWeekPlan(new Date(week + "T12:00:00"))))} className="rounded-full"><RefreshCw />خطة جديدة</Button>
          )}
        </div>
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" aria-label="الأسبوع السابق" title="الأسبوع السابق" disabled={busy} onClick={() => moveWeek(-7)}><ChevronRight /></Button>
        <span className="text-sm font-medium">{DATE.format(new Date(week + "T12:00:00"))} — {DATE.format(new Date((weekDates(new Date(week + "T12:00:00"))[6] ?? week) + "T12:00:00"))}</span>
        <Button variant="outline" size="icon" aria-label="الأسبوع التالي" title="الأسبوع التالي" disabled={busy} onClick={() => moveWeek(7)}><ChevronLeft /></Button>
        <Button variant="ghost" disabled={busy} onClick={() => setWeek(weekDates()[0] ?? today)}>هذا الأسبوع</Button>
      </div>
      {error && <p role="alert" className="py-8 text-destructive">{error}</p>}
      {loading && <p role="status" className="py-8 text-muted-foreground">جارٍ تحميل الأسبوع…</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {!loading && !error && plan.length === 0 && <p role="status" className="col-span-full py-8 text-center text-muted-foreground">لا توجد وجبات مخططة لهذا الأسبوع.</p>}
        {!loading && !error && plan.map((d) => {
          const meal = meals.find((m) => m.id === d.mealId);
          const owner = users.find((u) => u.id === d.proposedBy);
          const canEdit = me.isAdmin && d.proposedBy === me.id && !isClosed(d);
          const options = meals.filter((m) => matchesCategory(m, d.category));
          const dishCategories = d.mealCategories ?? meal?.categories ?? [d.category];
          const isToday = d.date === today;
          const dt = new Date(d.date + "T12:00:00");
          return (
            <div key={d.date} data-date={d.date} className={`flex flex-col rounded-3xl border bg-card p-4 ${isToday ? "border-primary shadow-soft" : "border-border"}`}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-display text-lg font-bold">{DAY.format(dt)}</p>
                  <p className="text-xs text-muted-foreground">{DATE.format(dt)}</p>
                </div>
                {isToday && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">اليوم</span>}
              </div>
              <div className="mb-3 flex flex-1 flex-col items-center justify-center rounded-2xl bg-secondary py-5 text-center">
                <span className="text-4xl">{d.status === "free" ? "☕" : categoryEmoji(d.category)}</span>
                <span className="mt-1 px-2 text-center text-xs text-muted-foreground">{d.status === "free" ? "دون احتساب طبق" : dishCategories.map(categoryLabel).join("، ")}</span>
                <p className="mt-2 px-2 font-bold">{d.status === "free" ? "يوم حر" : d.mealName ?? meal?.name ?? "—"}</p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <UserAvatar user={owner} size="sm" index={userIdx(d.proposedBy)} />
                  {owner?.name}
                </div>
              </div>
              {isClosed(d) && <p className={`mt-3 flex items-center gap-1 text-xs font-bold ${d.status === "cooked" ? "text-olive" : "text-muted-foreground"}`}><LockKeyhole className="h-3 w-3" />{d.status === "cooked" ? "تم الطبخ · مغلق" : "يوم حر · مغلق"}</p>}
              {canEdit && (
                <select aria-label="تغيير الطبق" disabled={busy} value={d.mealId} onChange={(e) => change(d.date, e.target.value)} className="mt-3 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                  {options.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} — {users.find((u) => u.id === m.userId)?.name}</option>
                  ))}
                </select>
              )}
              {me.isSuperAdmin && canDecideDay(d, today) && <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" disabled={busy || !meal} onClick={() => decide(d.date, "cooked")} className="bg-olive text-primary-foreground hover:bg-olive/90"><Check />تم الطبخ</Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => decide(d.date, "free")}><Coffee />يوم حر</Button>
              </div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
