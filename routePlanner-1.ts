// Sample routing core for Smart Flow Commute: graph model G=(V,E), cost w(e), Dijkstra + A*.
export type Mode = "walk" | "bus" | "metro";
export interface Edge { to: string; minutes: number; km: number; mode: Mode; label: string; }
export type Graph = Record<string, Edge[]>;
export interface Coord { x: number; y: number }

export interface RouteResult {
  status: "ok" | "invalid_input" | "no_route";
  path: string[]; steps: Edge[]; totalMinutes: number; totalKm: number; message?: string;
}

// Demo network (static/demo data: label it as such in the UI)
export const graph: Graph = {
  Home:           [{ to: "Central Stop", minutes: 4, km: 0.32, mode: "walk", label: "Walk to Central Stop" }],
  "Central Stop": [
    { to: "Junction Sq", minutes: 14, km: 4.1, mode: "bus", label: "Bus 12 to Junction Square" },
    { to: "Ring Rd", minutes: 20, km: 4.9, mode: "bus", label: "Bus 04 via Ring Road" },
  ],
  "Junction Sq":  [{ to: "Tech Park", minutes: 8, km: 4.6, mode: "metro", label: "Metro Blue to Tech Park" }],
  "Ring Rd":      [{ to: "Tech Park", minutes: 15, km: 5.1, mode: "bus", label: "Bus 04 to Tech Park" }],
  "Tech Park":    [{ to: "Office", minutes: 2, km: 0.18, mode: "walk", label: "Walk to destination" }],
  Office: [],
};
export const coords: Record<string, Coord> = {
  Home: { x: 0, y: 0 }, "Central Stop": { x: 0.3, y: 0 }, "Junction Sq": { x: 4, y: 1 },
  "Ring Rd": { x: 3, y: 4 }, "Tech Park": { x: 8, y: 2 }, Office: { x: 8.2, y: 2 },
};

// Edge cost function: swap in distance, tolls or a weighted mix (alpha*T + beta*D)
export type Cost = (e: Edge) => number;
export const byTime: Cost = (e) => e.minutes;
export const byDistance: Cost = (e) => e.km;

class MinHeap<T> {
  private a: { k: number; v: T }[] = [];
  get size() { return this.a.length; }
  push(k: number, v: T) { const a = this.a; a.push({ k, v }); let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (a[p].k <= a[i].k) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a; const top = a[0]; const last = a.pop()!;
    if (a.length) { a[0] = last; let i = 0;
      for (;;) { let l = 2 * i + 1, r = l + 1, m = i;
        if (l < a.length && a[l].k < a[m].k) m = l;
        if (r < a.length && a[r].k < a[m].k) m = r;
        if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } }
    return top; }
}

// Dijkstra when heuristic is omitted; A* when one is supplied.
export function findRoute(g: Graph, origin: string, dest: string, cost: Cost = byTime,
                          h: (n: string) => number = () => 0): RouteResult {
  const empty = { path: [], steps: [], totalMinutes: 0, totalKm: 0 };
  if (!origin || !dest || !(origin in g) || !(dest in g))
    return { ...empty, status: "invalid_input", message: "Origin or destination not found in the network." };

  const dist: Record<string, number> = { [origin]: 0 };
  const prev: Record<string, { from: string; edge: Edge }> = {};
  const done = new Set<string>();
  const pq = new MinHeap<string>(); pq.push(h(origin), origin);

  while (pq.size) {
    const { v: u } = pq.pop();
    if (done.has(u)) continue;
    done.add(u);
    if (u === dest) break;
    for (const e of g[u] ?? []) {
      const nd = dist[u] + cost(e);
      if (nd < (dist[e.to] ?? Infinity)) { dist[e.to] = nd; prev[e.to] = { from: u, edge: e }; pq.push(nd + h(e.to), e.to); }
    }
  }
  if (!(dest in dist)) return { ...empty, status: "no_route", message: "No connected route found." };

  const path = [dest], steps: Edge[] = [];
  for (let n = dest; n !== origin; n = prev[n].from) { steps.unshift(prev[n].edge); path.unshift(prev[n].from); }
  return { status: "ok", path, steps,
    totalMinutes: steps.reduce((s, e) => s + e.minutes, 0),
    totalKm: +steps.reduce((s, e) => s + e.km, 0).toFixed(2) };
}

// Straight-line heuristic, scaled to be admissible for time-based cost (assumes max speed 1 unit per 0.3 min)
export const makeHeuristic = (dest: string, minPerUnit = 0.3) => (n: string) =>
  Math.hypot(coords[n].x - coords[dest].x, coords[n].y - coords[dest].y) * minPerUnit;

// Independent validator (report: "Result validator"): every consecutive pair must be a real edge.
export function validatePath(g: Graph, r: RouteResult): boolean {
  if (r.status !== "ok") return true;
  return r.path.slice(1).every((n, i) => (g[r.path[i]] ?? []).some((e) => e.to === n));
}

// Alternatives: re-run with different cost functions and drop duplicates.
export function alternatives(g: Graph, o: string, d: string): RouteResult[] {
  const out: RouteResult[] = [];
  for (const c of [byTime, byDistance]) {
    const r = findRoute(g, o, d, c);
    if (r.status === "ok" && !out.some((x) => x.path.join() === r.path.join())) out.push(r);
  }
  return out;
}

// Known-answer tests (TC-05, TC-06, TC-11)
export function selfTest() {
  const r = findRoute(graph, "Home", "Office");
  console.assert(r.status === "ok" && r.totalMinutes === 28, "TC-06 expected 28 min");
  console.assert(validatePath(graph, r), "TC-11 path continuity");
  console.assert(findRoute(graph, "Office", "Home").status === "no_route", "TC-05 disconnected");
  console.assert(findRoute(graph, "", "Home").status === "invalid_input", "TC-02 missing origin");
  const a = findRoute(graph, "Home", "Office", byTime, makeHeuristic("Office"));
  console.assert(a.totalMinutes === r.totalMinutes, "A* matches Dijkstra");
  return r;
}
