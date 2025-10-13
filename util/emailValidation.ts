/**
 * Email validation utility for Harbor app
 * Only allows @cornell.edu emails and the specific app review email
 */

export const ALLOWED_EMAIL = "matgabdropshipping@gmail.com";

export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  const isCornellEmail = email.endsWith("@cornell.edu");
  const isAllowedEmail = email === ALLOWED_EMAIL;

  return isCornellEmail || isAllowedEmail;
}

export function getEmailRestrictionMessage(): string {
  return "Only Cornell University email addresses (@cornell.edu) are allowed to sign in to this app.";
}
