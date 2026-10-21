const labels = { plates: "plates", spoons: "spoons", forks: "forks", bowls: "small bowls" };
export function supplySummary(data) {
  const items = data?.details?.type === "cutlery" && data.details.items;
  if (items && typeof items === "object") {
    const entries = Object.entries(items);
    if (entries.length && entries.every(([key, value]) => Object.hasOwn(labels, key) && Number.isInteger(value) && value >= 0 && value <= 20)) {
      const summary = entries.filter(([, value]) => value > 0).map(([key, value]) => `${value} ${labels[key]}`).join(", ");
      if (summary) return `Extra cutlery: ${summary}`;
    }
    return "Assistance requested";
  }
  return typeof data?.message === "string" && data.message.trim() ? data.message.slice(0, 240) : "Assistance requested";
}
