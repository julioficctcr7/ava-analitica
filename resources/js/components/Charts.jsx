import React, { useState } from 'react';

/**
 * Tooltip flotante interactivo ("ventanita" dinámica al pasar el mouse)
 */
function FloatingTooltip({ tip }) {
    if (!tip) return null;
    return (
        <div
            className="pointer-events-none fixed z-50 px-3.5 py-2.5 rounded-xl shadow-2xl text-xs text-white border border-white/15 backdrop-blur-md transition-opacity duration-100"
            style={{
                left: Math.min(tip.x + 14, window.innerWidth - 260),
                top: Math.max(tip.y - 12, 12),
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                maxWidth: 255,
            }}
        >
            <div className="font-extrabold text-[12px] text-white border-b border-white/15 pb-1 mb-1.5">
                {tip.titulo}
            </div>
            {tip.subtitulo && <div className="text-[10px] text-slate-300 mb-1.5">{tip.subtitulo}</div>}
            <div className="space-y-1">
                {tip.lineas.map((l, i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-slate-200">
                            {l.color && <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ backgroundColor: l.color }} />}
                            {l.label}
                        </span>
                        <span className="font-bold text-white whitespace-nowrap">{l.valor}</span>
                    </div>
                ))}
            </div>
            {tip.pie && <div className="mt-1.5 pt-1 border-t border-white/15 text-[10px] text-sky-300">{tip.pie}</div>}
        </div>
    );
}

function ModeSwitch({ mode, onChange }) {
    return (
        <div className="inline-flex rounded-lg border overflow-hidden text-xs font-bold" style={{ borderColor: 'var(--border-color)' }}>
            <button
                type="button"
                onClick={() => onChange('count')}
                className={`px-2.5 py-1 cursor-pointer transition ${mode === 'count' ? 'btn-primary rounded-none' : 'opacity-70 hover:opacity-100'}`}
            >
                #
            </button>
            <button
                type="button"
                onClick={() => onChange('pct')}
                className={`px-2.5 py-1 cursor-pointer transition ${mode === 'pct' ? 'btn-primary rounded-none' : 'opacity-70 hover:opacity-100'}`}
            >
                %
            </button>
        </div>
    );
}

export function BarChartSimple({ titulo, items, labelKey, valueKey, suffix = '', color = 'var(--accent)' }) {
    const [tip, setTip] = useState(null);
    const maxVal = Math.max(...items.map((i) => Number(i[valueKey]) || 0), 1);

    return (
        <div className="themed-card p-5">
            <FloatingTooltip tip={tip} />
            <h3 className="font-bold text-sm mb-3">{titulo}</h3>
            {items.length === 0 ? (
                <p className="text-sm opacity-70">Sin datos registrados aún.</p>
            ) : (
                <div className="space-y-2.5">
                    {items.map((item, idx) => {
                        const val = Number(item[valueKey]) || 0;
                        const pct = Math.min(100, Math.round((val / maxVal) * 100));
                        return (
                            <div
                                key={idx}
                                className="cursor-pointer group"
                                onMouseMove={(e) => setTip({
                                    x: e.clientX, y: e.clientY,
                                    titulo: String(item[labelKey]),
                                    lineas: [
                                        { label: 'Valor registrado', valor: `${val}${suffix}`, color },
                                        { label: 'Peso relativo', valor: `${pct}% del máx.` },
                                    ],
                                })}
                                onMouseLeave={() => setTip(null)}
                            >
                                <div className="flex justify-between text-xs font-medium mb-1">
                                    <span className="group-hover:font-bold transition">{item[labelKey]}</span>
                                    <span className="font-bold">{val}{suffix}</span>
                                </div>
                                <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--accent-soft)' }}>
                                    <div className="h-full rounded-full transition-all duration-300 group-hover:brightness-110" style={{ width: `${pct}%`, backgroundColor: color }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export function SemaforoChart({ verde = 0, amarillo = 0, rojo = 0, onFilterSemaforo }) {
    const [tip, setTip] = useState(null);
    const total = Math.max(verde + amarillo + rojo, 1);
    const segs = [
        { id: 'VERDE', label: 'Óptimas (VERDE)', count: verde, color: '#16a34a' },
        { id: 'AMARILLO', label: 'En Seguimiento', count: amarillo, color: '#eab308' },
        { id: 'ROJO', label: 'Críticas (ROJO)', count: rojo, color: '#dc2626' },
    ];

    return (
        <div className="themed-card p-5">
            <FloatingTooltip tip={tip} />
            <h3 className="font-bold text-sm mb-3">Distribución de Semáforos Académicos (CU5)</h3>
            <div className="w-full h-5 rounded-full overflow-hidden flex mb-3 border" style={{ borderColor: 'var(--border-color)' }}>
                {segs.map((s) => {
                    const pct = ((s.count * 100) / total).toFixed(1);
                    return (
                        <div
                            key={s.label}
                            className="cursor-pointer transition hover:brightness-110"
                            style={{ width: `${(s.count / total) * 100}%`, backgroundColor: s.color }}
                            onClick={() => onFilterSemaforo && onFilterSemaforo(s.id)}
                            onMouseMove={(e) => setTip({
                                x: e.clientX, y: e.clientY,
                                titulo: s.label,
                                lineas: [
                                    { label: 'Aulas', valor: `${s.count} de ${total}`, color: s.color },
                                    { label: 'Proporción', valor: `${pct}%` },
                                ],
                                pie: onFilterSemaforo ? 'Clic para filtrar en Matriz Nominal' : null,
                            })}
                            onMouseLeave={() => setTip(null)}
                        />
                    );
                })}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
                {segs.map((s) => (
                    <button
                        type="button"
                        key={s.label}
                        onClick={() => onFilterSemaforo && onFilterSemaforo(s.id)}
                        className="p-2 rounded-lg border cursor-pointer hover:opacity-85 transition"
                        style={{ borderColor: 'var(--border-color)' }}
                    >
                        <div className="text-lg font-extrabold" style={{ color: s.color }}>{s.count}</div>
                        <div className="text-[11px] opacity-80">{s.label}</div>
                    </button>
                ))}
            </div>
        </div>
    );
}

// Gráfico 1: Inscritos, Aprobados y Reprobados por Asignatura (Interactivo con # / %, leyenda toggle, tooltip y clic)
export function AprobadosReprobadosChart({ materias, globalMode, onSelectMateria }) {
    const [localMode, setLocalMode] = useState(null);
    const [tip, setTip] = useState(null);
    const [hoverIdx, setHoverIdx] = useState(null);
    const [series, setSeries] = useState({ insc: true, aprob: true, repro: true });

    const mode = localMode || globalMode || 'count';
    const isPct = mode === 'pct';
    const maxVal = isPct ? 100 : Math.max(...materias.map((m) => Number(m.inscritos) || 0), 10);
    const w = Math.max(660, materias.length * 38 + 56);

    const toggleSeries = (k) => setSeries((s) => ({ ...s, [k]: !s[k] }));

    return (
        <div className="themed-card p-5">
            <FloatingTooltip tip={tip} />
            <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm">Gráfico 1: Aprobados y Reprobados por Asignatura</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}>
                            {isPct ? '% Tasa' : '# Cantidad'}
                        </span>
                    </div>
                    <p className="text-xs opacity-70">Clic en la leyenda para filtrar series · Pasa el mouse para ver detalle · Clic en barra para inspeccionar</p>
                </div>
                <ModeSwitch mode={mode} onChange={(m) => setLocalMode(m)} />
            </div>

            <div className="flex flex-wrap gap-3 text-[11px] font-semibold mb-2">
                {!isPct && (
                    <button type="button" onClick={() => toggleSeries('insc')} className={`flex items-center gap-1.5 cursor-pointer ${series.insc ? '' : 'opacity-35 line-through'}`}>
                        <i className="w-3 h-2.5 rounded-sm inline-block bg-blue-500" /> Inscritos (#INSC)
                    </button>
                )}
                <button type="button" onClick={() => toggleSeries('aprob')} className={`flex items-center gap-1.5 cursor-pointer ${series.aprob ? '' : 'opacity-35 line-through'}`}>
                    <i className="w-3 h-2.5 rounded-sm inline-block bg-emerald-500" /> Aprobados (#APROB)
                </button>
                <button type="button" onClick={() => toggleSeries('repro')} className={`flex items-center gap-1.5 cursor-pointer ${series.repro ? '' : 'opacity-35 line-through'}`}>
                    <i className="w-3 h-2.5 rounded-sm inline-block bg-rose-500" /> Reprobados (#REPRO)
                </button>
            </div>

            <div className="overflow-x-auto">
                <svg viewBox={`0 0 ${w} 225`} className="w-full min-w-[600px] h-56">
                    {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
                        const y = 172 - t * 146;
                        return (
                            <g key={i}>
                                <line x1="38" y1={y} x2={w - 10} y2={y} stroke="currentColor" strokeOpacity="0.12" />
                                <text x="32" y={y + 3} textAnchor="end" fontSize="9" fill="currentColor" opacity="0.65">
                                    {Math.round(maxVal * t)}{isPct ? '%' : ''}
                                </text>
                            </g>
                        );
                    })}
                    {materias.map((m, idx) => {
                        const x = 46 + idx * 38;
                        const insc = Number(m.inscritos) || 0;
                        const aprob = Number(m.aprobados) || 0;
                        const repro = Number(m.reprobados) || 0;
                        const pctAp = insc > 0 ? Number(((aprob * 100) / insc).toFixed(1)) : 0;
                        const pctRp = insc > 0 ? Number(((repro * 100) / insc).toFixed(1)) : 0;

                        const hI = !isPct && series.insc ? (insc / maxVal) * 146 : 0;
                        const hA = series.aprob ? ((isPct ? pctAp : aprob) / maxVal) * 146 : 0;
                        const hR = series.repro ? ((isPct ? pctRp : repro) / maxVal) * 146 : 0;
                        const dimmed = hoverIdx !== null && hoverIdx !== idx;

                        const onMove = (e) => {
                            setHoverIdx(idx);
                            setTip({
                                x: e.clientX, y: e.clientY,
                                titulo: `${m.sigla}-${m.grupo}`,
                                subtitulo: `${m.materia} · ${m.facultad}`,
                                lineas: [
                                    { label: 'Inscritos (#INSC)', valor: `${insc}`, color: '#3b82f6' },
                                    { label: 'Aprobados (#APROB)', valor: `${aprob} (${pctAp}%)`, color: '#10b981' },
                                    { label: 'Reprobados (#REPRO)', valor: `${repro} (${pctRp}%)`, color: '#ef4444' },
                                    { label: '2da Instancia (40-50)', valor: `${m.segunda_instancia}`, color: '#f59e0b' },
                                    { label: 'Promedio General', valor: `${m.promedio_notas} pts` },
                                ],
                                pie: 'Clic para abrir ficha detallada de la asignatura',
                            });
                        };

                        return (
                            <g
                                key={m.id || idx}
                                opacity={dimmed ? 0.45 : 1}
                                className="cursor-pointer transition-opacity duration-150"
                                onMouseMove={onMove}
                                onMouseLeave={() => { setHoverIdx(null); setTip(null); }}
                                onClick={() => onSelectMateria && onSelectMateria(m)}
                            >
                                <rect x={x - 3} y="24" width="32" height="150" fill="transparent" />
                                {!isPct && series.insc && <rect x={x} y={172 - hI} width="8" height={hI} rx="1.5" fill="#3b82f6" />}
                                {series.aprob && <rect x={isPct ? x + 2 : x + 9} y={172 - hA} width={isPct ? 11 : 8} height={hA} rx="1.5" fill="#10b981" />}
                                {series.repro && <rect x={isPct ? x + 14 : x + 18} y={172 - hR} width={isPct ? 11 : 8} height={hR} rx="1.5" fill="#ef4444" />}
                                <text x={x + 13} y="184" textAnchor="end" fontSize="8" fill="currentColor" opacity="0.8" transform={`rotate(-40 ${x + 13} 184)`}>
                                    {m.sigla}-{m.grupo}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}

// Gráfico 2: % Éxito vs Reprobación (100% Apilado horizontal con tooltip rico)
export function ExitoApiladoChart({ materias, onSelectMateria }) {
    const [tip, setTip] = useState(null);

    return (
        <div className="themed-card p-5">
            <FloatingTooltip tip={tip} />
            <div className="flex justify-between items-center mb-3">
                <div>
                    <h3 className="font-bold text-sm">Gráfico 2: % Éxito vs Reprobación (100% Apilado)</h3>
                    <p className="text-xs opacity-70">Proporción comparativa · Pasa el mouse o haz clic en cualquier materia</p>
                </div>
                <div className="flex gap-3 text-[11px] font-semibold">
                    <span className="text-emerald-600">■ % Aprob.</span>
                    <span className="text-rose-600">■ % Reprob.</span>
                </div>
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {materias.map((m) => {
                    const insc = Number(m.inscritos) || 0;
                    const pctAp = insc > 0 ? Number(((m.aprobados * 100) / insc).toFixed(1)) : 0;
                    const pctRp = Number((100 - pctAp).toFixed(1));
                    return (
                        <div
                            key={m.id}
                            className="flex items-center gap-2 text-[11px] cursor-pointer hover:opacity-90 py-0.5"
                            onClick={() => onSelectMateria && onSelectMateria(m)}
                            onMouseMove={(e) => setTip({
                                x: e.clientX, y: e.clientY,
                                titulo: `${m.sigla}-${m.grupo}`,
                                subtitulo: m.materia,
                                lineas: [
                                    { label: 'Tasa Aprobación', valor: `${pctAp}% (${m.aprobados}/${insc})`, color: '#10b981' },
                                    { label: 'Tasa Reprobación', valor: `${pctRp}% (${m.reprobados}/${insc})`, color: '#ef4444' },
                                    { label: 'Semáforo', valor: m.semaforo },
                                ],
                                pie: 'Clic para inspeccionar asignatura',
                            })}
                            onMouseLeave={() => setTip(null)}
                        >
                            <span className="w-20 font-mono font-semibold truncate">{m.sigla}-{m.grupo}</span>
                            <div className="flex-1 h-4 rounded overflow-hidden flex bg-rose-500">
                                <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${pctAp}%` }} />
                            </div>
                            <span className="w-20 text-right font-mono">{pctAp}% / {pctRp}%</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Gráfico 3: Notas Promedio del Semestre (General vs Aprobados + Línea ICU 51 pts + Tooltip)
export function PromediosCorteChart({ materias, onSelectMateria }) {
    const [tip, setTip] = useState(null);
    const [hoverIdx, setHoverIdx] = useState(null);
    const [verAprob, setVerAprob] = useState(true);
    const w = Math.max(660, materias.length * 38 + 56);
    const yCorte = 172 - (51 / 100) * 146;

    return (
        <div className="themed-card p-5">
            <FloatingTooltip tip={tip} />
            <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm">Gráfico 3: Notas Promedio del Semestre (Escala 0–100)</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Línea ICU: 51 pts</span>
                    </div>
                    <p className="text-xs opacity-70">Nota Promedio General (N_PROM) vs Promedio Aprobados (NPRMAP) con umbral aprobatorio</p>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-semibold">
                    <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm inline-block bg-blue-600" /> Prom. General</span>
                    <button type="button" onClick={() => setVerAprob(!verAprob)} className={`flex items-center gap-1 cursor-pointer ${verAprob ? '' : 'opacity-40 line-through'}`}>
                        <i className="w-2.5 h-2.5 rounded-sm inline-block bg-emerald-500" /> Prom. Aprobados
                    </button>
                    <span className="text-rose-600 font-bold">--- 51 pts</span>
                </div>
            </div>
            <div className="overflow-x-auto">
                <svg viewBox={`0 0 ${w} 225`} className="w-full min-w-[600px] h-56">
                    {[0, 25, 50, 75, 100].map((v) => {
                        const y = 172 - (v / 100) * 146;
                        return (
                            <g key={v}>
                                <line x1="36" y1={y} x2={w - 10} y2={y} stroke="currentColor" strokeOpacity="0.1" />
                                <text x="30" y={y + 3} textAnchor="end" fontSize="9" fill="currentColor" opacity="0.6">{v}</text>
                            </g>
                        );
                    })}
                    {materias.map((m, idx) => {
                        const x = 46 + idx * 38;
                        const valGen = Number(m.promedio_notas) || 0;
                        const valAp = Number(m.promedio_aprobados) || 0;
                        const bhG = (valGen / 100) * 146;
                        const bhA = (valAp / 100) * 146;
                        const fillG = valGen >= 51 ? '#2563eb' : valGen >= 40 ? '#f59e0b' : '#dc2626';
                        const dimmed = hoverIdx !== null && hoverIdx !== idx;

                        return (
                            <g
                                key={m.id || idx}
                                opacity={dimmed ? 0.45 : 1}
                                className="cursor-pointer transition-opacity"
                                onClick={() => onSelectMateria && onSelectMateria(m)}
                                onMouseMove={(e) => {
                                    setHoverIdx(idx);
                                    setTip({
                                        x: e.clientX, y: e.clientY,
                                        titulo: `${m.sigla}-${m.grupo}`,
                                        subtitulo: m.materia,
                                        lineas: [
                                            { label: 'Nota Promedio (N_PROM)', valor: `${valGen} pts`, color: fillG },
                                            { label: 'Prom. Aprobados (NPRMAP)', valor: `${valAp} pts`, color: '#10b981' },
                                            { label: 'Estado vs Corte (51 pts)', valor: valGen >= 51 ? 'Sobre umbral ✓' : 'Bajo umbral ⚠' },
                                        ],
                                        pie: 'Clic para abrir ficha detallada',
                                    });
                                }}
                                onMouseLeave={() => { setHoverIdx(null); setTip(null); }}
                            >
                                <rect x={x - 3} y="24" width="32" height="150" fill="transparent" />
                                <rect x={x} y={172 - bhG} width={verAprob ? 12 : 22} height={bhG} rx="2" fill={fillG} />
                                {verAprob && <rect x={x + 13} y={172 - bhA} width="12" height={bhA} rx="2" fill="#10b981" />}
                                <text x={x + 12} y="184" textAnchor="end" fontSize="8" fill="currentColor" opacity="0.8" transform={`rotate(-40 ${x + 12} 184)`}>
                                    {m.sigla}-{m.grupo}
                                </text>
                            </g>
                        );
                    })}
                    <line x1="36" y1={yCorte} x2={w - 10} y2={yCorte} stroke="#dc2626" strokeWidth="1.8" strokeDasharray="5,4" />
                </svg>
            </div>
        </div>
    );
}

// Radar Pentagonal 360° interactivo (tooltip en cada vértice)
export function RadarCalidadAVA({ radar }) {
    const [tip, setTip] = useState(null);
    if (!radar || radar.length === 0) return null;
    const cx = 165, cy = 122, rMax = 78;
    const n = radar.length;
    const coord = (idx, pct) => {
        const ang = (-Math.PI / 2) + (idx * 2 * Math.PI) / n;
        const r = (Math.min(100, Math.max(0, pct)) / 100) * rMax;
        return { x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) };
    };
    const pointStr = (idx, pct) => {
        const c = coord(idx, pct);
        return `${c.x},${c.y}`;
    };

    const polyActual = radar.map((e, i) => pointStr(i, e.actual)).join(' ');
    const polyIdeal = radar.map((e, i) => pointStr(i, e.ideal)).join(' ');
    const indice360 = (radar.reduce((acc, e) => acc + Number(e.actual), 0) / n).toFixed(1);

    return (
        <div className="themed-card p-5">
            <FloatingTooltip tip={tip} />
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="font-bold text-sm">Radar Pentagonal de Calidad AVA (Salud Académica 360°)</h3>
                    <p className="text-xs opacity-70">Pasa el mouse sobre cada vértice para comparar Diagnóstico vs Ideal ICU 053/2023</p>
                </div>
                <div className="text-right">
                    <div className="text-[10px] uppercase font-bold opacity-70">Índice 360°</div>
                    <div className="text-lg font-extrabold" style={{ color: 'var(--accent)' }}>{indice360} / 100</div>
                </div>
            </div>
            <svg viewBox="0 0 330 245" className="w-full max-w-sm mx-auto h-56">
                {[25, 50, 75, 100].map((lvl) => (
                    <polygon key={lvl} points={radar.map((_, i) => pointStr(i, lvl)).join(' ')} fill="none" stroke="currentColor" strokeOpacity="0.15" />
                ))}
                {radar.map((e, i) => {
                    const ang = (-Math.PI / 2) + (i * 2 * Math.PI) / n;
                    const lx = cx + (rMax + 26) * Math.cos(ang);
                    const ly = cy + (rMax + 20) * Math.sin(ang);
                    return (
                        <g key={e.eje}>
                            <line x1={cx} y1={cy} x2={cx + rMax * Math.cos(ang)} y2={cy + rMax * Math.sin(ang)} stroke="currentColor" strokeOpacity="0.15" />
                            <text x={lx} y={ly} textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="currentColor">{e.eje}</text>
                        </g>
                    );
                })}
                <polygon points={polyIdeal} fill="#10b981" fillOpacity="0.14" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4,3" />
                <polygon points={polyActual} fill="#4f46e5" fillOpacity="0.28" stroke="#4f46e5" strokeWidth="2" />
                {radar.map((e, i) => {
                    const c = coord(i, e.actual);
                    const brecha = (Number(e.actual) - Number(e.ideal)).toFixed(1);
                    return (
                        <circle
                            key={e.eje}
                            cx={c.x} cy={c.y} r="5.5"
                            fill="#4f46e5" stroke="#fff" strokeWidth="1.5"
                            className="cursor-pointer"
                            onMouseMove={(ev) => setTip({
                                x: ev.clientX, y: ev.clientY,
                                titulo: e.eje,
                                lineas: [
                                    { label: 'Diagnóstico en Vivo', valor: `${e.actual}%`, color: '#4f46e5' },
                                    { label: 'Meta ICU N° 053/2023', valor: `${e.ideal}%`, color: '#10b981' },
                                    { label: 'Brecha', valor: `${brecha > 0 ? '+' : ''}${brecha}%` },
                                ],
                            })}
                            onMouseLeave={() => setTip(null)}
                        />
                    );
                })}
            </svg>
            <div className="flex justify-center gap-5 text-[11px] font-semibold">
                <span className="text-indigo-600">■ Diagnóstico en Vivo</span>
                <span className="text-emerald-600">--- Ideal ICU N° 053/2023</span>
            </div>
        </div>
    );
}

// Saturación Pedagógica de Aulas Virtuales (con # / % ocupación y tooltip)
export function SaturacionAulasChart({ materias, globalMode, onSelectMateria }) {
    const [localMode, setLocalMode] = useState(null);
    const [tip, setTip] = useState(null);
    const mode = localMode || globalMode || 'count';
    const isPct = mode === 'pct';

    const maxVal = isPct
        ? Math.max(...materias.map((m) => Math.round((Number(m.inscritos) * 100) / 35)), 140)
        : Math.max(...materias.map((m) => Number(m.inscritos) || 0), 50);
    const w = Math.max(660, materias.length * 38 + 56);
    const umbralVal = isPct ? 100 : 35;
    const yOpt = 168 - (umbralVal / maxVal) * 142;

    return (
        <div className="themed-card p-5">
            <FloatingTooltip tip={tip} />
            <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                <div>
                    <h3 className="font-bold text-sm">Saturación Pedagógica de Aulas Virtuales ({isPct ? '% Ocupación' : '# Alumnos'})</h3>
                    <p className="text-xs opacity-70">Capacidad pedagógica óptima DEDTE: 35 estudiantes/aula (100%)</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex gap-2.5 text-[11px] font-semibold">
                        <span className="text-blue-600">■ Óptimo (≤35)</span>
                        <span className="text-amber-600">■ Moderado (36–42)</span>
                        <span className="text-rose-600">■ Sobrecarga (&gt;42)</span>
                    </div>
                    <ModeSwitch mode={mode} onChange={(m) => setLocalMode(m)} />
                </div>
            </div>
            <div className="overflow-x-auto">
                <svg viewBox={`0 0 ${w} 218`} className="w-full min-w-[600px] h-52">
                    {materias.map((m, idx) => {
                        const x = 44 + idx * 38;
                        const insc = Number(m.inscritos) || 0;
                        const ocup = Math.round((insc * 100) / 35);
                        const val = isPct ? ocup : insc;
                        const bh = (val / maxVal) * 142;
                        const fill = insc > 42 ? '#ef4444' : insc > 35 ? '#f59e0b' : '#3b82f6';
                        return (
                            <g
                                key={m.id || idx}
                                className="cursor-pointer"
                                onClick={() => onSelectMateria && onSelectMateria(m)}
                                onMouseMove={(e) => setTip({
                                    x: e.clientX, y: e.clientY,
                                    titulo: `${m.sigla}-${m.grupo}`,
                                    subtitulo: m.materia,
                                    lineas: [
                                        { label: 'Estudiantes Inscritos', valor: `${insc} alumnos`, color: fill },
                                        { label: 'Ocupación vs Óptimo (35)', valor: `${ocup}%` },
                                        { label: 'Diagnóstico', valor: insc > 42 ? 'Sobrecarga Crítica' : insc > 35 ? 'Carga Moderada' : 'Capacidad Óptima' },
                                    ],
                                    pie: 'Clic para inspeccionar aula',
                                })}
                                onMouseLeave={() => setTip(null)}
                            >
                                <rect x={x} y={168 - bh} width="22" height={bh} rx="2.5" fill={fill} />
                                <text x={x + 11} y={163 - bh} textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor">{val}{isPct ? '%' : ''}</text>
                                <text x={x + 11} y="180" textAnchor="end" fontSize="8" fill="currentColor" opacity="0.8" transform={`rotate(-40 ${x + 11} 180)`}>{m.sigla}-{m.grupo}</text>
                            </g>
                        );
                    })}
                    <line x1="30" y1={yOpt} x2={w - 10} y2={yOpt} stroke="#10b981" strokeWidth="1.8" strokeDasharray="5,4" />
                    <text x={w - 14} y={yOpt - 4} textAnchor="end" fontSize="9" fontWeight="bold" fill="#10b981">
                        Óptimo DEDTE ({isPct ? '100%' : '35 est.'})
                    </text>
                </svg>
            </div>
        </div>
    );
}

// Correlación Carga Operativa (Tareas/Semana) vs Tasa de Deserción con tooltip
export function CorrelacionDesercionChart({ puntos }) {
    const [tip, setTip] = useState(null);
    return (
        <div className="themed-card p-5">
            <FloatingTooltip tip={tip} />
            <h3 className="font-bold text-sm">Correlación: Índice de Carga Operativa vs Tasa de Deserción</h3>
            <p className="text-xs opacity-70 mb-3">Relación entre tareas/retos exigidos semanalmente en Moodle y % de deserción estudiantil</p>
            <svg viewBox="0 0 600 190" className="w-full h-48">
                {[0, 15, 30, 45, 60].map((v) => {
                    const y = 155 - (v / 60) * 130;
                    return (
                        <g key={v}>
                            <line x1="45" y1={y} x2="575" y2={y} stroke="currentColor" strokeOpacity="0.12" />
                            <text x="38" y={y + 3} textAnchor="end" fontSize="9" fill="currentColor" opacity="0.6">{v}%</text>
                        </g>
                    );
                })}
                {[1, 2, 3, 4, 5, 6, 7].map((t) => {
                    const x = 45 + (t / 7.5) * 520;
                    return <text key={t} x={x} y="173" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.7">{t} tareas/sem</text>;
                })}
                {puntos.map((p) => {
                    const x = 45 + (p.tareas / 7.5) * 520;
                    const y = 155 - (Math.min(60, p.desercion) / 60) * 130;
                    return (
                        <g
                            key={p.tareas}
                            className="cursor-pointer"
                            onMouseMove={(e) => setTip({
                                x: e.clientX, y: e.clientY,
                                titulo: `Carga: ${p.tareas} tareas / semana`,
                                lineas: [
                                    { label: 'Deserción Promedio', valor: `${p.desercion}%`, color: '#dc2626' },
                                    { label: 'Asignaturas en este nivel', valor: `${p.aulas} aulas` },
                                ],
                            })}
                            onMouseLeave={() => setTip(null)}
                        >
                            <circle cx={x} cy={y} r="7.5" fill="#dc2626" fillOpacity="0.88" stroke="#fff" strokeWidth="1.5" />
                            <text x={x} y={y - 11} textAnchor="middle" fontSize="9" fontWeight="bold" fill="currentColor">{p.desercion}%</text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}
