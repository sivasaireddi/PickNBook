const CAPTCHA_UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const CAPTCHA_LOWER = "abcdefghijkmnopqrstuvwxyz";
const CAPTCHA_NUMBERS = "23456789";
const CAPTCHA_ALL = `${CAPTCHA_UPPER}${CAPTCHA_LOWER}${CAPTCHA_NUMBERS}`;

function pickRandomChar(source) {
  return source.charAt(Math.floor(Math.random() * source.length));
}

function shuffleChars(chars) {
  const output = [...chars];

  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }

  return output.join("");
}

export function generateMixedCaptcha(length = 5) {
  const safeLength = Math.max(3, length);
  const chars = [
    pickRandomChar(CAPTCHA_UPPER),
    pickRandomChar(CAPTCHA_LOWER),
    pickRandomChar(CAPTCHA_NUMBERS),
  ];

  while (chars.length < safeLength) {
    chars.push(pickRandomChar(CAPTCHA_ALL));
  }

  return shuffleChars(chars);
}

export function validateCaptcha(input, generatedCaptcha) {
  const rawInput = String(input ?? "");
  const captchaValue = rawInput.trim();

  if (!captchaValue) {
    return "Captcha is required";
  }

  if (/\s/.test(rawInput)) {
    return "Captcha cannot contain spaces";
  }

  if (captchaValue.length !== String(generatedCaptcha || "").length) {
    return `Captcha must be ${String(generatedCaptcha || "").length} characters`;
  }

  if (captchaValue !== generatedCaptcha) {
    return "Captcha does not match";
  }

  return "";
}
