export const LOWERCASE_EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
export const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export function validateLowercaseEmail(value, requiredMessage = "Email is required") {
  const raw = String(value ?? "");
  const email = raw.trim();

  if (!email) {
    return requiredMessage;
  }

  if (/\s/.test(raw)) {
    return "Email cannot contain spaces";
  }

  if (/[A-Z]/.test(raw)) {
    return "Use lowercase letters only";
  }

  if (!LOWERCASE_EMAIL_REGEX.test(email)) {
    return "Enter a valid email address";
  }

  return "";
}

export function validatePasswordNoSpaces(value, label = "Password") {
  const password = String(value ?? "");

  if (!password) {
    return `${label} is required`;
  }

  if (/\s/.test(password)) {
    return `${label} cannot contain spaces`;
  }

  return "";
}

export function validateStrongPassword(value, label = "Password") {
  const spaceError = validatePasswordNoSpaces(value, label);
  if (spaceError) {
    return spaceError;
  }

  const password = String(value ?? "");

  if (password.length < 8) {
    return `${label} must be at least 8 characters`;
  }

  if (password.length > 64) {
    return `${label} cannot exceed 64 characters`;
  }

  if (!STRONG_PASSWORD_REGEX.test(password)) {
    return `${label} must include uppercase, lowercase, number and special character`;
  }

  return "";
}
