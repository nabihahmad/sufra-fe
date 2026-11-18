import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { UserAvatar } from "@/components/UserAvatar";
import { createMeal, deleteMeal, getMeals, getUsers, updateMeal } from "@/lib/api";
import { CATEGORIES, categoryEmoji, categoryLabel, matchesCategory, type Category, type Meal, type User } from "@/lib/types";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/meals")({
  head: () => ({
    meta: [
      { title: "أطباقي | سفرة البيت" },
      { name: "description", content: "أضف أطباقك المفضلة وصنّفها وتابع كم مرة طُبخت." },
      { property: "og:title", content: "أطباقي | سفرة البيت" },
      { property: "og:description", content: "أضف أطباقك المفضلة وصنّفها وتابع كم مرة طُبخت." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AppShell>{(u) => <MealsPage me={u} />}</AppShell>,
});

function MealsPage({ me }: { me: User }) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [editing, setEditing] = useState<Meal | "new" | null>(null);
  const [filter, setFilter] = useState<"mine" | "all">("mine");
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");

  const reload = () => getMeals().then(setMeals);
  useEffect(() => { reload(); getUsers().then(setUsers); }, []);

  const shown = meals.filter((m) => (filter === "all" || m.userId === me.id) && matchesCategory(m, categoryFilter));
  const userIdx = (id: string) => users.findIndex((u) => u.id === id);

  const remove = async (m: Meal) => {
    if (!confirm(`حذف "${m.name}"؟`)) return;
    await deleteMeal(m.id);
    toast.success("تم الحذف");
    reload();
  };

  return (
    <div>
      <section>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">الأطباق</h1>
          <div className="flex gap-2">
            <div className="flex rounded-full bg-secondary p-1 text-sm">
              {(["mine", "all"] as const).map((f) => (
                <Button variant="ghost" aria-pressed={filter === f} key={f} onClick={() => setFilter(f)} className={`rounded-full px-4 py-1.5 ${filter === f ? "bg-card shadow-soft font-bold" : "text-muted-foreground"}`}>{f === "mine" ? "أطباقي" : "الكل"}</Button>
              ))}
            </div>
            <Button onClick={() => setEditing("new")} className="rounded-full bg-warm font-bold text-primary-foreground shadow-soft"><Plus />طبق جديد</Button>
          </div>
        </div>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium">التصنيف
            <select aria-label="تصفية حسب التصنيف" className="rounded-lg border border-input bg-card px-3 py-2" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as Category | "all")}>
              <option value="all">كل التصنيفات</option>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
            </select>
          </label>
          <span className="text-sm text-muted-foreground">{shown.length} طبق</span>
        </div>
        <div className="divide-y divide-border border-y border-border">
          {shown.map((m) => {
            const owner = users.find((u) => u.id === m.userId);
            const mine = m.userId === me.id;
            return (
              <div key={m.id} className="flex items-center gap-3 py-3 sm:px-3">
                <span className="text-3xl">{categoryEmoji(m.categories[0] ?? "vegetarian")}</span>
                <div className="min-w-0 flex-1">
                  <p className="break-words font-bold">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.categories.map(categoryLabel).join("، ")} · طُبخ {m.timesCooked} مرة</p>
                </div>
                <UserAvatar user={owner} size="sm" index={userIdx(m.userId)} />
                {mine && (
                  <div className="flex">
                    <Button variant="ghost" size="icon" aria-label="تعديل" title="تعديل" onClick={() => setEditing(m)} className="rounded-full text-muted-foreground"><Pencil /></Button>
                    <Button variant="ghost" size="icon" aria-label="حذف" title="حذف" onClick={() => remove(m)} className="rounded-full text-destructive"><Trash2 /></Button>
                  </div>
                )}
              </div>
            );
          })}
          {!shown.length && <p className="py-8 text-muted-foreground">لا توجد أطباق بهذا التصنيف.</p>}
        </div>
      </section>
      {editing && <MealForm meal={editing === "new" ? null : editing} me={me} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </div>
  );
}

function MealForm({ meal, me, onClose, onSaved }: { meal: Meal | null; me: User; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(meal?.name ?? "");
  const [categories, setCategories] = useState<Category[]>(meal?.categories ?? []);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState(meal?.notes ?? "");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categories.length || saving) return;
    setSaving(true);
    try {
      if (meal) await updateMeal(meal.id, { name, categories, notes });
      else await createMeal({ name, categories, notes, userId: me.id });
      toast.success(meal ? "تم التعديل" : "تمت الإضافة");
      onSaved();
    } catch { toast.error("تعذّر حفظ الطبق"); }
    finally { setSaving(false); }
  };
  const input = "w-full rounded-xl border border-input bg-background px-4 py-2.5 outline-none focus:ring-2 focus:ring-ring";
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-4 rounded-3xl bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{meal ? "تعديل الطبق" : "طبق جديد"}</h2>
          <Button variant="ghost" size="icon" type="button" onClick={onClose} aria-label="إغلاق" className="rounded-full"><X /></Button>
        </div>
        <label className="block space-y-1.5"><span className="text-sm font-medium">اسم الطبق</span><input className={input} value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <div className="space-y-1.5">
          <span className="text-sm font-medium">التصنيفات</span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <input type="checkbox" checked={categories.includes(c.id)} onChange={(e) => setCategories((previous) => e.target.checked ? [...previous, c.id] : previous.filter((id) => id !== c.id))} className="h-4 w-4 accent-primary" />{c.emoji} {c.label}
              </label>
            ))}
          </div>
        </div>
        <label className="block space-y-1.5"><span className="text-sm font-medium">ملاحظات</span><textarea className={input} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        <Button type="submit" disabled={saving || !categories.length} className="w-full rounded-xl bg-warm font-bold text-primary-foreground">حفظ</Button>
      </form>
    </div>
  );
}
