/**
 * Check if an error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error && typeof error === "object") {
    const err = error as { status?: number; code?: string; message?: string };
    return (
      err.status === 401 ||
      err.status === 403 ||
      err.code === "session_not_found" ||
      err.code === "PGRST301" ||
      err.message?.includes("JWT") === true ||
      err.message?.includes("session") === true ||
      err.message?.includes("not authenticated") === true
    );
  }
  return false;
}
