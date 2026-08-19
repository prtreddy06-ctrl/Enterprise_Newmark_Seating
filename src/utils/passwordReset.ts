import { saveFirestoreDoc, getFirestoreDoc, deleteFirestoreDoc } from "../lib/firestoreSync";

export interface PasswordResetToken {
  id: string; // the token itself
  email: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
}

const TOKEN_TTL_MINUTES = 30;
const COLLECTION = "passwordResetTokens";

function generateToken(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now()}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  return `prt_${random}`;
}

/**
 * Creates a single-use password reset token for the given email, valid for
 * TOKEN_TTL_MINUTES, and returns the full reset URL to email to the user.
 */
export async function createPasswordResetToken(email: string): Promise<{ token: string; resetUrl: string }> {
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_MINUTES * 60 * 1000);

  const record: PasswordResetToken = {
    id: token,
    email: email.trim().toLowerCase(),
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    used: false
  };

  await saveFirestoreDoc<PasswordResetToken>(COLLECTION, record);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const resetUrl = `${origin}/?resetToken=${encodeURIComponent(token)}`;
  return { token, resetUrl };
}

/**
 * Validates a reset token: must exist, not be used, and not be expired.
 */
export async function validatePasswordResetToken(
  token: string
): Promise<{ valid: boolean; email?: string; reason?: string }> {
  if (!token) return { valid: false, reason: "Missing reset token." };

  const record = await getFirestoreDoc<PasswordResetToken>(COLLECTION, token);
  if (!record) {
    return { valid: false, reason: "This reset link is invalid. Please request a new one." };
  }
  if (record.used) {
    return { valid: false, reason: "This reset link has already been used. Please request a new one." };
  }
  if (new Date(record.expiresAt).getTime() < Date.now()) {
    return { valid: false, reason: "This reset link has expired. Please request a new one." };
  }
  return { valid: true, email: record.email };
}

/**
 * Marks a token as used (consumed) after a successful password reset.
 */
export async function consumePasswordResetToken(token: string): Promise<void> {
  await deleteFirestoreDoc(COLLECTION, token);
}
