import { theme } from "../../theme/tokens";

export const authTheme = {
  colors: {
    ...theme.colors,
    background: "#FBF8F7",
    surfaceSoft: "#FFF8F7",
    coral: "#F05A5F",
    error: "#C72C3B",
    errorSoft: "#FFF0F1",
    successSoft: "#ECF9F3",
  },
  radii: {
    small: 12,
    medium: 16,
    large: 24,
    pill: 999,
  },
  shadow: {
    shadowColor: "#41131A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
};
