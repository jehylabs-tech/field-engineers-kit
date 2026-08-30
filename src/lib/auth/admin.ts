export const ADMIN_ALLOWED_EMAIL =
  process.env.ADMIN_ALLOWED_EMAIL ?? "jehylabs@gmail.com";

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.toLowerCase() === ADMIN_ALLOWED_EMAIL.toLowerCase();
}
