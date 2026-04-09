import { useState } from "react";
import { uploadSettlements } from "../api";

export default function UploadForm() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setLoading(true);
    try {
      const { data } = await uploadSettlements(fd);
      setStatus({ ok: true, msg: `Uploaded batch ${data.batchId}: ${data.inserted} inserted, ${data.skipped} skipped` });
    } catch (err) {
      setStatus({ ok: false, msg: err.response?.data?.error || "Upload failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16, borderRadius: 12, border: "1px dashed var(--color-border-primary)", marginBottom: 16 }}>
      <p style={{ margin: "0 0 10px", fontSize: 14, color: "var(--color-text-secondary)" }}>
        Upload CSV or JSON — max 1,000 rows
      </p>
      <input type="file" accept=".csv,.json" onChange={handleFile} disabled={loading} />
      {loading && <span style={{ marginLeft: 12, fontSize: 13 }}>Uploading…</span>}
      {status && (
        <div style={{ marginTop: 10, fontSize: 13,
          color: status.ok ? "var(--color-text-success)" : "var(--color-text-danger)" }}>
          {status.msg}
        </div>
      )}
    </div>
  );
}