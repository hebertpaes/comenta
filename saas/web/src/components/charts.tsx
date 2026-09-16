export interface BarDatum {
  day: string;
  count: number;
}

/** Mini gráfico de barras (SVG) para a série de 7 dias. */
export function BarChart({ data }: { data: BarDatum[] }) {
  if (data.length === 0) return <p className="muted">Sem dados no período.</p>;

  const max = Math.max(1, ...data.map((d) => d.count));
  const w = 100 / data.length;

  return (
    <svg viewBox="0 0 100 46" style={{ width: "100%", height: 150 }} preserveAspectRatio="none">
      {data.map((d, i) => {
        const h = (d.count / max) * 38;
        return (
          <g key={d.day}>
            <rect
              x={i * w + w * 0.18}
              y={40 - h}
              width={w * 0.64}
              height={h}
              rx="1"
              fill="#6d28d9"
            />
            <text x={i * w + w / 2} y={45} fontSize="3" textAnchor="middle" fill="#94a3b8">
              {d.day.slice(8, 10)}/{d.day.slice(5, 7)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

/** Donut de status (SVG). */
export function Donut({ segments }: { segments: DonutSegment[] }) {
  const total = Math.max(
    1,
    segments.reduce((sum, s) => sum + s.value, 0)
  );
  const radius = 16;
  const circumference = 2 * Math.PI * radius;

  // O offset de cada fatia é a soma das anteriores. A versão antiga mutava um
  // acumulador dentro do map — funcionava, mas torna o render impuro e o
  // eslint-plugin-react-hooks v7 reclama com razão. Aqui o valor é derivado.
  let running = 0;
  const arcs = segments.map((s) => {
    const offset = running;
    running += s.value / total;
    return { ...s, dash: (s.value / total) * circumference, offset };
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <svg viewBox="0 0 40 40" style={{ width: 120, height: 120 }}>
        <circle cx="20" cy="20" r={radius} fill="none" stroke="#eef0f4" strokeWidth="7" />
        {arcs.map((s) => (
          <circle
            key={s.label}
            cx="20"
            cy="20"
            r={radius}
            fill="none"
            stroke={s.color}
            strokeWidth="7"
            strokeDasharray={`${s.dash} ${circumference - s.dash}`}
            strokeDashoffset={-s.offset * circumference}
            transform="rotate(-90 20 20)"
          />
        ))}
        <text x="20" y="21" fontSize="7" textAnchor="middle" fontWeight="700" fill="currentColor">
          {total}
        </text>
      </svg>
      <div>
        {segments.map((s) => (
          <div
            key={s.label}
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 4 }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
            {s.label} <b style={{ marginLeft: 4 }}>{s.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
