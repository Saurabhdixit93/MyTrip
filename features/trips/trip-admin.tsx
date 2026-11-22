"use client";

import { Archive, Lock, LockOpen, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/lib/i18n";
import { deleteTripAction, setTripStatusAction } from "@/server/actions/trips";

type Status = "ACTIVE" | "LOCKED" | "ARCHIVED";

export function TripStatusControls({ tripId, status }: { tripId: string; status: Status }) {
  const [pending, start] = useTransition();
  const set = (next: Status) =>
    start(async () => {
      const res = await setTripStatusAction({ tripId, status: next });
      if (!res.ok) toast.error(res.error);
    });
  return (
    <div className="flex flex-wrap gap-2">
      {status === "ACTIVE" ? (
        <>
          <Button variant="outline" disabled={pending} onClick={() => set("LOCKED")}>
            <Lock /> {t("settings.lock")}
          </Button>
          <Button variant="outline" disabled={pending} onClick={() => set("ARCHIVED")}>
            <Archive /> {t("settings.archive")}
          </Button>
        </>
      ) : (
        <Button variant="outline" disabled={pending} onClick={() => set("ACTIVE")}>
          <LockOpen /> {status === "LOCKED" ? t("settings.unlock") : t("settings.unarchive")}
        </Button>
      )}
    </div>
  );
}

export function DeleteTripDialog({ tripId, tripName }: { tripId: string; tripName: string }) {
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  const remove = () =>
    start(async () => {
      const res = await deleteTripAction({ tripId });
      if (res && !res.ok) toast.error(res.error);
    });
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 /> {t("settings.delete")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("settings.delete")}</DialogTitle>
          <DialogDescription>{t("settings.deleteBody")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="confirm-delete">{t("settings.deleteConfirm")}</Label>
          <Input id="confirm-delete" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={tripName} autoComplete="off" />
        </div>
        <DialogFooter>
          <Button variant="destructive" disabled={pending || confirm.trim() !== tripName.trim()} onClick={remove}>
            {t("settings.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
