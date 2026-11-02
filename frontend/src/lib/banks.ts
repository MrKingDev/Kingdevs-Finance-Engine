export const BANK_COLORS: Record<string, string> = {
  Chase: "#0752a0",
  "Bank of America": "#c41230",
  "Capital One": "#004977",
  "Wells Fargo": "#b31e30",
  Citi: "#004b76",
  "American Express": "#006b9c",
  Discover: "#a64700",
  "Ally Bank": "#651366",
  "TD Bank": "#256b24",
  "U.S. Bank": "#263872",
  "PNC Bank": "#9a4b00",
  "Navy Federal": "#25496b",
};

export function bankColor(name: string): string {
  const normalized = name.trim().toLowerCase();
  const known = Object.entries(BANK_COLORS).find(
    ([bank]) => bank.toLowerCase() === normalized,
  );
  if (known) return known[1];
  let hash = 0;
  for (let index = 0; index < normalized.length; index++)
    hash = (hash * 31 + normalized.charCodeAt(index)) | 0;
  const hue = ((hash % 360) + 360) % 360;
  // Same HSL fallback, converted to hex for the native Settings color picker.
  const channel = (offset: number) => {
    const k = (offset + hue / 30) % 12;
    const value = 0.3 - 0.165 * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255).toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

export function bankTextColor(color: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return "#ffffff";
  const [r, g, b] = [1, 3, 5].map((offset) => {
    const value = parseInt(color.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? "#000000" : "#ffffff";
}
