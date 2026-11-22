export type AppErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "VALIDATION" | "RATE_LIMITED" | "LOCKED";

/** Expected, user-safe errors. Anything else is logged and replaced with a generic message. */
export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
  }
}
