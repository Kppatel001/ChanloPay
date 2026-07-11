// Platform administrators. Only these email addresses can access the /admin area.
// Keep this list in sync with the isAdmin() helper in firestore.rules.
export const ADMIN_EMAILS: string[] = [
  'kartavyap43@gmail.com',
];

/** Returns true if the given email belongs to a platform administrator. */
export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  return ADMIN_EMAILS.map((a) => a.toLowerCase()).includes(e);
}
