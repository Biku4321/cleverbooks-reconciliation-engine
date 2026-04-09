import { useEffect, useState } from "react";
import { getSettlements } from "../api";
import { useNavigate } from "react-router-dom";

const STATUS_COLORS = {
  MATCHED:        { bg: "var(--color-background-success)", fg: "var(--color-text-success)" },
  DISCREPANCY:    { bg: "var(--color-background-danger)",  fg: "var(--color-text-danger)"  },
  PENDING:        { bg: "var(--color-background-warning)", fg: "var(--color-text-warning)" },
  PENDING_REVIEW: { bg: "var(--color-background-warning)", fg: "var(--color-text-warning)" },
};

export default function SettlementsTable() {
  const [filter, setFilter] = useState("ALL");
  const [rows, setRows]     = useState([]);

  useEffect(() => {
    getSettlements(filter === "ALL" ? undefined : filter)
      .then(r => setRows(r.data));
  }, [filter]);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {["ALL","MATCHED","DISCREPANCY","PENDING","PENDING_REVIEW"].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: "4px 12px", borderRadius: 6, fontSize: 12,
              border: "1px solid var(--color-border-secondary)",
              background: filter === s ? "var(--color-background-secondary)" : "transparent", cursor: "pointer" }}>
            {s}
          </button>
        ))}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border-secondary)" }}>
              {["AWB","Batch","Status","Settled COD","Charged Wt","Discrepancies"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontWeight: 500, fontSize: 12,
                  color: "var(--color-text-secondary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(s => {
              const c = STATUS_COLORS[s.status] || {};
              return (
                <tr key={s._id} style={{ borderBottom: "1px solid var(--color-border-tertiary)", cursor: "pointer" }}
                  onClick={() => window.open(`/settlement/${s._id}`, "_blank")}>
                  <td style={{ padding: "8px 10px", fontFamily: "monospace" }}>{s.awbNumber}</td>
                  <td style={{ padding: "8px 10px", color: "var(--color-text-secondary)" }}>{s.batchId}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11,
                      background: c.bg, color: c.fg }}>{s.status}</span>
                  </td>
                  <td style={{ padding: "8px 10px" }}>₹{s.settledCodAmount}</td>
                  <td style={{ padding: "8px 10px" }}>{s.chargedWeight} kg</td>
                  <td style={{ padding: "8px 10px", color: "var(--color-text-danger)", fontSize: 11 }}>
                    {(s.discrepancies || []).join(", ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p style={{ textAlign: "center", color: "var(--color-text-secondary)", padding: 32 }}>
            No records found
          </p>
        )}
      </div>
    </div>
  );
}