import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "cn";

const TONES = ["bg-teal-100 text-teal-900", "bg-amber-100 text-amber-900", "bg-sky-100 text-sky-900", "bg-rose-100 text-rose-900", "bg-violet-100 text-violet-900", "bg-lime-100 text-lime-900"];

function tone(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

export function MemberAvatar({ id, name, image, className }: { id: string; name: string; image?: string | null; className?: string }) {
  return (
    <Avatar className={cn("size-9", className)}>
      {image ? <AvatarImage src={image} alt="" /> : null}
      <AvatarFallback className={cn("text-xs font-semibold", tone(id))}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
