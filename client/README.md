# CleverBooks — React Dashboard

Frontend for the Courier Settlement Reconciliation & Alert Engine.

Built with **React 18 + Vite**, styled with CSS custom properties (auto dark-mode), charted with **Recharts**.

---

## Development

```bash
npm install
npm run dev      # → http://localhost:3000
```

The Vite dev server proxies `/api/*` to `http://localhost:5000` automatically — no CORS setup needed.

## Build

```bash
npm run build    # Output in dist/
npm run preview  # Preview production build locally
```

## Folder structure

```
src/
├── api/
│   └── index.js          # Axios instance + all API call functions
├── components/
│   ├── CourierChart.jsx   # Recharts bar chart — discrepancies by courier
│   ├── DiscrepancyDetail.jsx  # Slide-over panel — settlement + order joined view
│   ├── JobLog.jsx         # Last 10 reconciliation run table
│   ├── NotificationLog.jsx    # Notification delivery status table
│   ├── SettlementsTable.jsx   # Filterable settlements list
│   ├── SummaryCards.jsx   # Top-level KPI cards
│   └── UploadForm.jsx     # File upload (CSV / JSON)
├── pages/
│   └── Dashboard.jsx      # Main page — assembles all components
├── App.jsx
├── App.css                # Component styles + layout tokens
├── index.css              # Global reset + CSS custom properties
└── main.jsx
```

## Environment

No `.env` needed for the client in development — all API calls go through the Vite proxy.

For production builds, set:

```env
VITE_API_BASE_URL=https://your-api-domain.com/api
```

Then update `src/api/index.js`:
```js
baseURL: import.meta.env.VITE_API_BASE_URL || "/api"
```