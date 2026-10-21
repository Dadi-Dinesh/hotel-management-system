const labels = { plates: "plates", spoons: "spoons", forks: "forks", bowls: "small bowls" };
function supplyRequest(data) {
  if (data?.details != null) {
    if (data.details.type !== "cutlery" || !data.details.items || typeof data.details.items !== "object") throw new Error("Invalid supplies.");
    const items = {};
    for (const [key, value] of Object.entries(data.details.items)) {
      if (!Object.hasOwn(labels, key) || !Number.isInteger(value) || value < 0 || value > 20) throw new Error("Invalid supplies.");
      if (value) items[key] = value;
    }
    if (!Object.keys(items).length) throw new Error("Select supplies first.");
    const summary = Object.entries(items).map(([key, value]) => `${value} ${labels[key]}`).join(", ");
    return { message: `Extra cutlery: ${summary}`, details: { type: "cutlery", items, summary } };
  }
  return { message: typeof data?.message === "string" ? data.message.slice(0, 240) : "Assistance requested", details: null };
}
module.exports = { supplyRequest };
