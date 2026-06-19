export function formatDuration(days: number | null, lang: string) {
  const language = lang.split("-")[0];
  if (days === null) {
    if (language === "ru") return "Навсегда";
    if (language === "de") return "Lebenslang";
    return "Lifetime";
  }
  if (language === "ru") {
    const mod10 = days % 10;
    const mod100 = days % 100;
    const word = mod10 === 1 && mod100 !== 11 ? "день" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "дня" : "дней";
    return `${days} ${word}`;
  }
  if (language === "de") return `${days} ${days === 1 ? "Tag" : "Tage"}`;
  return `${days} ${days === 1 ? "day" : "days"}`;
}
