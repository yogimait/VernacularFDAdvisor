export type FontScaleOption = "default" | "sm" | "lg" | "xl";

export const FONT_SCALE_STORAGE_KEY = "fdadvisor:font-scale";

const FONT_SCALE_MAP: Record<FontScaleOption, string | null> = {
  default: null,
  sm: "15px",
  lg: "17px",
  xl: "18px",
};

export function normalizeFontScale(value: string | null): FontScaleOption {
  if (value === "sm" || value === "lg" || value === "xl") {
    return value;
  }

  return "default";
}

export function applyFontScale(option: FontScaleOption) {
  if (typeof document === "undefined") {
    return;
  }

  const size = FONT_SCALE_MAP[option];
  if (!size) {
    document.documentElement.style.removeProperty("font-size");
    return;
  }

  document.documentElement.style.fontSize = size;
}
