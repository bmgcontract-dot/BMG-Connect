// PERF (Phase 3): Isolate recharts (+ its d3/lodash deps, ~830KB) into a lazily
// loaded chunk. App.jsx imports these as React.lazy components so recharts is only
// fetched the first time a chart actually renders — it no longer sits in the
// initial bundle / main chunk.
//
// This module is the single dynamic-import target. Each recharts primitive is
// re-exported both as a real component (for props like <Pie dataKey=.../>) and,
// where used as a JSX element in App.jsx, wrapped so React.lazy can resolve it.
export {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
