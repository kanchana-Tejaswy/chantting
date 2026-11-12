import { sanitizeRedirectPath } from "./validation";

export const PROTECTED_ROUTE_PREFIXES = [
  "/sadhana",
  "/onboarding",
  "/account",
] as const;

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function buildAuthRedirectPath(
  pathname: string,
  search = ""
): string {
  const fullTarget = sanitizeRedirectPath(`${pathname}${search}`, "/sadhana");
  return `/auth?next=${encodeURIComponent(fullTarget)}`;
}

