import { useEffect, useState } from "react";
import { getNotifications } from "../api";

export default function NotificationLog() {
  const [notifs, setNotifs] = useState([]);
  useEffect(() => { getNotifications().then(r => setNotifs(r.data)); }, []);

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: "1px solid var(--color-border-secondary)" }}>
          {["AWB","Merchant","Type","Status","Attempts","Last Attempt"].map(h => (
            <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontWeight: 500,
              fontSize: 12, color: "var(--color-text-secondary)" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {notifs.map(n => (
          <tr key={n._id} style={{ borderBottom: "1px solid var(--color-border-tertiary)" }}>
            <td style={{ padding: "8px 10px", fontFamily: "monospace" }}>{n.awbNumber}</td>
            <td style={{ padding: "8px 10px" }}>{n.merchantId}</td>
            <td style={{ padding: "8px 10px", fontSize: 11, color: "var(--color-text-warning)" }}>{n.discrepancyType}</td>
            <td style={{ padding: "8px 10px", color: n.status === "SENT" ? "var(--color-text-success)" : "var(--color-text-danger)" }}>
              {n.status}
            </td>
            <td style={{ padding: "8px 10px" }}>{n.attempts}</td>
            <td style={{ padding: "8px 10px" }}>{n.lastAttemptAt ? new Date(n.lastAttemptAt).toLocaleString("en-IN") : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}