import type { Trip } from "@/db/generated/client";
import { fileUrl } from "@/server/storage/uploads";
import type { Payee } from "./pay-sheet";

/** Who/where to pay: the Coach's trip payout details, or a member's own UPI ID (P2P). */
export function resolvePayee(trip: Pick<Trip, "upiVpa" | "upiPayeeName" | "upiQrKey">, member: { id: string; displayName: string; upiVpa: string | null }, isCoach: boolean): Payee {
  return {
    memberId: member.id,
    name: member.displayName,
    vpa: isCoach ? (trip.upiVpa ?? member.upiVpa) : member.upiVpa,
    payeeName: isCoach ? (trip.upiPayeeName ?? member.displayName) : member.displayName,
    staticQrUrl: isCoach ? fileUrl(trip.upiQrKey) : null,
  };
}

export function waLink(phone: string | null | undefined, text: string) {
  const digits = phone?.replace(/\D/g, "");
  return `https://wa.me/${digits ?? ""}?text=${encodeURIComponent(text)}`;
}
