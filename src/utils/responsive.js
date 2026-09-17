import { Dimensions, PixelRatio } from "react-native";

let screenWidth = Dimensions.get("window").width;
let screenHeight = Dimensions.get("window").height;

Dimensions.addEventListener("change", ({ window }) => {
  screenWidth = window.width;
  screenHeight = window.height;
});

export const widthPercentageToDP = (widthPercent) => {
  const elemWidth = typeof widthPercent === "number" ? widthPercent : parseFloat(widthPercent);
  return PixelRatio.roundToNearestPixel((screenWidth * elemWidth) / 100);
};

export const heightPercentageToDP = (heightPercent) => {
  const elemHeight = typeof heightPercent === "number" ? heightPercent : parseFloat(heightPercent);
  return PixelRatio.roundToNearestPixel((screenHeight * elemHeight) / 100);
};

// Baseline width for standard sizing (e.g., iPhone X / 375 width)
const BASE_WIDTH = 375;

export const scale = (size) => {
  const newSize = (screenWidth / BASE_WIDTH) * size;
  // Clamp the scale to not blow up on tablets and not shrink too small
  const clampedSize = Math.max(size * 0.8, Math.min(newSize, size * 1.3));
  return PixelRatio.roundToNearestPixel(clampedSize);
};

export const getBannerHeight = (height) => {
  const h = height || screenHeight || Dimensions.get("window").height;
  return Math.min(Math.max(h * 0.34, 200), 300);
};

export const wp = widthPercentageToDP;
export const hp = heightPercentageToDP;

