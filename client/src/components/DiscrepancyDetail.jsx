import { useEffect, useState } from "react";
import { getSettlement } from "../api";

const RULE_META = {
  COD_SHORT: {
    label:  "COD Short-remittance",
    color:  "var(--color-background-danger)",
    fg:     "var(--color-text-danger)",
    icon:   "₹",
    action: "Raise a formal dispute with the courier's merchant portal. Attach the COD invoice and delivery proof.",
  },
  WEIGHT_DISPUTE: {
    label:  "Weight Dispute",
    color:  "var(--color-background-warning)",
    fg:     "var(--color-text-warning)",
    icon:   "⚖",
    action: "Upload shipment photos and original weight slip to the courier dispute portal within 48 hours.",
  },
  PHANTOM_RTO: {
    label:  "Phantom RTO Charge",
    color:  "var(--color-background-danger)",
    fg:     "var(--color-text-danger)",
    icon:   "!",
    action: "Request full reversal of the RTO charge — order status is DELIVERED. Attach delivery confirmation.",
  },
  OVERDUE_REMITTANCE: {
    label:  "Overdue Remittance",
    color:  "var(--color-background-warning)",
    fg:     "var(--color-text-warning)",
    icon:   "⏱",
    action: "Escalate to the courier's finance team. Reference the SLA agreement and delivery date.",
  },
  DUPLICATE_SETTLEMENT: {
    label:  "Duplicate Settlement",
    color:  "var(--color-background-info)",
    fg:     "var(--color-text-info)",
    icon:   "⎘",
    action: "Request debit note for the duplicate remittance or apply as credit to next cycle.",
  },
  NO_ORDER_FOUND: {
    label:  "No Matching Order",
    color:  "var(--color-background-secondary)",
    fg:     "var(--color-text-secondary)",
    icon:   "?",
    action: "Manually locate the order in your OMS using the AWB number. Could be a data-sync issue.",
  },
};

function Field({ label, value, mono }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap: 2 }}>
      <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", textTransform:"uppercase",
        letterSpacing: "0.06em" }}>{label}</span>
      <span style={{ fontSize: 14, fontFamily: mono ? "monospace" : "inherit",
        color: "var(--color-text-primary)" }}>{value ?? "—"}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    MATCHED:        { bg:"var(--color-background-success)", fg:"var(--color-text-success)" },
    DISCREPANCY:    { bg:"var(--color-background-danger)",  fg:"var(--color-text-danger)"  },
    PENDING:        { bg:"var(--color-background-warning)", fg:"var(--color-text-warning)" },
    PENDING_REVIEW: { bg:"var(--color-background-warning)", fg:"var(--color-text-warning)" },
  };
  const c = map[status] || map.PENDING;
  return (
    <span style={{ padding:"3px 10px", borderRadius: 5, fontSize: 12,
      background: c.bg, color: c.fg, fontWeight: 500 }}>{status}</span>
  );
}

export default function DiscrepancyDetail({ settlementId, onClose }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!settlementId) return;
    setLoading(true);
    setError(null);
    getSettlement(settlementId)
      .then(r => { setData(r.data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [settlementId]);

  return (
    <div style={{
      position:"absolute", inset: 0, background:"rgba(0,0,0,0.35)",
      display:"flex", justifyContent:"flex-end", zIndex: 100,
      minHeight: 400,
    }} onClick={onClose}>
      <div style={{
        width: Math.min(520, window.innerWidth),
        background: "var(--color-background-primary)",
        borderLeft: "1px solid var(--color-border-secondary)",
        height: "100%", overflowY:"auto", padding: 28,
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 24 }}>
          <h2 style={{ margin:0, fontSize: 18, fontWeight: 500 }}>Settlement detail</h2>
          <button onClick={onClose} style={{
            background:"none", border:"none", fontSize: 18, cursor:"pointer",
            color:"var(--color-text-secondary)", lineHeight:1, padding:"4px 8px",
          }}>✕</button>
        </div>

        {loading && (
          <div style={{ color:"var(--color-text-secondary)", fontSize:14 }}>Loading…</div>
        )}
        {error && (
          <div style={{ color:"var(--color-text-danger)", fontSize:14 }}>{error}</div>
        )}

        {data && (() => {
          const { settlement: s, order: o } = data;

          return (
            <>
              {/* AWB + status row */}
              <div style={{ display:"flex", alignItems:"center", gap: 12, marginBottom: 24 }}>
                <span style={{ fontFamily:"monospace", fontSize: 16, fontWeight: 500 }}>{s.awbNumber}</span>
                <StatusBadge status={s.status} />
              </div>

              {/* Discrepancy flags */}
              {s.discrepancies?.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <p style={{ margin:"0 0 10px", fontSize:12, color:"var(--color-text-secondary)",
                    textTransform:"uppercase", letterSpacing:"0.06em" }}>Detected issues</p>
                  <div style={{ display:"flex", flexDirection:"column", gap: 10 }}>
                    {s.discrepancies.map(d => {
                      const meta = RULE_META[d] || { label: d, color:"var(--color-background-secondary)",
                        fg:"var(--color-text-secondary)", icon:"!", action:"Review manually." };
                      return (
                        <div key={d} style={{
                          borderRadius: 10, padding:"12px 14px",
                          background: meta.color, border:`1px solid ${meta.fg}22`,
                        }}>
                          <div style={{ display:"flex", alignItems:"center", gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize:13, fontWeight:500, color: meta.fg }}>{meta.icon} {meta.label}</span>
                          </div>
                          <p style={{ margin:0, fontSize:12, color: meta.fg, opacity:0.85 }}>{meta.action}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Settlement fields */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ margin:"0 0 12px", fontSize:12, color:"var(--color-text-secondary)",
                  textTransform:"uppercase", letterSpacing:"0.06em" }}>Settlement record</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px 24px",
                  background:"var(--color-background-secondary)", borderRadius:10, padding:16 }}>
                  <Field label="Batch ID"          value={s.batchId}            mono />
                  <Field label="Settlement date"   value={s.settlementDate
                    ? new Date(s.settlementDate).toLocaleDateString("en-IN") : "Not settled"} />
                  <Field label="Settled COD"       value={`₹${s.settledCodAmount}`} />
                  <Field label="Charged weight"    value={`${s.chargedWeight} kg`} />
                  <Field label="Forward charge"    value={`₹${s.forwardCharge}`} />
                  <Field label="RTO charge"        value={`₹${s.rtoCharge}`} />
                  <Field label="COD handling fee"  value={`₹${s.codHandlingFee}`} />
                  <Field label="Processed at"      value={s.processedAt
                    ? new Date(s.processedAt).toLocaleString("en-IN") : "Pending"} />
                </div>
              </div>

              {/* Order fields */}
              {o && (
                <div style={{ marginBottom: 24 }}>
                  <p style={{ margin:"0 0 12px", fontSize:12, color:"var(--color-text-secondary)",
                    textTransform:"uppercase", letterSpacing:"0.06em" }}>Order record</p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px 24px",
                    background:"var(--color-background-secondary)", borderRadius:10, padding:16 }}>
                    <Field label="Merchant ID"      value={o.merchantId}     mono />
                    <Field label="Courier"          value={o.courierPartner} />
                    <Field label="Order status"     value={o.orderStatus} />
                    <Field label="COD amount"       value={`₹${o.codAmount}`} />
                    <Field label="Declared weight"  value={`${o.declaredWeight} kg`} />
                    <Field label="Order date"       value={new Date(o.orderDate).toLocaleDateString("en-IN")} />
                    <Field label="Delivery date"    value={o.deliveryDate
                      ? new Date(o.deliveryDate).toLocaleDateString("en-IN") : "Not delivered"} />
                  </div>
                </div>
              )}

              {/* Variance summary */}
              {o && s.status === "DISCREPANCY" && (
                <div style={{ borderRadius:10, padding:16,
                  background:"var(--color-background-danger)", marginBottom: 8 }}>
                  <p style={{ margin:"0 0 10px", fontSize:12, color:"var(--color-text-danger)",
                    fontWeight:500 }}>Variance summary</p>
                  <div style={{ display:"flex", flexDirection:"column", gap: 6, fontSize:13,
                    color:"var(--color-text-danger)" }}>
                    {o.codAmount > 0 && (
                      <span>COD variance: ₹{(o.codAmount - s.settledCodAmount).toFixed(2)}</span>
                    )}
                    {s.chargedWeight > o.declaredWeight && (
                      <span>Weight overcharge: {(s.chargedWeight - o.declaredWeight).toFixed(2)} kg</span>
                    )}
                    {s.rtoCharge > 0 && o.orderStatus === "DELIVERED" && (
                      <span>Phantom RTO: ₹{s.rtoCharge} charged illegitimately</span>
                    )}
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}