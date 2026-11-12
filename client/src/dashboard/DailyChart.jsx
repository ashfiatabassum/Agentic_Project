// Daily testimonials bar chart (M6, E86). Hand-made SVG, single series, no chart library.
// dataviz skill rules: bars ≤ 24 px with a 4 px rounded top and a square baseline, 1 px solid
// recessive gridlines, clean integer ticks, one direct label (the busiest day), text in text
// colours (never the bar colour), hover/focus tooltip whose hit target is the whole day column,
// a text summary, and a table view. Keyboard: one tab stop; ← → Home End move between days.
import { useEffect, useId, useRef, useState } from 'react';
import { dayLabel, fmtDay, labelStep, niceMax, plural, summarise, ticksFor } from './chartMath.js';

const HEIGHT = 200;
const M = { top: 20, right: 8, bottom: 26, left: 32 };
const BAR = '#4F46E5'; // indigo-600, the app accent (validated: lightness, chroma, contrast vs surface)

const round = (v) => Math.round(v * 10) / 10;
const fmt = fmtDay;

function useWidth(ref) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}


export default function DailyChart({ daily, days }) {
  const boxRef = useRef(null);
  const width = useWidth(boxRef);
  const [active, setActive] = useState(null); // index shown in the tooltip
  const [focusIndex, setFocusIndex] = useState(daily.length - 1); // roving tab stop (today)
  const [showTable, setShowTable] = useState(false);
  const barRefs = useRef([]);
  const tableId = useId();

  const n = daily.length;
  const max = Math.max(0, ...daily.map((d) => d.count));
  const top = niceMax(max);
  const ticks = ticksFor(top);
  const innerW = Math.max(0, width - M.left - M.right);
  const innerH = HEIGHT - M.top - M.bottom;
  const band = n ? innerW / n : 0;
  const barW = Math.max(2, Math.min(24, band - 2)); // ≥ 2 px surface gap between bars
  const y = (v) => M.top + innerH - (v / top) * innerH;
  const labelEvery = labelStep(n, innerW); // ~52 px per label
  const busiest = max > 0 ? daily.findIndex((d) => d.count === max) : -1;
  const safeFocus = Math.min(focusIndex, n - 1);

  function move(index) {
    const next = Math.max(0, Math.min(n - 1, index));
    setFocusIndex(next);
    setActive(next);
    barRefs.current[next]?.focus();
  }

  function onKeyDown(event, i) {
    const keys = { ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: n - 1 };
    if (event.key in keys) {
      event.preventDefault();
      move(keys[event.key]);
    }
  }

  const tip = active !== null && daily[active] ? daily[active] : null;
  const tipX = active !== null ? M.left + band * active + band / 2 : 0;

  return (
    <figure className="m-0">
      <figcaption className="sr-only">{summarise(daily, days)}</figcaption>
      <div ref={boxRef} className="relative w-full" onMouseLeave={() => setActive(null)}>
        {width > 0 && (
          <svg width={width} height={HEIGHT} role="group" aria-label={`Testimonials per day, last ${days} days`} className="block overflow-visible">
            {ticks.map((t) => (
              <g key={t} aria-hidden="true">
                <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="#E2E8F0" strokeWidth="1" shapeRendering="crispEdges" />
                <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-slate-500 text-[11px] tabular-nums">{t}</text>
              </g>
            ))}
            {daily.map((d, i) => {
              // Coordinates rounded to 0.1 px (vercel-react-best-practices: rendering-svg-precision).
              const h = round((d.count / top) * innerH);
              const x = round(M.left + band * i + (band - barW) / 2);
              const r = Math.min(4, h, barW / 2);
              const base = M.top + innerH;
              // Rounded data end (top), square at the baseline.
              const path = h > 0
                ? `M${x},${base} V${base - h + r} Q${x},${base - h} ${x + r},${base - h} H${x + barW - r} Q${x + barW},${base - h} ${x + barW},${base - h + r} V${base} Z`
                : '';
              const label = `${fmt(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}: ${plural(d.count)}`;
              return (
                <g key={d.date}
                  ref={(el) => { barRefs.current[i] = el; }}
                  role="img" aria-label={label}
                  tabIndex={i === safeFocus ? 0 : -1}
                  onFocus={() => { setFocusIndex(i); setActive(i); }}
                  onBlur={() => setActive(null)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  onMouseEnter={() => setActive(i)}
                  className="cursor-default outline-none [&:focus-visible>rect]:stroke-indigo-500"
                >
                  {/* Hit target: the whole day column, larger than the bar. */}
                  <rect x={M.left + band * i} y={M.top} width={band} height={innerH} fill={active === i ? '#EEF2FF' : 'transparent'} strokeWidth="2" />
                  {path && <path d={path} fill={BAR} />}
                  {i === busiest && (
                    <text x={x + barW / 2} y={base - h - 6} textAnchor="middle" aria-hidden="true" className="fill-slate-700 text-[11px] font-semibold tabular-nums">{d.count}</text>
                  )}
                  {(i % labelEvery === (n - 1) % labelEvery) && (
                    <text x={M.left + band * i + band / 2} y={HEIGHT - 8} textAnchor="middle" aria-hidden="true" className="fill-slate-500 text-[11px]">
                      {n <= 7 ? fmt(d.date, { weekday: 'short' }) : dayLabel(d.date)}
                    </text>
                  )}
                </g>
              );
            })}
            <line x1={M.left} x2={width - M.right} y1={M.top + innerH} y2={M.top + innerH} stroke="#CBD5E1" strokeWidth="1" shapeRendering="crispEdges" aria-hidden="true" />
          </svg>
        )}
        {tip && (
          <div role="presentation" aria-hidden="true"
            className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"
            style={{ left: Math.min(Math.max(tipX, 60), width - 60), top: 0 }}>
            <strong className="text-sm tabular-nums">{tip.count}</strong> {tip.count === 1 ? 'testimonial' : 'testimonials'}
            <span className="block text-slate-300">{fmt(tip.date, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
        )}
      </div>
      <p className="mt-2 text-sm text-slate-600" aria-hidden="true">{summarise(daily, days)}</p>
      <button type="button" aria-expanded={showTable} aria-controls={tableId} onClick={() => setShowTable((v) => !v)}
        className="mt-1 text-sm font-medium text-indigo-700 underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
        {showTable ? 'Hide table' : 'Show as table'}
      </button>
      {showTable && (
        <div id={tableId} className="mt-2 max-h-64 overflow-y-auto rounded-lg ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <caption className="sr-only">Testimonials per day, last {days} days</caption>
            <thead className="sticky top-0 bg-slate-50 text-left text-slate-600">
              <tr><th scope="col" className="px-3 py-2 font-medium">Day</th><th scope="col" className="px-3 py-2 text-right font-medium">Testimonials</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {daily.toReversed().map((d) => (
                <tr key={d.date}><td className="px-3 py-1.5 text-slate-800">{fmt(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}</td><td className="px-3 py-1.5 text-right tabular-nums text-slate-900">{d.count}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}
