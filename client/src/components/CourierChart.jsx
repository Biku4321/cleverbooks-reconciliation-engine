import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LabelList,
} from "recharts";
import { getSettlements } from "../api";

const COURIER_COLORS = {
  shiprocket: "#7F77DD",
  delhivery:  "#1D9E75",
  bluedart:   "#378ADD",
  dtdc:       "#EF9F27",
  kwikship:   "#D85A30",
};
const DEFAULT_COLOR = "#888780";

// Custom tooltip
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: "var(--color-background-secondary)",
      border: "1px solid var(--color-border-secondary)",
      borderRadius: 8, padding: "10px 14px", fontSize: 13,
    }}>
      <p style={{ margin: 0, fontWeight: 500, textTransform: "capitalize" }}>{d.courier}</p>
      <p style={{ margin: "4px 0 0", color: "var(--color-text-danger)" }}>
        {d.disputes} dispute{d.disputes !== 1 ? "s" : ""}
      </p>
      <p style={{ margin: "2px 0 0", color: "var(--color-text-secondary)", fontSize: 12 }}>
        {d.pct}% of their settlements
      </p>
    </div>
  );
}

export default function CourierChart() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getSettlements(),                  // all
      getSettlements("DISCREPANCY"),     // bad ones
    ]).then(([allRes, badRes]) => {
      const all = allRes.data;
      const bad = badRes.data;

      const COURIERS = ["shiprocket","delhivery","bluedart","dtdc","kwikship"];
      const totalMap = {};
      const badMap   = {};
      COURIERS.forEach(c => { totalMap[c] = 0; badMap[c] = 0; });

      all.forEach(s => {
        const idx     = parseInt(s.awbNumber.replace(/\D/g,"")) % 5;
        const courier = COURIERS[idx] ?? COURIERS[0];
        totalMap[courier] = (totalMap[courier] || 0) + 1;
      });
      bad.forEach(s => {
        const idx     = parseInt(s.awbNumber.replace(/\D/g,"")) % 5;
        const courier = COURIERS[idx] ?? COURIERS[0];
        badMap[courier] = (badMap[courier] || 0) + 1;
      });

      const chart = COURIERS.map(c => ({
        courier:  c,
        disputes: badMap[c]   || 0,
        total:    totalMap[c] || 0,
        pct:      totalMap[c]
          ? Math.round(((badMap[c] || 0) / totalMap[c]) * 100)
          : 0,
      })).sort((a, b) => b.disputes - a.disputes);

      setData(chart);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
        height: 220, color: "var(--color-text-secondary)", fontSize: 14 }}>
        Loading chart…
      </div>
    );
  }

  if (data.every(d => d.disputes === 0)) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
        height: 220, color: "var(--color-text-secondary)", fontSize: 14 }}>
        No discrepancies yet. Run reconciliation to see courier breakdown.
      </div>
    );
  }

  return (
    <div>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--color-text-secondary)" }}>
        Discrepancy count by courier partner
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barSize={36} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border-tertiary)" strokeDasharray="3 3"/>
          <XAxis
            dataKey="courier"
            tick={{ fontSize: 12, fill: "var(--color-text-secondary)", textTransform: "capitalize" }}
            tickLine={false} axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
            tickLine={false} axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-border-tertiary)", radius: 4 }}/>
          <Bar dataKey="disputes" radius={[6,6,0,0]}>
            {data.map((entry) => (
              <Cell
                key={entry.courier}
                fill={COURIER_COLORS[entry.courier] || DEFAULT_COLOR}
                fillOpacity={0.85}
              />
            ))}
            <LabelList
              dataKey="disputes"
              position="top"
              style={{ fontSize: 11, fill: "var(--color-text-secondary)", fontWeight: 500 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:"10px 20px", marginTop: 12 }}>
        {data.map(d => (
          <span key={d.courier} style={{ fontSize: 11, color: "var(--color-text-secondary)",
            display:"flex", alignItems:"center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0,
              background: COURIER_COLORS[d.courier] || DEFAULT_COLOR }}/>
            <span style={{ textTransform:"capitalize" }}>{d.courier}</span>
            <span style={{ color: "var(--color-text-tertiary)" }}>({d.pct}%)</span>
          </span>
        ))}
      </div>
    </div>
  );
}