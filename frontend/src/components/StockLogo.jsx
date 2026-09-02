import { useMemo, useState } from "react";
import stockPlaceholder from "../assets/stock-placeholder.svg";

function uniqueNonEmpty(values) {
  const seen = new Set();
  const out = [];
  values.forEach((v) => {
    if (!v) return;
    const key = String(v).trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(key);
  });
  return out;
}

function StockLogo({ symbol, name, logoUrl, size = 28 }) {
  const normalized = String(symbol || "").toUpperCase();
  const sources = useMemo(
    () =>
      uniqueNonEmpty([
        logoUrl,
      ]),
    [logoUrl, normalized]
  );

  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  const currentSrc = !failed && sources[index] ? sources[index] : stockPlaceholder;

  return (
    <img
      src={currentSrc}
      alt={`${symbol} logo`}
      title={name || symbol}
      onError={() => {
        if (!failed && index < sources.length - 1) {
          setIndex((prev) => prev + 1);
          return;
        }
        setFailed(true);
      }}
      style={{
        width: size,
        height: size,
        borderRadius: "8px",
        objectFit: "cover",
        background: "#0b1628",
        border: "1px solid var(--border-color)",
        flexShrink: 0,
      }}
    />
  );
}

export default StockLogo;
