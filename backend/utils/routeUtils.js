const BIN_CAPACITY = 100; // Standard bin capacity in kg

// Convert bin fill level (%) into estimated waste (kg)
const getEstimatedLoad = (level) => {
  const safeLevel = Math.max(0, Math.min(100, Number(level) || 0));

  return (safeLevel / 100) * BIN_CAPACITY;
};

module.exports = {
  BIN_CAPACITY,
  getEstimatedLoad,
};