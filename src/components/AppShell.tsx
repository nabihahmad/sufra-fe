import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { BarChart3, CalendarDays, ChefHat, LogOut } from "lucide-react";
import { clearSession, useCurrentUser } from "@/lib/auth";
import { UserAvatar } from "./UserAvatar";
import { Button } from "./ui/button";

export function AppShell({ children }: { children: (user: NonNullable<ReturnType<typeof useCurrentUser>>) => ReactNode }) {
  const user = useCurrentUser();
  const navigate = useNavigate();
  useEffect(() => {
    if (user === null) navigate({ to: "/" });
  }, [user, navigate]);
  if (!user) return <div className="min-h-screen bg-background" />;
  const link = "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary";
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-warm text-primary-foreground"><ChefHat className="h-5 w-5" /></span>
            <span className="font-display text-xl font-bold">سفرة البيت</span>
          </div>
          <nav className="order-last flex w-full justify-center gap-1 sm:order-none sm:w-auto">
            <Button asChild variant="ghost" className={link}><Link to="/calendar" activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary" }}><CalendarDays className="h-4 w-4" />الأسبوع</Link></Button>
            <Button asChild variant="ghost" className={link}><Link to="/meals" activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary" }}><ChefHat className="h-4 w-4" />أطباقي</Link></Button>
            <Button asChild variant="ghost" className={link}><Link to="/statistics" activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary" }}><BarChart3 className="h-4 w-4" />الإحصاءات</Link></Button>
          </nav>
          <div className="flex items-center gap-2">
            <UserAvatar user={user} size="sm" />
            <span className="hidden text-sm sm:inline">{user.name}</span>
            <Button variant="ghost" size="icon" aria-label="تسجيل الخروج" onClick={() => { clearSession(); navigate({ to: "/" }); }} className="rounded-full text-muted-foreground"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children(user)}</main>
    </div>
  );
}
