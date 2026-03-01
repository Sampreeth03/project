import React from 'react';

/* ── SVG layout constants ────────────────────────────────────── */
const W = 440, H = 200;
const PAD = { l: 38, r: 14, t: 18, b: 30 };
const CW = W - PAD.l - PAD.r;
const CH = H - PAD.t - PAD.b;

const mkGrid = (max) =>
    [0, 0.25, 0.5, 0.75, 1].map(p => ({
        y: PAD.t + CH * (1 - p),
        label: Math.round(max * p),
    }));

const xP = (i, len) => PAD.l + (i / Math.max(len - 1, 1)) * CW;
const yP = (v, max) => PAD.t + CH - (v / max) * CH;

/* ── Single-series Line Chart ────────────────────────────────── */
export const LineChart = ({ data, valueKey, color, id }) => {
    if (!data?.length) return <div className="no-chart-data">No data yet</div>;

    const vals = data.map(d => d[valueKey]);
    const max = Math.max(...vals, 1);
    const pts = data.map((_, i) => ({
        x: xP(i, data.length),
        y: yP(vals[i], max),
    }));

    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
    const area = `${line} L${pts[pts.length - 1].x},${PAD.t + CH} L${pts[0].x},${PAD.t + CH} Z`;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="trend-svg">
            <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                </linearGradient>
            </defs>
            {mkGrid(max).map((g, i) => (
                <g key={i}>
                    <line x1={PAD.l} y1={g.y} x2={W - PAD.r} y2={g.y}
                        stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
                    <text x={PAD.l - 6} y={g.y + 3} textAnchor="end"
                        fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="Inter">
                        {g.label}
                    </text>
                </g>
            ))}
            <path d={area} fill={`url(#${id})`} />
            <path d={line} fill="none" stroke={color} strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3.5"
                    fill="#141416" stroke={color} strokeWidth="2">
                    <title>{`${data[i].label}: ${vals[i]}`}</title>
                </circle>
            ))}
            {data.map((d, i) =>
                (i % 2 === 0 || i === data.length - 1) ? (
                    <text key={i} x={xP(i, data.length)} y={H - 6}
                        textAnchor="middle" fill="rgba(255,255,255,0.35)"
                        fontSize="8" fontFamily="Inter">{d.label}</text>
                ) : null
            )}
        </svg>
    );
};

/* ── Dual-series Line Chart ──────────────────────────────────── */
export const DualLineChart = ({ data, k1, k2, c1, c2, l1, l2, id }) => {
    if (!data?.length) return <div className="no-chart-data">No data yet</div>;

    const v1 = data.map(d => d[k1]);
    const v2 = data.map(d => d[k2]);
    const max = Math.max(...v1, ...v2, 1);

    const mk = (vs) => data.map((_, i) => ({ x: xP(i, data.length), y: yP(vs[i], max) }));
    const p1 = mk(v1), p2 = mk(v2);

    const pathStr = (ps) => ps.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
    const areaStr = (ps, ln) =>
        `${ln} L${ps[ps.length - 1].x},${PAD.t + CH} L${ps[0].x},${PAD.t + CH} Z`;

    const ln1 = pathStr(p1), ln2 = pathStr(p2);

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="trend-svg">
            <defs>
                <linearGradient id={`${id}a`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c1} stopOpacity="0.18" />
                    <stop offset="100%" stopColor={c1} stopOpacity="0.01" />
                </linearGradient>
                <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c2} stopOpacity="0.18" />
                    <stop offset="100%" stopColor={c2} stopOpacity="0.01" />
                </linearGradient>
            </defs>
            {mkGrid(max).map((g, i) => (
                <g key={i}>
                    <line x1={PAD.l} y1={g.y} x2={W - PAD.r} y2={g.y}
                        stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
                    <text x={PAD.l - 6} y={g.y + 3} textAnchor="end"
                        fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="Inter">
                        {g.label}
                    </text>
                </g>
            ))}
            <path d={areaStr(p1, ln1)} fill={`url(#${id}a)`} />
            <path d={areaStr(p2, ln2)} fill={`url(#${id}b)`} />
            <path d={ln1} fill="none" stroke={c1} strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" />
            <path d={ln2} fill="none" stroke={c2} strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6,3" />
            {p1.map((p, i) => (
                <circle key={`a${i}`} cx={p.x} cy={p.y} r="3"
                    fill="#141416" stroke={c1} strokeWidth="2">
                    <title>{`${data[i].label} – ${l1}: ${v1[i]}`}</title>
                </circle>
            ))}
            {p2.map((p, i) => (
                <circle key={`b${i}`} cx={p.x} cy={p.y} r="3"
                    fill="#141416" stroke={c2} strokeWidth="2">
                    <title>{`${data[i].label} – ${l2}: ${v2[i]}`}</title>
                </circle>
            ))}
            {data.map((d, i) =>
                (i % 2 === 0 || i === data.length - 1) ? (
                    <text key={i} x={xP(i, data.length)} y={H - 6}
                        textAnchor="middle" fill="rgba(255,255,255,0.35)"
                        fontSize="8" fontFamily="Inter">{d.label}</text>
                ) : null
            )}
        </svg>
    );
};

/* ── Stacked Bar Chart ───────────────────────────────────────── */
export const StackedBarChart = ({ data, keys, colors, labels }) => {
    if (!data?.length) return <div className="no-chart-data">No data yet</div>;

    const maxTot = Math.max(...data.map(d => keys.reduce((s, k) => s + (d[k] || 0), 0)), 1);
    const barGap = CW / data.length;
    const barW = barGap * 0.55;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="trend-svg">
            {mkGrid(maxTot).map((g, i) => (
                <g key={i}>
                    <line x1={PAD.l} y1={g.y} x2={W - PAD.r} y2={g.y}
                        stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
                    <text x={PAD.l - 6} y={g.y + 3} textAnchor="end"
                        fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="Inter">
                        {g.label}
                    </text>
                </g>
            ))}
            {data.map((d, i) => {
                const cx = PAD.l + barGap * i + barGap / 2;
                let yOff = 0;
                return (
                    <g key={i}>
                        {keys.map((key, ki) => {
                            const val = d[key] || 0;
                            const h = (val / maxTot) * CH;
                            const y = PAD.t + CH - yOff - h;
                            yOff += h;
                            return h > 0 ? (
                                <rect key={ki} x={cx - barW / 2} y={y} width={barW}
                                    height={h} fill={colors[ki]} rx="3" opacity="0.85">
                                    <title>{`${labels[ki]}: ${val}`}</title>
                                </rect>
                            ) : null;
                        })}
                        {(i % 2 === 0 || i === data.length - 1) && (
                            <text x={cx} y={H - 6} textAnchor="middle"
                                fill="rgba(255,255,255,0.35)" fontSize="8"
                                fontFamily="Inter">{d.label}</text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
};

/* ── Activity Heatmap (GitHub-style) ─────────────────────────── */
const HEAT_COLORS = [
    'rgba(255,255,255,0.04)',
    'rgba(0,102,238,0.2)',
    'rgba(0,102,238,0.4)',
    'rgba(0,102,238,0.65)',
    '#0066ee',
];

export const Heatmap = ({ data }) => {
    if (!data?.length) return <div className="no-chart-data">No data yet</div>;

    const firstDate = new Date(data[0].date + 'T00:00:00');
    const startDow = firstDate.getDay();

    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push({ empty: true });
    data.forEach(d => cells.push(d));

    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    const last = weeks[weeks.length - 1];
    while (last.length < 7) last.push({ empty: true });

    const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

    return (
        <div className="heatmap-container">
            <div className="hm-day-labels">
                {dayLabels.map((d, i) => (
                    <span key={i} className="hm-day">{d}</span>
                ))}
            </div>
            <div className="hm-weeks">
                {weeks.map((week, wi) => (
                    <div className="hm-week" key={wi}>
                        {week.map((day, di) => (
                            <div
                                key={di}
                                className={`hm-cell${day.empty ? ' hm-empty' : ''}`}
                                style={{
                                    background: day.empty
                                        ? 'transparent'
                                        : (HEAT_COLORS[day.level] || HEAT_COLORS[0]),
                                }}
                                title={day.empty ? '' : `${day.date}: ${day.count} activities`}
                            />
                        ))}
                    </div>
                ))}
            </div>
            <div className="hm-scale">
                <span className="hm-scale-label">Less</span>
                {HEAT_COLORS.map((c, i) => (
                    <div key={i} className="hm-scale-cell" style={{ background: c }} />
                ))}
                <span className="hm-scale-label">More</span>
            </div>
        </div>
    );
};
