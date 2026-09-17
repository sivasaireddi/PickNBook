/**
 * Traveler Form Validation Utilities
 *
 * Provides field-level and form-level validation for the Add/Edit Traveler form.
 * Kept separate from UI so it can be reused across screens.
 */

const TRAVELER_TYPES = ["Adult", "Child", "Infant"];
const TITLES = ["Mr", "Mrs", "Ms"];
const GENDERS = ["Male", "Female", "Other"];

/**
 * Validates a single email string (only if non-empty).
 * Returns an error message or empty string.
 */
export function validateEmail(email) {
  if (!email || !email.trim()) return "";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return "Please enter a valid email address.";
  }
  return "";
}

/**
 * Validates age against traveler type.
 * Adult → age must be 12 or above.
 * Child → age must be between 2 and 11.
 * Infant → age must be exactly 1.
 */
export function validateAge(age, type) {
  const numAge = Number(age);
  if (isNaN(numAge) || numAge <= 0) {
    return "Please enter a valid age.";
  }

  switch (type) {
    case "Adult":
      if (numAge < 12) return "Adult age must be 12 or above.";
      break;
    case "Child":
      if (numAge < 2 || numAge > 11) return "Child age must be between 2 and 11.";
      break;
    case "Infant":
      if (numAge !== 1) return "Infant age must be exactly 1.";
      break;
    default:
      return "Please select a traveler type.";
  }

  return "";
}

/**
 * Validates the entire traveler form data object.
 *
 * @param {Object} formData - The form values
 * @param {string} formData.type      - Adult / Child / Infant
 * @param {string} formData.title     - Mr / Mrs / Ms
 * @param {string} formData.firstName
 * @param {string} formData.lastName
 * @param {string} formData.gender    - Male / Female / Other
 * @param {string|number} formData.age
 * @param {string} [formData.email]
 * @param {string} [formData.phoneNo]
 * @param {string} [formData.passportNo]
 * @param {string} formData.country
 *
 * @returns {{ isValid: boolean, errors: Object<string, string> }}
 */
export function validateTravelerForm(formData) {
  const errors = {};

  // Required: type
  if (!formData.type || !TRAVELER_TYPES.includes(formData.type)) {
    errors.type = "Please select a traveler type.";
  }

  // Required: title
  if (!formData.title || !TITLES.includes(formData.title)) {
    errors.title = "Please select a title.";
  }

  // Required: firstName
  if (!formData.firstName || !formData.firstName.trim()) {
    errors.firstName = "First name is required.";
  }

  // Required: lastName
  if (!formData.lastName || !formData.lastName.trim()) {
    errors.lastName = "Last name is required.";
  }

  // Required: gender
  if (!formData.gender || !GENDERS.includes(formData.gender)) {
    errors.gender = "Please select a gender.";
  }

  // Required: age + type-specific rules
  if (!formData.age && formData.age !== 0) {
    errors.age = "Age is required.";
  } else {
    const ageError = validateAge(formData.age, formData.type);
    if (ageError) errors.age = ageError;
  }

  // Required: country
  if (!formData.country || !formData.country.trim()) {
    errors.country = "Country is required.";
  }

  // Optional: email validation (only if provided)
  if (formData.email && formData.email.trim()) {
    const emailError = validateEmail(formData.email);
    if (emailError) errors.email = emailError;
  }

  // Optional: phone max length 30
  if (formData.phoneNo && String(formData.phoneNo).length > 30) {
    errors.phoneNo = "Phone number must be 30 characters or fewer.";
  }

  const isValid = Object.keys(errors).length === 0;
  return { isValid, errors };
}

/**
 * Sanitizes the form data before sending to the API.
 * - Trims string fields
 * - Converts age to number
 * - Empty optional fields are sent as "" (never null) per backend requirements
 */
export function sanitizeTravelerPayload(formData) {
  return {
    type: formData.type,
    title: formData.title,
    firstName: (formData.firstName || "").trim(),
    lastName: (formData.lastName || "").trim(),
    gender: formData.gender,
    age: Number(formData.age),
    email: (formData.email || "").trim() || "",
    phoneNo: (formData.phoneNo || "").trim() || "",
    passportNo: (formData.passportNo || "").trim() || "",
    country: (formData.country || "").trim(),
  };
}

export { TRAVELER_TYPES, TITLES, GENDERS };

