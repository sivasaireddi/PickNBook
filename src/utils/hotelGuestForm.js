import { isPlaceholderHotelEmail, normalizeHotelTitle } from "./hotelSupplierPayload";

const clean = (value) => String(value ?? "").trim();

export const HOTEL_GUEST_FIELD_ORDER = [
  "title",
  "firstName",
  "lastName",
  "age",
  "email",
  "phone",
  "pan",
  "passport",
];

export const isValidHotelGuestName = (value) => /^[A-Za-z]{2,}$/.test(clean(value));
export const isValidHotelAdultAge = (value) => /^\d+$/.test(clean(value)) && Number(value) >= 18 && Number(value) <= 99;
export const isValidHotelChildAge = (value) => /^\d+$/.test(clean(value)) && Number(value) >= 0 && Number(value) <= 17;
export const isValidHotelGuestEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(value)) && !isPlaceholderHotelEmail(value);
export const normalizeHotelGuestPhone = (value) => {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
};
export const isValidHotelGuestPhone = (value) => /^[6-9]\d{9}$/.test(clean(value));

export function getHotelGuestErrors(pax = {}, { isPANMandatory = false, isPassportMandatory = false } = {}) {
  const errors = {};
  if (!normalizeHotelTitle(pax.title)) errors.title = "Select a title.";
  if (!isValidHotelGuestName(pax.firstName)) errors.firstName = "Enter at least 2 letters using letters only.";
  if (!isValidHotelGuestName(pax.lastName)) errors.lastName = "Enter at least 2 letters using letters only.";
  if (pax.isChild ? !isValidHotelChildAge(pax.age) : !isValidHotelAdultAge(pax.age)) {
    errors.age = pax.isChild ? "Child age must be between 0 and 17." : "Adult age must be between 18 and 99.";
  }
  if (pax.isLead && !isValidHotelGuestEmail(pax.email)) errors.email = "Enter a valid email address.";
  if (pax.isLead && !isValidHotelGuestPhone(pax.phone)) errors.phone = "Enter a valid 10-digit mobile number.";
  if (isPANMandatory && !/^[A-Z]{3}[PCHFATGJLE][A-Z][0-9]{4}[A-Z]$/.test(clean(pax.pan).toUpperCase())) {
    errors.pan = "Valid 10-character PAN is required.";
  }
  if (isPassportMandatory && !clean(pax.passport)) errors.passport = "Passport number is required.";
  return errors;
}

const rawValue = (raw, keys) => {
  for (const key of keys) {
    const value = raw?.[key];
    if (value !== undefined && value !== null && clean(value) !== "") return value;
  }
  return "";
};

export function mapSavedTravelerToHotelGuest(traveler = {}) {
  const raw = traveler.raw || traveler;
  const rawNameParts = clean(rawValue(raw, ["name", "Name"])).split(/\s+/).filter(Boolean);
  const nameTitle = normalizeHotelTitle(rawNameParts[0]);
  const title = normalizeHotelTitle(rawValue(raw, ["title", "Title"])) || nameTitle;
  const nameParts = nameTitle ? rawNameParts.slice(1) : rawNameParts;
  const firstName = clean(rawValue(raw, ["firstName", "FirstName"]) || nameParts[0]);
  const lastName = clean(rawValue(raw, ["lastName", "LastName"]) || nameParts.slice(1).join(" "));
  const dob = rawValue(raw, ["dateOfBirth", "DateOfBirth", "dob", "Dob"]);
  let age = rawValue(raw, ["age", "Age"]);
  if (clean(age) === "" && dob) {
    const birthDate = new Date(dob);
    if (!Number.isNaN(birthDate.getTime())) {
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) age -= 1;
    }
  }
  return {
    title,
    firstName,
    lastName,
    age: clean(age),
    email: clean(rawValue(raw, ["email", "Email"])),
    phone: normalizeHotelGuestPhone(rawValue(raw, ["phoneNumber", "PhoneNumber", "phoneNo", "PhoneNo", "mobileNumber", "mobile", "phone", "Phone"])),
  };
}
