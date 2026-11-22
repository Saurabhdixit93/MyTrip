import type { Transfer } from "@/lib/domain/settlement";

/** What the viewer pays and collects under the current settlement plan. */
export function myDues(plan: readonly Transfer[], meId: string) {
  const outgoing = plan.filter((t) => t.from === meId);
  const incoming = plan.filter((t) => t.to === meId);
  return {
    outgoing,
    incoming,
    owe: outgoing.reduce((s, t) => s + t.amountPaise, 0),
    get: incoming.reduce((s, t) => s + t.amountPaise, 0),
  };
}
