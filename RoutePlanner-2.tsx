// Sample React component (Vite + React + Tailwind, as Lovable projects typically use).
import { useMemo, useState } from "react";
import { graph, alternatives, validatePath } from "./routePlanner";

export default function RoutePlanner() {
  const nodes = Object.keys(graph);
  const [origin, setOrigin] = useState("");
  const [dest, setDest] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const options = useMemo(() => (submitted ? alternatives(graph, origin, dest) : []), [submitted, origin, dest]);
  const error = submitted && (!origin || !dest) ? "Select both an origin and a destination."
    : submitted && options.length === 0 ? "No connected route found." : "";

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">Route Planner</h1>
      <p className="text-sm text-gray-500">Demo network data, not live traffic.</p>
      <div className="grid grid-cols-2 gap-3">
        {[["From", origin, setOrigin], ["To", dest, setDest]].map(([label, val, set]: any) => (
          <select key={label} aria-label={label} value={val} className="rounded border p-2"
                  onChange={(e) => { set(e.target.value); setSubmitted(false); }}>
            <option value="">{label}…</option>
            {nodes.map((n) => <option key={n}>{n}</option>)}
          </select>
        ))}
      </div>
      <button className="rounded bg-purple-700 px-4 py-2 text-white" onClick={() => setSubmitted(true)}>Find route</button>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      {options.map((r, i) => (
        <div key={i} className="rounded border p-4">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{r.totalMinutes} min</span>
            <span className="text-sm text-gray-500">{r.totalKm} km</span>
            {i === 0 && <span className="rounded bg-green-600 px-2 text-xs text-white">Best route</span>}
            {!validatePath(graph, r) && <span className="text-xs text-red-600">Invalid path</span>}
          </div>
          <ol className="mt-2 list-decimal pl-5 text-sm">
            {r.steps.map((s, j) => <li key={j}>{s.label} ({s.minutes} min, {s.km} km)</li>)}
          </ol>
        </div>
      ))}
    </div>
  );
}
