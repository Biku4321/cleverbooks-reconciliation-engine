import { useState } from "react";
import UploadForm       from "../components/UploadForm";
import SettlementsTable from "../components/SettlementsTable";
import JobLog           from "../components/JobLog";
import NotificationLog  from "../components/NotificationLog";
import SummaryCards     from "../components/SummaryCards";
import { triggerReconcile } from "../api";

export default function Dashboard() {
  const [tab, setTab] = useState("settlements");
  const [reconciling, setReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState(null);

  async function handleReconcile() {
    setReconciling(true);
    try {
      const { data } = await triggerReconcile();
      setReconcileResult(data.stats);
    } finally {
      setReconciling(false);
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Settlement Reconciliation</h1>
        <button onClick={handleReconcile} disabled={reconciling}
          style={{ padding: "8px 18px", borderRadius: 8, border: "none",
            background: "var(--color-background-info)", color: "var(--color-text-info)", cursor: "pointer" }}>
          {reconciling ? "Running…" : "Run Reconciliation"}
        </button>
      </div>

      {reconcileResult && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 8,
          background: "var(--color-background-success)", color: "var(--color-text-success)" }}>
          Done — {reconcileResult.total} records | {reconcileResult.matched} matched | {reconcileResult.discrepancies} discrepancies
        </div>
      )}

      <SummaryCards />
      <UploadForm />

      <div style={{ display: "flex", gap: 8, margin: "24px 0 12px" }}>
        {["settlements","jobs","notifications"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "6px 16px", borderRadius: 6, border: "1px solid var(--color-border-primary)",
              background: tab === t ? "var(--color-background-secondary)" : "transparent",
              cursor: "pointer", fontSize: 14 }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "settlements"  && <SettlementsTable />}
      {tab === "jobs"         && <JobLog />}
      {tab === "notifications"&& <NotificationLog />}
    </div>
  );
}