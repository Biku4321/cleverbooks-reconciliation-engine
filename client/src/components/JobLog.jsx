import { useEffect, useState } from "react";
import { getJobs } from "../api";

export default function JobLog() {
  const [jobs, setJobs] = useState([]);
  useEffect(() => { getJobs().then(r => setJobs(r.data)); }, []);

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: "1px solid var(--color-border-secondary)" }}>
          {["Started","Status","Trigger","Total","Matched","Discrepancies"].map(h => (
            <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontWeight: 500,
              fontSize: 12, color: "var(--color-text-secondary)" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {jobs.map(j => (
          <tr key={j._id} style={{ borderBottom: "1px solid var(--color-border-tertiary)" }}>
            <td style={{ padding: "8px 10px" }}>{new Date(j.startedAt).toLocaleString("en-IN")}</td>
            <td style={{ padding: "8px 10px", color: j.status === "DONE" ? "var(--color-text-success)" : "var(--color-text-danger)" }}>
              {j.status}
            </td>
            <td style={{ padding: "8px 10px" }}>{j.triggeredBy}</td>
            <td style={{ padding: "8px 10px" }}>{j.recordsTotal}</td>
            <td style={{ padding: "8px 10px" }}>{j.recordsMatched}</td>
            <td style={{ padding: "8px 10px" }}>{j.discrepancies}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}