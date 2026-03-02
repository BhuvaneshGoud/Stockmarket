const WATCHLIST_KEY = "stock_watchlist_symbols";

export const getWatchlistSymbols = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map((s) => String(s || "").toUpperCase()).filter(Boolean);
  } catch {
    return [];
  }
};

export const setWatchlistSymbols = (symbols) => {
  const clean = Array.from(
    new Set((symbols || []).map((s) => String(s || "").toUpperCase()).filter(Boolean))
  );
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(clean));
  return clean;
};

export const isInWatchlist = (symbol) => {
  const upper = String(symbol || "").toUpperCase();
  return getWatchlistSymbols().includes(upper);
};

export const toggleWatchlistSymbol = (symbol) => {
  const upper = String(symbol || "").toUpperCase();
  if (!upper) return getWatchlistSymbols();
  const current = getWatchlistSymbols();
  const next = current.includes(upper)
    ? current.filter((s) => s !== upper)
    : [...current, upper];
  return setWatchlistSymbols(next);
};
