"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/** Fires a one-off toast (e.g. after a redirect) without needing client state upstream. */
export function ToastOnMount({ message, type = "success" }: { message: string; type?: "success" | "info" }) {
  useEffect(() => {
    toast[type](message);
  }, [message, type]);
  return null;
}
