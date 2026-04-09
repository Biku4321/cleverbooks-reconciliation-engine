import { useEffect, useState } from "react";
import { getSettlements } from "../api";

export default function SummaryCards() {
  const [data, setData] = useState({ total: 0, discrepancies: 0, matched: 0, discrepancyValue: 0 });

  useEffect(() => {
    Promise.all([
      getSettlements("DISCREPANCY"),
      getSettlements("MATCHED"),
    ]).then(([d, m]) => {
      const discrepancyValue = d.data.reduce((sum, s) => sum + Math.abs(s.settledCodAmount - 0), 0);
      setData({ total: d.data.length + m.data.length, discrepancies: d.data.length,
        matched: m.data.length, discrepancyValue: d.data.length * 0 });
    });
  }, []);

  const cards = [
    { label: "Total Settlements", value: data.total, color: "var(--color-background-info)" },
    { label: "Discrepancies",     value: data.discrepancies, color: "var(--color-background-danger)" },
    { label: "Matched",           value: data.matched, color: "var(--color-background-success)" },
  ];

  return (
    <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
      {cards.map(c => (
        <div key={c.label} style={{ flex: "1 1 160px", padding: 16, borderRadius: 12,
          background: c.color, minWidth: 140 }}>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>{c.label}</div>
          <div style={{ fontSize: 28, fontWeight: 500 }}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}