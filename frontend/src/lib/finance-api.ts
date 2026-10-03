export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export async function apiError(
  response: Response,
  fallback: string,
): Promise<string> {
  const body = await response.json().catch(() => null);
  if (typeof body?.detail === "string") return body.detail;
  if (Array.isArray(body?.detail)) {
    return body.detail.map((error: { msg: string }) => error.msg).join("; ");
  }
  return fallback;
}

export function notifyFinanceChanged() {
  window.dispatchEvent(new Event("finance-data-changed"));
}
