export const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const walletStatusColor = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "approved" || normalized === "active" || normalized === "success") return "#16A34A";
  if (normalized === "rejected" || normalized === "failed") return "#DC2626";
  return "#D97706";
};
