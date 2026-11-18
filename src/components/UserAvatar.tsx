import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONES = ["bg-primary text-primary-foreground", "bg-olive text-primary-foreground", "bg-accent text-accent-foreground", "bg-secondary text-secondary-foreground"];

export function UserAvatar({ user, size = "md", index = 0 }: { user?: User | undefined; size?: "sm" | "md" | "lg"; index?: number }) {
  const s = size === "sm" ? "h-7 w-7 text-xs" : size === "lg" ? "h-14 w-14 text-xl" : "h-10 w-10 text-sm";
  if (!user) return <div className={cn("rounded-full bg-muted", s)} />;
  return user.avatarUrl ? (
    <img src={user.avatarUrl} alt={user.name} title={user.name} className={cn("rounded-full object-cover ring-2 ring-card", s)} />
  ) : (
    <div title={user.name} className={cn("flex items-center justify-center rounded-full font-bold ring-2 ring-card", s, TONES[index % 4])}>
      {user.name.slice(0, 1)}
    </div>
  );
}
