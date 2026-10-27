import { Award, CircleCheck, Compass, Flag, Flame, Globe, Medal, Mountain, Star, Target, Trophy, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  flag: Flag,
  star: Star,
  mountain: Mountain,
  trophy: Trophy,
  medal: Medal,
  flame: Flame,
  check: CircleCheck,
  award: Award,
  target: Target,
  compass: Compass,
  globe: Globe,
};

/** Icon for an achievement's icon_key; unknown keys fall back to a medal. */
export function AchievementIcon({ iconKey, className }: { iconKey: string | null; className?: string }) {
  const Icon = (iconKey && ICONS[iconKey]) || Medal;
  return <Icon aria-hidden="true" className={className} />;
}
