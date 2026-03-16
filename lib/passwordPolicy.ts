/**
 * Phase 5: Shared password policy – min 12 chars, 3 of 4 character classes, denylist.
 * Used by signup and reset-password flows (client + server).
 */

const MIN_LENGTH = 12;

const WEAK_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "Password1",
  "Password123",
  "admin",
  "admin123",
  "letmein",
  "welcome",
  "welcome1",
  "qwerty",
  "qwerty123",
  "123456",
  "12345678",
  "123456789",
  "1234567890",
  "abc123",
  "monkey",
  "dragon",
  "master",
  "sunshine",
  "princess",
  "football",
  "iloveyou",
  "trustno1",
  "superman",
  "passw0rd",
  "Password!",
  "Changeme1",
  "Changeme123",
]);

export type PasswordValidation = {
  valid: boolean;
  errors: string[];
};

function hasLower(s: string): boolean {
  return /[a-z]/.test(s);
}
function hasUpper(s: string): boolean {
  return /[A-Z]/.test(s);
}
function hasNumber(s: string): boolean {
  return /\d/.test(s);
}
function hasSymbol(s: string): boolean {
  return /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(s);
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters.`);
  }

  const classes = [hasLower(password), hasUpper(password), hasNumber(password), hasSymbol(password)];
  const count = classes.filter(Boolean).length;
  if (count < 3) {
    const missing: string[] = [];
    if (!hasLower(password)) missing.push("lowercase letter");
    if (!hasUpper(password)) missing.push("uppercase letter");
    if (!hasNumber(password)) missing.push("number");
    if (!hasSymbol(password)) missing.push("symbol");
    errors.push(
      `Use at least 3 of these: lowercase, uppercase, number, symbol. Missing: ${missing.join(", ")}.`
    );
  }

  if (WEAK_PASSWORDS.has(password) || WEAK_PASSWORDS.has(password.toLowerCase())) {
    errors.push("This password is too common. Choose a stronger one.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
