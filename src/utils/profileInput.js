export const sanitizeProfileName = (value) =>
  String(value ?? "")
    .replace(/[^A-Za-z ]/g, "")
    .replace(/ {2,}/g, " ");

export const isValidProfileName = (value) =>
  /^[A-Za-z]+(?: [A-Za-z]+)*$/.test(String(value ?? "").trim());

export const normalizeIndianPhone = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  const localDigits = digits.length === 12 && digits.startsWith("91")
    ? digits.slice(2)
    : digits;

  return localDigits.slice(0, 10);
};

