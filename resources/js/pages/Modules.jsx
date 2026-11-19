import React, { useEffect, useState } from 'react';
import api, { extraerError } from '../api';
import {
    BarChartSimple, SemaforoChart, AprobadosReprobadosChart, ExitoApiladoChart,
    PromediosCorteChart, RadarCalidadAVA, SaturacionAulasChart, CorrelacionDesercionChart
} from '../components/Charts';

function AlertBanner({ msg, onClose }) {
    if (!msg) return null;
    const isErr = msg.tipo === 'error';
    return (
        <div
            className="mb-4 px-4 py-3 rounded-lg border flex justify-between items-center text-sm font-medium"
            style={{
                backgroundColor: isErr ? '#fef2f2' : '#ecfdf5',
                borderColor: isErr ? '#dc2626' : '#059669',
                color: isErr ? '#991b1b' : '#065f46',
            }}
        >
            <span>{msg.texto}</span>
            <button onClick={onClose} className="ml-4 font-bold">✕</button>
        </div>
    );
}

function SemaforoBadge({ valor }) {
    const estilos = {
        VERDE: { bg: '#dcfce7', color: '#166534' },
        AMARILLO: { bg: '#fef9c3', color: '#854d0e' },
        ROJO: { bg: '#fee2e2', color: '#991b1b' },
    }[valor] || { bg: '#e2e8f0', color: '#334155' };
    return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: estilos.bg, color: estilos.color }}>
            {valor}
        </span>
    );
}

// ===================== CU6: CENTRO DE CONTROL Y ANALÍTICA ACADÉMICA DEDTE =====================
export function DashboardView() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [bloque, setBloque] = useState('general');
    const [filtroSem, setFiltroSem] = useState('TODAS');
    const [globalMode, setGlobalMode] = useState('count'); // 'count' (#) | 'pct' (%)
    const [materiaSel, setMateriaSel] = useState(null);
    const [filtros, setFiltros] = useState({ entorno_id: 'TODOS', facultad: 'TODAS', carrera: 'TODAS', gestion: 'TODAS', nivel: 'TODOS' });

    const cargar = (f = filtros) => {
        const params = new URLSearchParams();
        Object.entries(f).forEach(([k, v]) => { if (v && v !== 'TODOS' && v !== 'TODAS') params.set(k, v); });
        api.get(`/dashboard?${params.toString()}`)
            .then((r) => { setData(r.data); setError(''); })
            .catch((e) => setError(extraerError(e)));
    };

    useEffect(() => { cargar(filtros); }, []);

    const actualizarFiltro = (campo, valor) => {
        const next = { ...filtros, [campo]: valor };
        setFiltros(next);
        cargar(next);
    };

    const exportarCSV = () => {
        if (!data?.materias?.length) return;
        const headers = ['SIGLA', 'GRUPO', 'MATERIA', 'FACULTAD', 'CARRERA', 'NIVEL', 'INSCRITOS', 'APROBADOS', 'REPROBADOS', '2DA_INSTANCIA', 'DESERCION', 'PROMEDIO', 'SEMAFORO'];
        const rows = data.materias.map((m) => [
            m.sigla, m.grupo, `"${m.materia}"`, m.facultad, `"${m.carrera}"`, m.nivel,
            m.inscritos, m.aprobados, m.reprobados, m.segunda_instancia, m.retiros, m.promedio_notas, m.semaforo,
        ].join(','));
        const blob = new Blob(['\uFEFF' + [headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'DEDTE_Analitica_Academica_Grupo11SA.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    if (error) return <div className="themed-card p-6 text-red-600">{error}</div>;
    if (!data) return <div className="themed-card p-6">Cargando Centro de Control DEDTE...</div>;

    const k = data.kpis;
    const materias = data.materias || [];
    const materiasFiltradasSem = filtroSem === 'TODAS' ? materias : materias.filter((m) => m.semaforo === filtroSem);

    const tabs = [
        { id: 'general',    tag: 'GENERAL',  titulo: 'Dashboard General',   sub: `${k.total_inscritos} Est. · ${k.total_aulas} Aulas` },
        { id: 'bloque1',    tag: 'BLOQUE 1', titulo: 'Apertura Semestre',   sub: `${k.total_aulas} Habilitadas (100%)` },
        { id: 'bloque2',    tag: 'BLOQUE 2', titulo: 'Población y Carga',   sub: `${k.carga_media} Est./Aula` },
        { id: 'bloque3',    tag: 'BLOQUE 3', titulo: 'Aprobación y Notas',  sub: `${k.tasa_aprobacion}% Aprobados` },
        { id: 'bloque4',    tag: 'BLOQUE 4', titulo: 'Deserción y Alertas', sub: `${k.alertas_7d} Alertas >7d` },
        { id: 'matriz',     tag: 'MATRIZ',   titulo: 'Detalle Materias',    sub: `${k.total_aulas} Aulas Auditadas` },
    ];

    return (
        <div className="space-y-5">
            {/* Barra institucional + Filtros multidimensionales (sin superposición) */}
            <div className="themed-card p-4 space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-2">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">
                            Dirección DEDTE (Global UAGRM) · Res. Rectoral e ICU N° 053/2023 · Moodle 5.1 LTS
                        </div>
                        <h1 className="text-xl font-extrabold mt-0.5">Centro de Control y Analítica Académica DEDTE</h1>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}>
                            Mostrando {k.total_aulas} materias ({k.total_inscritos} estudiantes)
                        </span>
                        <button onClick={exportarCSV} className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer">
                            Exportar Excel (CSV)
                        </button>
                        <button onClick={() => window.print()} className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-700 text-white hover:bg-slate-800 cursor-pointer">
                            Imprimir / PDF
                        </button>
                        <button onClick={() => cargar(filtros)} className="btn-primary px-3 py-1 text-xs font-bold cursor-pointer">
                            Actualizar
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <select className="themed-input px-2.5 py-1.5 text-xs" value={filtros.entorno_id} onChange={(e) => actualizarFiltro('entorno_id', e.target.value)}>
                        <option value="TODOS">Plataforma: Todas</option>
                        {data.filtros.entornos.map((en) => <option key={en.id} value={en.id}>{en.nombre}</option>)}
                    </select>
                    <select className="themed-input px-2.5 py-1.5 text-xs" value={filtros.facultad} onChange={(e) => actualizarFiltro('facultad', e.target.value)}>
                        <option value="TODAS">Facultad: Todas</option>
                        {data.filtros.facultades.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select className="themed-input px-2.5 py-1.5 text-xs" value={filtros.carrera} onChange={(e) => actualizarFiltro('carrera', e.target.value)}>
                        <option value="TODAS">Carrera: Todas</option>
                        {data.filtros.carreras.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select className="themed-input px-2.5 py-1.5 text-xs" value={filtros.gestion} onChange={(e) => actualizarFiltro('gestion', e.target.value)}>
                        <option value="TODAS">Gestión: Todas</option>
                        {data.filtros.gestiones.map((g) => <option key={g} value={g}>{g} (Activo)</option>)}
                    </select>
                    <select className="themed-input px-2.5 py-1.5 text-xs" value={filtros.nivel} onChange={(e) => actualizarFiltro('nivel', e.target.value)}>
                        <option value="TODOS">Nivel: Todos</option>
                        {data.filtros.niveles.map((n) => <option key={n} value={n}>Nivel {n}</option>)}
                    </select>
                </div>
            </div>

            {/* 6 KPIs Ejecutivos Reales DEDTE */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="themed-card p-3.5 border-l-4 border-l-blue-600">
                    <div className="text-[11px] opacity-75 font-semibold">Est. Inscritos (#INSC)</div>
                    <div className="text-2xl font-extrabold mt-0.5">{k.total_inscritos}</div>
                    <div className="text-[11px] opacity-70">{k.total_aulas} asignaturas analizadas</div>
                </div>
                <div className="themed-card p-3.5 border-l-4 border-l-emerald-600">
                    <div className="text-[11px] opacity-75 font-semibold">Aprobados (#APROB)</div>
                    <div className="text-2xl font-extrabold text-emerald-600 mt-0.5">{k.total_aprobados}</div>
                    <div className="text-[11px] text-emerald-700 font-semibold">{k.tasa_aprobacion}% tasa aprobación</div>
                </div>
                <div className="themed-card p-3.5 border-l-4 border-l-rose-600">
                    <div className="text-[11px] opacity-75 font-semibold">Reprobados (#REPRO)</div>
                    <div className="text-2xl font-extrabold text-rose-600 mt-0.5">{k.total_reprobados}</div>
                    <div className="text-[11px] text-rose-700 font-semibold">{k.tasa_reprobacion}% tasa reprobación</div>
                </div>
                <div className="themed-card p-3.5 border-l-4 border-l-amber-500">
                    <div className="text-[11px] opacity-75 font-semibold">2da Instancia (40–50 pts)</div>
                    <div className="text-2xl font-extrabold text-amber-600 mt-0.5">{k.segunda_instancia}</div>
                    <div className="text-[11px] text-amber-700 font-semibold">{k.tasa_segunda_inst}% habilitados</div>
                </div>
                <div className="themed-card p-3.5 border-l-4 border-l-purple-600">
                    <div className="text-[11px] opacity-75 font-semibold">Deserción (#REP_0)</div>
                    <div className="text-2xl font-extrabold text-purple-600 mt-0.5">{k.total_desercion}</div>
                    <div className="text-[11px] text-purple-700 font-semibold">{k.alertas_7d} alertas &gt; 7 días</div>
                </div>
                <div className="themed-card p-3.5 border-l-4 border-l-indigo-600">
                    <div className="text-[11px] opacity-75 font-semibold">Promedios (Gen / Ap)</div>
                    <div className="text-2xl font-extrabold mt-0.5">
                        {k.promedio_global} <span className="text-base text-emerald-600">/ {k.promedio_aprobados}</span>
                    </div>
                    <div className="text-[11px] opacity-70">Escala 0–100 pts</div>
                </div>
            </div>

            {/* Selector coherente de los 4 Bloques Estratégicos + General + Matriz */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {tabs.map((t) => {
                    const active = bloque === t.id;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setBloque(t.id)}
                            className={`text-left p-3 rounded-xl border transition cursor-pointer ${active ? 'text-white shadow-md' : 'themed-card hover:opacity-90'}`}
                            style={active ? { backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' } : {}}
                        >
                            <div className={`text-[10px] font-extrabold tracking-wider ${active ? 'text-white/80' : 'opacity-60'}`}>{t.tag}</div>
                            <div className="text-xs font-extrabold mt-0.5">{t.titulo}</div>
                            <div className={`text-[11px] mt-1 font-semibold ${active ? 'text-white/90' : ''}`} style={active ? {} : { color: 'var(--accent)' }}>{t.sub}</div>
                        </button>
                    );
                })}
            </div>

            {/* ===================== CONTENIDO POR BLOQUE ===================== */}
            {bloque === 'general' && (
                <div className="space-y-5">
                    {/* Barra de Visualización Multidimensional (# vs %) */}
                    <div className="themed-card px-4 py-2.5 flex flex-wrap justify-between items-center gap-2 text-xs">
                        <div>
                            <strong style={{ color: 'var(--accent)' }}>Visualización Multidimensional:</strong>{' '}
                            <span className="opacity-75">Alterna globalmente entre valores nominales absolutos (#) y tasas porcentuales (%) o haz clic en cualquier barra para inspeccionar la asignatura.</span>
                        </div>
                        <div className="flex gap-1.5">
                            <button
                                type="button"
                                onClick={() => setGlobalMode('count')}
                                className={`px-3 py-1 rounded-lg font-bold border cursor-pointer ${globalMode === 'count' ? 'btn-primary' : ''}`}
                                style={globalMode === 'count' ? {} : { borderColor: 'var(--border-color)' }}
                            >
                                Todos en #
                            </button>
                            <button
                                type="button"
                                onClick={() => setGlobalMode('pct')}
                                className={`px-3 py-1 rounded-lg font-bold border cursor-pointer ${globalMode === 'pct' ? 'btn-primary' : ''}`}
                                style={globalMode === 'pct' ? {} : { borderColor: 'var(--border-color)' }}
                            >
                                Todos en %
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <AprobadosReprobadosChart materias={materias} globalMode={globalMode} onSelectMateria={setMateriaSel} />
                        <ExitoApiladoChart materias={materias} onSelectMateria={setMateriaSel} />
                    </div>
                    <PromediosCorteChart materias={materias} onSelectMateria={setMateriaSel} />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <RadarCalidadAVA radar={data.radar} />
                        <div className="themed-card p-5 space-y-3">
                            <h3 className="font-bold text-sm">Motor Predictivo de Alerta y Rescate Temprano</h3>
                            <p className="text-xs opacity-70">Prescripciones automáticas generadas sobre el cohorte activo</p>
                            <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 text-rose-900 text-xs">
                                <strong>Alerta Crítica — Abandono Fáctico (&gt;14 días inactivos):</strong> Se detectan <strong>{k.total_desercion} estudiantes ({k.tasa_desercion}%)</strong> sin actividad o nota cero. Activar protocolo de rescate docente inmediato.
                            </div>
                            <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs">
                                <strong>Oportunidad de Rescate — 2da Instancia (40–50 pts):</strong> <strong>{k.segunda_instancia} estudiantes ({k.tasa_segunda_inst}%)</strong> están en zona recuperable con tutoría focalizada antes del cierre de actas.
                            </div>
                            <div className="p-3 rounded-lg border border-blue-300 bg-blue-50 text-blue-900 text-xs">
                                <strong>Balanceo de Carga Pedagógica:</strong> Se identifican <strong>{k.aulas_sobrecarga} aulas sobre el umbral de 40 estudiantes</strong> (media: {k.carga_media} est./aula). Evaluar apertura de paralelos.
                            </div>
                            <SemaforoChart
                                verde={k.semaforo_verde}
                                amarillo={k.semaforo_amarillo}
                                rojo={k.semaforo_rojo}
                                onFilterSemaforo={(sem) => { setFiltroSem(sem); setBloque('matriz'); }}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <BarChartSimple titulo="Páginas Más Visitadas (Tráfico Web)" items={data.top_visitas} labelKey="titulo" valueKey="contador" suffix=" visitas" color="#0d9488" />
                        <BarChartSimple titulo="Evolución Histórica de Aprobación (%)" items={data.evolucion} labelKey="gestion" valueKey="aprobacion" suffix="%" color="#2563eb" />
                    </div>
                </div>
            )}

            {bloque === 'bloque1' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="themed-card p-5">
                            <div className="text-xs opacity-75">Aulas Habilitadas y Siglas</div>
                            <div className="text-3xl font-extrabold mt-1">{k.total_aulas}</div>
                            <div className="text-xs text-emerald-600 font-semibold mt-1">100% programadas por CPD/DTIC</div>
                        </div>
                        <div className="themed-card p-5">
                            <div className="text-xs opacity-75">Docentes Titulares Matriculados</div>
                            <div className="text-3xl font-extrabold text-emerald-600 mt-1">{k.total_aulas}</div>
                            <div className="text-xs opacity-70 mt-1">0 aulas acéfalas en producción</div>
                        </div>
                        <div className="themed-card p-5">
                            <div className="text-xs opacity-75">Cumplimiento Modelo Mosaico</div>
                            <div className="text-3xl font-extrabold text-blue-600 mt-1">100%</div>
                            <div className="text-xs opacity-70 mt-1">Carpetas pedagógicas y candados auditados</div>
                        </div>
                    </div>
                    <div className="themed-card overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                                <tr className="text-left"><th className="p-3">SIGLA - GRUPO</th><th className="p-3">ASIGNATURA</th><th className="p-3">CARRERA</th><th className="p-3">ESTADO AULA</th><th className="p-3">CARPETA PEDAGÓGICA</th><th className="p-3">TEMA MOODLE</th></tr>
                            </thead>
                            <tbody>
                                {materias.map((m) => (
                                    <tr key={m.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                                        <td className="p-3 font-bold">{m.sigla}-{m.grupo}</td>
                                        <td className="p-3">{m.materia}</td>
                                        <td className="p-3 opacity-80">{m.carrera}</td>
                                        <td className="p-3"><SemaforoBadge valor="VERDE" /></td>
                                        <td className="p-3 text-emerald-600 font-bold">✓ {m.carpeta_pedagogica}</td>
                                        <td className="p-3 text-blue-600 font-semibold">{m.formato_curso}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {bloque === 'bloque2' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="themed-card p-5">
                            <div className="text-xs opacity-75">Población Inscrita Total (#INSC)</div>
                            <div className="text-3xl font-extrabold mt-1">{k.total_inscritos}</div>
                            <div className="text-xs opacity-70 mt-1">Registros con matrícula oficial activa</div>
                        </div>
                        <div className="themed-card p-5">
                            <div className="text-xs opacity-75">Estudiantes Sin Nota (#S/NOT)</div>
                            <div className="text-3xl font-extrabold text-amber-600 mt-1">{k.total_desercion}</div>
                            <div className="text-xs text-amber-700 mt-1">Pendientes de evaluación o abandono inicial</div>
                        </div>
                        <div className="themed-card p-5">
                            <div className="text-xs opacity-75">Promedio de Carga por Paralelo</div>
                            <div className="text-3xl font-extrabold text-indigo-600 mt-1">{k.carga_media} alumnos</div>
                            <div className="text-xs opacity-70 mt-1">Estudiantes promedio por curso virtual</div>
                        </div>
                    </div>
                    <SaturacionAulasChart materias={materias} globalMode={globalMode} onSelectMateria={setMateriaSel} />
                </div>
            )}

            {bloque === 'bloque3' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="themed-card p-5">
                            <div className="text-xs opacity-75">Tasa de Aprobación Global</div>
                            <div className="text-3xl font-extrabold text-emerald-600 mt-1">{k.tasa_aprobacion}%</div>
                            <div className="text-xs text-emerald-700 mt-1">{k.total_aprobados} aprobados</div>
                        </div>
                        <div className="themed-card p-5">
                            <div className="text-xs opacity-75">Tasa de Reprobación Global</div>
                            <div className="text-3xl font-extrabold text-rose-600 mt-1">{k.tasa_reprobacion}%</div>
                            <div className="text-xs text-rose-700 mt-1">{k.total_reprobados} reprobados</div>
                        </div>
                        <div className="themed-card p-5">
                            <div className="text-xs opacity-75">Habilitados a 2da Instancia</div>
                            <div className="text-3xl font-extrabold text-amber-600 mt-1">{k.segunda_instancia}</div>
                            <div className="text-xs text-amber-700 mt-1">40 ≤ Nota Final ≤ 50 pts</div>
                        </div>
                        <div className="themed-card p-5">
                            <div className="text-xs opacity-75">Nota Promedio Aprobados</div>
                            <div className="text-3xl font-extrabold mt-1">{k.promedio_aprobados}</div>
                            <div className="text-xs opacity-70 mt-1">Excluye reprobados (#PRMAP)</div>
                        </div>
                    </div>

                    {/* Benchmarking Docente entre Paralelos */}
                    <div className="themed-card p-5 space-y-3">
                        <h3 className="font-bold text-sm">Benchmarking Docente (Comparativa entre Paralelos)</h3>
                        <p className="text-xs opacity-70">Análisis de brecha de aprobación en asignaturas dictadas por distintos docentes en paralelo</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(data.benchmarking || []).map((b) => (
                                <div key={b.sigla} className="p-4 rounded-xl border space-y-2" style={{ borderColor: b.brecha > 20 ? '#ef4444' : 'var(--border-color)' }}>
                                    <div className="flex justify-between items-center">
                                        <strong className="text-sm">{b.sigla} · {b.materia}</strong>
                                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${b.brecha > 20 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                            Brecha: {b.brecha}%
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="p-2.5 rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
                                            <div className="font-bold">Grupo {b.grupo_a.grupo}</div>
                                            <div className="opacity-75 truncate">{b.grupo_a.docente}</div>
                                            <div className="text-emerald-600 font-extrabold mt-1">{b.grupo_a.aprob_pct}% Aprob. · Prom {b.grupo_a.prom}</div>
                                        </div>
                                        <div className="p-2.5 rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
                                            <div className="font-bold">Grupo {b.grupo_b.grupo}</div>
                                            <div className="opacity-75 truncate">{b.grupo_b.docente}</div>
                                            <div className="text-rose-600 font-extrabold mt-1">{b.grupo_b.aprob_pct}% Aprob. · Prom {b.grupo_b.prom}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {bloque === 'bloque4' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="themed-card p-5 border-t-4 border-t-amber-500">
                            <div className="text-xs font-bold text-amber-700">Alerta Preventiva (&gt;7 días)</div>
                            <div className="text-3xl font-extrabold text-amber-600 mt-1">{k.alertas_7d}</div>
                            <div className="text-xs opacity-75 mt-1">Sin actividad reciente en logs Moodle</div>
                        </div>
                        <div className="themed-card p-5 border-t-4 border-t-orange-600">
                            <div className="text-xs font-bold text-orange-700">Riesgo Crítico (&gt;14 días)</div>
                            <div className="text-3xl font-extrabold text-orange-600 mt-1">{k.alertas_14d}</div>
                            <div className="text-xs opacity-75 mt-1">Abandono táctico (#REP_0)</div>
                        </div>
                        <div className="themed-card p-5 border-t-4 border-t-rose-600">
                            <div className="text-xs font-bold text-rose-700">Deserción Fáctica (&gt;21 días)</div>
                            <div className="text-3xl font-extrabold text-rose-600 mt-1">{k.alertas_21d}</div>
                            <div className="text-xs opacity-75 mt-1">Requiere contacto de Jefatura de Carrera</div>
                        </div>
                        <div className="themed-card p-5 border-t-4 border-t-purple-600">
                            <div className="text-xs font-bold text-purple-700">Retiros Formales (#RETMA)</div>
                            <div className="text-3xl font-extrabold text-purple-600 mt-1">{k.retiros_formales}</div>
                            <div className="text-xs opacity-75 mt-1">Índice deserción temprana: {k.tasa_desercion}%</div>
                        </div>
                    </div>
                    <CorrelacionDesercionChart puntos={data.correlacion || []} />
                </div>
            )}

            {bloque === 'matriz' && (
                <div className="themed-card p-5 space-y-4">
                    <div className="flex flex-wrap justify-between items-center gap-3">
                        <div>
                            <h2 className="font-bold text-base">Tabla Nominal y Métrica Desglosada por Asignatura</h2>
                            <p className="text-xs opacity-70">Mostrando {materiasFiltradasSem.length} de {materias.length} asignaturas sincronizadas</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-xs">
                            {[
                                { id: 'TODAS', label: 'Todas' },
                                { id: 'ROJO', label: '🔴 Críticas (Intervención)' },
                                { id: 'AMARILLO', label: '🟡 En Seguimiento' },
                                { id: 'VERDE', label: '🟢 Óptimas' },
                            ].map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setFiltroSem(f.id)}
                                    className={`px-3 py-1 rounded-full font-bold border cursor-pointer ${filtroSem === f.id ? 'btn-primary' : ''}`}
                                    style={filtroSem === f.id ? {} : { borderColor: 'var(--border-color)' }}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                                <tr className="text-left">
                                    <th className="p-2.5">SIGLA</th><th className="p-2.5">MATERIA</th><th className="p-2.5">CARRERA</th><th className="p-2.5">NIV.</th>
                                    <th className="p-2.5">INSC.</th><th className="p-2.5">APROB.</th><th className="p-2.5">% APROB.</th><th className="p-2.5">REPR.</th>
                                    <th className="p-2.5">2DA INST.</th><th className="p-2.5">CERO (DESERC.)</th><th className="p-2.5">PROM. GEN.</th><th className="p-2.5">SEMÁFORO</th>
                                </tr>
                            </thead>
                            <tbody>
                                {materiasFiltradasSem.map((m) => {
                                    const pctAp = m.inscritos > 0 ? ((m.aprobados * 100) / m.inscritos).toFixed(1) : '0.0';
                                    return (
                                        <tr key={m.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                                            <td className="p-2.5 font-bold whitespace-nowrap">{m.sigla}-{m.grupo}</td>
                                            <td className="p-2.5 font-medium">{m.materia}</td>
                                            <td className="p-2.5 opacity-80">{m.carrera}</td>
                                            <td className="p-2.5 text-center">{m.nivel}</td>
                                            <td className="p-2.5 font-bold text-blue-600">{m.inscritos}</td>
                                            <td className="p-2.5 font-bold text-emerald-600">{m.aprobados}</td>
                                            <td className="p-2.5 font-semibold">{pctAp}%</td>
                                            <td className="p-2.5 font-bold text-rose-600">{m.reprobados}</td>
                                            <td className="p-2.5 font-semibold text-amber-600">{m.segunda_instancia}</td>
                                            <td className="p-2.5 font-semibold text-purple-600">{m.retiros}</td>
                                            <td className="p-2.5 font-extrabold">{m.promedio_notas}</td>
                                            <td className="p-2.5"><SemaforoBadge valor={m.semaforo} /></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Inspector de Asignatura (al hacer clic en cualquier barra de los gráficos) */}
            {materiaSel && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setMateriaSel(null)}>
                    <div className="themed-card max-w-lg w-full p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-start gap-3 border-b pb-3" style={{ borderColor: 'var(--border-color)' }}>
                            <div>
                                <div className="text-xs font-bold opacity-70">{materiaSel.facultad} · {materiaSel.carrera}</div>
                                <h3 className="text-lg font-extrabold">{materiaSel.sigla}-{materiaSel.grupo} · {materiaSel.materia}</h3>
                                <div className="text-xs opacity-75 mt-0.5">Docente: <strong>{materiaSel.docente_nombre}</strong> · Formato: {materiaSel.formato_curso}</div>
                            </div>
                            <button onClick={() => setMateriaSel(null)} className="px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer" style={{ borderColor: 'var(--border-color)' }}>✕</button>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                            <div className="p-2.5 rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
                                <div className="opacity-70">Inscritos</div>
                                <div className="text-lg font-extrabold text-blue-600">{materiaSel.inscritos}</div>
                            </div>
                            <div className="p-2.5 rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
                                <div className="opacity-70">Aprobados</div>
                                <div className="text-lg font-extrabold text-emerald-600">
                                    {materiaSel.aprobados} ({materiaSel.inscritos > 0 ? ((materiaSel.aprobados * 100) / materiaSel.inscritos).toFixed(1) : 0}%)
                                </div>
                            </div>
                            <div className="p-2.5 rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
                                <div className="opacity-70">Reprobados</div>
                                <div className="text-lg font-extrabold text-rose-600">{materiaSel.reprobados}</div>
                            </div>
                            <div className="p-2.5 rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
                                <div className="opacity-70">2da Instancia</div>
                                <div className="text-lg font-extrabold text-amber-600">{materiaSel.segunda_instancia}</div>
                            </div>
                            <div className="p-2.5 rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
                                <div className="opacity-70">Prom. Gen / Ap</div>
                                <div className="text-base font-extrabold">{materiaSel.promedio_notas} / {materiaSel.promedio_aprobados}</div>
                            </div>
                            <div className="p-2.5 rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
                                <div className="opacity-70">Deserción</div>
                                <div className="text-lg font-extrabold text-purple-600">{materiaSel.tasa_desercion}%</div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                            <div>Alertas inactividad: <strong>7d: {materiaSel.alertas_7d}</strong> · <strong>14d: {materiaSel.alertas_14d}</strong> · <strong>21d: {materiaSel.alertas_21d}</strong></div>
                            <SemaforoBadge valor={materiaSel.semaforo} />
                        </div>
                        {materiaSel.observacion && (
                            <div className="p-3 rounded-lg text-xs border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--accent-soft)' }}>
                                <strong>Diagnóstico DEDTE:</strong> {materiaSel.observacion}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ===================== CU2: ENTORNOS MOODLE =====================
export function EntornosView({ puedeEditar }) {
    const [items, setItems] = useState([]);
    const [msg, setMsg] = useState(null);
    const [form, setForm] = useState({ codigo: '', nombre: '', tipo: 'VIRTUAL', url_base: 'https://ava.uagrm.edu.bo/', version_moodle: '5.1', estado_conexion: 'ACTIVO' });

    const cargar = () => api.get('/entornos').then((r) => setItems(r.data)).catch((e) => setMsg({ tipo: 'error', texto: extraerError(e) }));
    useEffect(() => { cargar(); }, []);

    const guardar = async (e) => {
        e.preventDefault();
        if (!form.codigo.trim() || !form.nombre.trim()) {
            return setMsg({ tipo: 'error', texto: 'El código y el nombre del entorno son obligatorios.' });
        }
        try {
            const res = await api.post('/entornos', form);
            setMsg({ tipo: 'ok', texto: res.data.message });
            setForm({ codigo: '', nombre: '', tipo: 'VIRTUAL', url_base: 'https://ava.uagrm.edu.bo/', version_moodle: '5.1', estado_conexion: 'ACTIVO' });
            cargar();
        } catch (err) {
            setMsg({ tipo: 'error', texto: extraerError(err) });
        }
    };

    const eliminar = async (id) => {
        try {
            const res = await api.delete(`/entornos/${id}`);
            setMsg({ tipo: 'ok', texto: res.data.message });
            cargar();
        } catch (err) {
            setMsg({ tipo: 'error', texto: extraerError(err) });
        }
    };

    return (
        <div className="space-y-5">
            <h1 className="text-2xl font-extrabold">Conexión de Entornos Moodle (CU2)</h1>
            <AlertBanner msg={msg} onClose={() => setMsg(null)} />

            {puedeEditar && (
                <form onSubmit={guardar} className="themed-card p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input className="themed-input px-3 py-2 text-sm" placeholder="Código (ej. AVA-POSG)" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} required />
                    <input className="themed-input px-3 py-2 text-sm" placeholder="Nombre del entorno" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
                    <select className="themed-input px-3 py-2 text-sm" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                        <option value="VIRTUAL">VIRTUAL</option>
                        <option value="PRESENCIAL">PRESENCIAL</option>
                        <option value="CAPACITACION">CAPACITACION</option>
                    </select>
                    <input className="themed-input px-3 py-2 text-sm" type="url" placeholder="https://ava.uagrm.edu.bo/..." value={form.url_base} onChange={(e) => setForm({ ...form, url_base: e.target.value })} required />
                    <input className="themed-input px-3 py-2 text-sm" placeholder="Versión (ej. 5.1)" value={form.version_moodle} onChange={(e) => setForm({ ...form, version_moodle: e.target.value })} required />
                    <button type="submit" className="btn-primary px-4 py-2 text-sm font-bold cursor-pointer">Registrar Entorno</button>
                </form>
            )}

            <div className="themed-card overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                        <tr className="text-left">
                            <th className="p-3">Código</th><th className="p-3">Nombre</th><th className="p-3">Tipo</th><th className="p-3">URL</th><th className="p-3">Versión</th><th className="p-3">Estado</th>
                            {puedeEditar && <th className="p-3">Acción</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((it) => (
                            <tr key={it.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                                <td className="p-3 font-bold">{it.codigo}</td>
                                <td className="p-3">{it.nombre}</td>
                                <td className="p-3">{it.tipo}</td>
                                <td className="p-3 text-xs">{it.url_base}</td>
                                <td className="p-3">{it.version_moodle}</td>
                                <td className="p-3"><SemaforoBadge valor={it.estado_conexion === 'ACTIVO' ? 'VERDE' : 'AMARILLO'} /></td>
                                {puedeEditar && <td className="p-3"><button onClick={() => eliminar(it.id)} className="text-red-600 text-xs font-bold hover:underline cursor-pointer">Eliminar</button></td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ===================== CU3: APERTURA E INFRAESTRUCTURA =====================
export function AperturaView({ puedeEditar }) {
    const [items, setItems] = useState([]);
    const [entornos, setEntornos] = useState([]);
    const [msg, setMsg] = useState(null);
    const [form, setForm] = useState({
        entorno_id: '', gestion: '2026-2', facultad: 'FICCT', carrera: 'Ingeniería en Informática',
        sigla: '', grupo: '', materia: '', docente_codigo: '', docente_nombre: '', formato_curso: 'MOSAICOS', estado_apertura: 'APERTURADA',
    });

    const cargar = () => {
        api.get('/apertura').then((r) => setItems(r.data));
        api.get('/entornos').then((r) => {
            setEntornos(r.data);
            if (r.data[0] && !form.entorno_id) setForm((f) => ({ ...f, entorno_id: r.data[0].id }));
        }).catch(() => {});
    };
    useEffect(() => { cargar(); }, []);

    const guardar = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/apertura', { ...form, entorno_id: Number(form.entorno_id) });
            setMsg({ tipo: 'ok', texto: res.data.message });
            setForm((f) => ({ ...f, sigla: '', grupo: '', materia: '', docente_codigo: '', docente_nombre: '' }));
            cargar();
        } catch (err) {
            setMsg({ tipo: 'error', texto: extraerError(err) });
        }
    };

    return (
        <div className="space-y-5">
            <h1 className="text-2xl font-extrabold">Reporte de Apertura e Infraestructura de Aulas (CU3)</h1>
            <AlertBanner msg={msg} onClose={() => setMsg(null)} />

            {puedeEditar && (
                <form onSubmit={guardar} className="themed-card p-5 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <select className="themed-input px-3 py-2 text-sm" value={form.entorno_id} onChange={(e) => setForm({ ...form, entorno_id: e.target.value })} required>
                        {entornos.map((en) => <option key={en.id} value={en.id}>{en.codigo} - {en.nombre}</option>)}
                    </select>
                    <input className="themed-input px-3 py-2 text-sm" placeholder="Gestión (2026-2)" value={form.gestion} onChange={(e) => setForm({ ...form, gestion: e.target.value })} required />
                    <input className="themed-input px-3 py-2 text-sm" placeholder="Facultad (FICCT)" value={form.facultad} onChange={(e) => setForm({ ...form, facultad: e.target.value })} required />
                    <input className="themed-input px-3 py-2 text-sm" placeholder="Carrera" value={form.carrera} onChange={(e) => setForm({ ...form, carrera: e.target.value })} required />
                    <input className="themed-input px-3 py-2 text-sm" placeholder="Sigla (INF413)" value={form.sigla} onChange={(e) => setForm({ ...form, sigla: e.target.value })} required />
                    <input className="themed-input px-3 py-2 text-sm" placeholder="Grupo (SA)" value={form.grupo} onChange={(e) => setForm({ ...form, grupo: e.target.value })} required />
                    <input className="themed-input px-3 py-2 text-sm" placeholder="Materia" value={form.materia} onChange={(e) => setForm({ ...form, materia: e.target.value })} required />
                    <input className="themed-input px-3 py-2 text-sm" placeholder="Cód. Docente" value={form.docente_codigo} onChange={(e) => setForm({ ...form, docente_codigo: e.target.value })} required />
                    <input className="themed-input px-3 py-2 text-sm md:col-span-2" placeholder="Nombre del Docente" value={form.docente_nombre} onChange={(e) => setForm({ ...form, docente_nombre: e.target.value })} required />
                    <select className="themed-input px-3 py-2 text-sm" value={form.estado_apertura} onChange={(e) => setForm({ ...form, estado_apertura: e.target.value })}>
                        <option value="APERTURADA">APERTURADA</option><option value="PENDIENTE">PENDIENTE</option><option value="OBSERVADA">OBSERVADA</option><option value="CERRADA">CERRADA</option>
                    </select>
                    <button type="submit" className="btn-primary px-4 py-2 text-sm font-bold cursor-pointer">Registrar Aula</button>
                </form>
            )}

            <div className="themed-card overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                        <tr className="text-left">
                            <th className="p-3">Entorno</th><th className="p-3">Gestión</th><th className="p-3">Facultad</th><th className="p-3">Curso</th><th className="p-3">Materia</th><th className="p-3">Docente</th><th className="p-3">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((a) => (
                            <tr key={a.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                                <td className="p-3 font-bold">{a.entorno_codigo}</td>
                                <td className="p-3">{a.gestion}</td>
                                <td className="p-3">{a.facultad}</td>
                                <td className="p-3 font-semibold">{a.sigla}-{a.grupo}</td>
                                <td className="p-3">{a.materia}</td>
                                <td className="p-3">{a.docente_nombre}</td>
                                <td className="p-3">{a.estado_apertura}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ===================== CU4: MONITOREO ACADÉMICO =====================
export function MonitoreoView({ puedeEditar }) {
    const [items, setItems] = useState([]);
    const [aulas, setAulas] = useState([]);
    const [msg, setMsg] = useState(null);
    const [form, setForm] = useState({ aula_id: '', inscritos: 50, activos: 45, aprobados: 38, reprobados: 7, promedio_notas: 72 });

    const cargar = () => {
        api.get('/monitoreo').then((r) => setItems(r.data));
        api.get('/apertura').then((r) => {
            setAulas(r.data);
            if (r.data[0] && !form.aula_id) setForm((f) => ({ ...f, aula_id: r.data[0].id }));
        }).catch(() => {});
    };
    useEffect(() => { cargar(); }, []);

    const guardar = async (e) => {
        e.preventDefault();
        if (Number(form.activos) > Number(form.inscritos)) {
            return setMsg({ tipo: 'error', texto: 'Los estudiantes activos no pueden superar a los inscritos.' });
        }
        try {
            const res = await api.post('/monitoreo', {
                aula_id: Number(form.aula_id),
                inscritos: Number(form.inscritos),
                activos: Number(form.activos),
                aprobados: Number(form.aprobados),
                reprobados: Number(form.reprobados),
                promedio_notas: Number(form.promedio_notas),
            });
            setMsg({ tipo: 'ok', texto: res.data.message });
            cargar();
        } catch (err) {
            setMsg({ tipo: 'error', texto: extraerError(err) });
        }
    };

    return (
        <div className="space-y-5">
            <h1 className="text-2xl font-extrabold">Monitoreo de Matrícula, Densidad y Rendimiento (CU4)</h1>
            <AlertBanner msg={msg} onClose={() => setMsg(null)} />

            {puedeEditar && (
                <form onSubmit={guardar} className="themed-card p-5 grid grid-cols-2 md:grid-cols-7 gap-3">
                    <select className="themed-input px-3 py-2 text-sm col-span-2" value={form.aula_id} onChange={(e) => setForm({ ...form, aula_id: e.target.value })}>
                        {aulas.map((a) => <option key={a.id} value={a.id}>{a.sigla}-{a.grupo} ({a.materia})</option>)}
                    </select>
                    <input className="themed-input px-3 py-2 text-sm" type="number" min="0" placeholder="Inscritos" value={form.inscritos} onChange={(e) => setForm({ ...form, inscritos: e.target.value })} required />
                    <input className="themed-input px-3 py-2 text-sm" type="number" min="0" placeholder="Activos" value={form.activos} onChange={(e) => setForm({ ...form, activos: e.target.value })} required />
                    <input className="themed-input px-3 py-2 text-sm" type="number" min="0" placeholder="Aprobados" value={form.aprobados} onChange={(e) => setForm({ ...form, aprobados: e.target.value })} required />
                    <input className="themed-input px-3 py-2 text-sm" type="number" min="0" max="100" step="0.1" placeholder="Promedio" value={form.promedio_notas} onChange={(e) => setForm({ ...form, promedio_notas: e.target.value })} required />
                    <button type="submit" className="btn-primary px-4 py-2 text-sm font-bold cursor-pointer">Registrar</button>
                </form>
            )}

            <div className="themed-card overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                        <tr className="text-left">
                            <th className="p-3">Curso</th><th className="p-3">Facultad</th><th className="p-3">Inscritos</th><th className="p-3">Activos</th><th className="p-3">Aprob.</th><th className="p-3">Reprob.</th><th className="p-3">Promedio</th><th className="p-3">Densidad</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((m) => (
                            <tr key={m.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                                <td className="p-3 font-bold">{m.sigla}-{m.grupo}</td>
                                <td className="p-3">{m.facultad}</td>
                                <td className="p-3">{m.inscritos}</td>
                                <td className="p-3">{m.activos}</td>
                                <td className="p-3">{m.aprobados}</td>
                                <td className="p-3">{m.reprobados}</td>
                                <td className="p-3 font-semibold">{m.promedio_notas}</td>
                                <td className="p-3 font-bold">{m.densidad_pct}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ===================== CU5: DESERCIÓN Y SEMÁFOROS =====================
export function RiesgoView({ puedeEditar }) {
    const [items, setItems] = useState([]);
    const [aulas, setAulas] = useState([]);
    const [msg, setMsg] = useState(null);
    const [form, setForm] = useState({ aula_id: '', total_inscritos: 50, retiros: 10, en_mora: 3, observacion: '' });

    const cargar = () => {
        api.get('/riesgo').then((r) => setItems(r.data));
        api.get('/apertura').then((r) => {
            setAulas(r.data);
            if (r.data[0] && !form.aula_id) setForm((f) => ({ ...f, aula_id: r.data[0].id }));
        }).catch(() => {});
    };
    useEffect(() => { cargar(); }, []);

    const guardar = async (e) => {
        e.preventDefault();
        if (Number(form.retiros) > Number(form.total_inscritos)) {
            return setMsg({ tipo: 'error', texto: 'Los retiros no pueden superar el total de inscritos.' });
        }
        try {
            const res = await api.post('/riesgo', {
                aula_id: Number(form.aula_id),
                total_inscritos: Number(form.total_inscritos),
                retiros: Number(form.retiros),
                en_mora: Number(form.en_mora),
                observacion: form.observacion,
            });
            setMsg({ tipo: 'ok', texto: res.data.message });
            setForm((f) => ({ ...f, observacion: '' }));
            cargar();
        } catch (err) {
            setMsg({ tipo: 'error', texto: extraerError(err) });
        }
    };

    return (
        <div className="space-y-5">
            <h1 className="text-2xl font-extrabold">Evaluación de Deserción y Semáforos de Riesgo (CU5)</h1>
            <AlertBanner msg={msg} onClose={() => setMsg(null)} />

            {puedeEditar && (
                <form onSubmit={guardar} className="themed-card p-5 grid grid-cols-1 md:grid-cols-6 gap-3">
                    <select className="themed-input px-3 py-2 text-sm md:col-span-2" value={form.aula_id} onChange={(e) => setForm({ ...form, aula_id: e.target.value })}>
                        {aulas.map((a) => <option key={a.id} value={a.id}>{a.sigla}-{a.grupo} ({a.materia})</option>)}
                    </select>
                    <input className="themed-input px-3 py-2 text-sm" type="number" min="1" placeholder="Inscritos" value={form.total_inscritos} onChange={(e) => setForm({ ...form, total_inscritos: e.target.value })} required />
                    <input className="themed-input px-3 py-2 text-sm" type="number" min="0" placeholder="Retiros" value={form.retiros} onChange={(e) => setForm({ ...form, retiros: e.target.value })} required />
                    <input className="themed-input px-3 py-2 text-sm" type="number" min="0" placeholder="En Mora" value={form.en_mora} onChange={(e) => setForm({ ...form, en_mora: e.target.value })} required />
                    <button type="submit" className="btn-primary px-4 py-2 text-sm font-bold cursor-pointer">Evaluar Riesgo</button>
                    <input className="themed-input px-3 py-2 text-sm md:col-span-6" placeholder="Observación técnica del analista..." value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} />
                </form>
            )}

            <div className="themed-card overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                        <tr className="text-left">
                            <th className="p-3">Curso</th><th className="p-3">Facultad</th><th className="p-3">Inscritos</th><th className="p-3">Retiros</th><th className="p-3">Mora</th><th className="p-3">Deserción</th><th className="p-3">Semáforo</th><th className="p-3">Observación</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((r) => (
                            <tr key={r.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                                <td className="p-3 font-bold">{r.sigla}-{r.grupo}</td>
                                <td className="p-3">{r.facultad}</td>
                                <td className="p-3">{r.total_inscritos}</td>
                                <td className="p-3">{r.retiros}</td>
                                <td className="p-3">{r.en_mora}</td>
                                <td className="p-3 font-bold">{r.tasa_desercion}%</td>
                                <td className="p-3"><SemaforoBadge valor={r.semaforo} /></td>
                                <td className="p-3 text-xs">{r.observacion || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ===================== CU7: HISTÓRICOS SEMESTRALES =====================
export function HistoricosView() {
    const [items, setItems] = useState([]);
    const [gestA, setGestA] = useState('2025-2');
    const [gestB, setGestB] = useState('2026-2');

    const cargar = (filtrar = false) => {
        const url = filtrar ? `/historicos?gestion_a=${gestA}&gestion_b=${gestB}` : '/historicos';
        api.get(url).then((r) => setItems(r.data));
    };
    useEffect(() => { cargar(false); }, []);

    return (
        <div className="space-y-5">
            <h1 className="text-2xl font-extrabold">Consulta y Comparativa de Históricos Semestrales (CU7)</h1>
            <div className="themed-card p-4 flex flex-wrap gap-3 items-center">
                <input className="themed-input px-3 py-2 text-sm w-32" value={gestA} onChange={(e) => setGestA(e.target.value)} />
                <span className="font-bold">vs</span>
                <input className="themed-input px-3 py-2 text-sm w-32" value={gestB} onChange={(e) => setGestB(e.target.value)} />
                <button onClick={() => cargar(true)} className="btn-primary px-4 py-2 text-sm font-bold cursor-pointer">Comparar</button>
                <button onClick={() => cargar(false)} className="px-4 py-2 text-sm font-semibold rounded-lg border cursor-pointer" style={{ borderColor: 'var(--border-color)' }}>Ver Todos</button>
            </div>
            <div className="themed-card overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                        <tr className="text-left">
                            <th className="p-3">Gestión</th><th className="p-3">Entorno</th><th className="p-3">Facultad</th><th className="p-3">Aulas</th><th className="p-3">Inscritos</th><th className="p-3">Aprobación</th><th className="p-3">Deserción</th><th className="p-3">Promedio</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((h) => (
                            <tr key={h.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                                <td className="p-3 font-bold">{h.gestion}</td>
                                <td className="p-3">{h.entorno_codigo}</td>
                                <td className="p-3">{h.facultad}</td>
                                <td className="p-3">{h.total_aulas}</td>
                                <td className="p-3">{h.total_inscritos}</td>
                                <td className="p-3 font-semibold text-green-600">{h.tasa_aprobacion}%</td>
                                <td className="p-3 font-semibold text-red-600">{h.tasa_desercion}%</td>
                                <td className="p-3 font-bold">{h.promedio_general}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ===================== CU8: REPORTES Y ESTADÍSTICAS =====================
export function ReportesView() {
    const [data, setData] = useState(null);
    useEffect(() => { api.get('/dashboard').then((r) => setData(r.data)); }, []);
    if (!data) return <div className="themed-card p-6">Generando reportes...</div>;

    return (
        <div className="space-y-5">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-extrabold">Reportes y Estadísticas Institucionales (CU8)</h1>
                <button onClick={() => window.print()} className="btn-primary px-4 py-2 text-sm font-bold cursor-pointer">Imprimir / Exportar PDF</button>
            </div>

            <div className="themed-card p-5">
                <h2 className="font-bold text-lg mb-3">Consolidado por Facultad</h2>
                <table className="w-full text-sm">
                    <thead className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                        <tr className="text-left"><th className="p-2">Facultad</th><th className="p-2">Aulas</th><th className="p-2">Inscritos</th><th className="p-2">Promedio</th><th className="p-2">Deserción Media</th></tr>
                    </thead>
                    <tbody>
                        {data.por_facultad.map((f) => (
                            <tr key={f.facultad} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                                <td className="p-2 font-bold">{f.facultad}</td><td className="p-2">{f.aulas}</td><td className="p-2">{f.inscritos}</td><td className="p-2">{f.promedio}</td><td className="p-2">{f.desercion}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="themed-card p-5">
                <h2 className="font-bold text-lg mb-3">Consolidado por Entorno Moodle</h2>
                <table className="w-full text-sm">
                    <thead className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                        <tr className="text-left"><th className="p-2">Código</th><th className="p-2">Entorno</th><th className="p-2">Tipo</th><th className="p-2">Aulas</th><th className="p-2">Inscritos</th><th className="p-2">Promedio</th></tr>
                    </thead>
                    <tbody>
                        {data.por_entorno.map((e) => (
                            <tr key={e.codigo} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                                <td className="p-2 font-bold">{e.codigo}</td><td className="p-2">{e.nombre}</td><td className="p-2">{e.tipo}</td><td className="p-2">{e.aulas}</td><td className="p-2">{e.inscritos}</td><td className="p-2">{e.promedio}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ===================== REQUISITO #10: MÓDULO DE PAGOS ELECTRÓNICOS =====================
export function PagosView() {
    const [data, setData] = useState({ metodos: [], planes: [], transacciones: [] });
    const [msg, setMsg] = useState(null);
    const [metodoForm, setMetodoForm] = useState({ tipo: 'TARJETA', etiqueta: '', ultimos_digitos: '', titular: '', vencimiento: '12/28' });
    const [planForm, setPlanForm] = useState({ concepto: 'Certificación Docente Moodle 5.1', monto_total: 600, cuotas_totales: 3 });
    const [pagoUnico, setPagoUnico] = useState({ metodo_pago_id: '', concepto: 'Arancel Curso Capacitación AVA', monto: 120 });

    const cargar = () => api.get('/pagos').then((r) => {
        setData(r.data);
        if (r.data.metodos[0] && !pagoUnico.metodo_pago_id) {
            setPagoUnico((p) => ({ ...p, metodo_pago_id: r.data.metodos[0].id }));
        }
    });
    useEffect(() => { cargar(); }, []);

    const crearMetodo = async (e) => {
        e.preventDefault();
        try {
            const r = await api.post('/pagos/metodos', metodoForm);
            setMsg({ tipo: 'ok', texto: r.data.message });
            setMetodoForm({ tipo: 'TARJETA', etiqueta: '', ultimos_digitos: '', titular: '', vencimiento: '12/28' });
            cargar();
        } catch (err) { setMsg({ tipo: 'error', texto: extraerError(err) }); }
    };

    const crearPlan = async (e) => {
        e.preventDefault();
        try {
            const r = await api.post('/pagos/planes', { ...planForm, monto_total: Number(planForm.monto_total), cuotas_totales: Number(planForm.cuotas_totales) });
            setMsg({ tipo: 'ok', texto: r.data.message });
            cargar();
        } catch (err) { setMsg({ tipo: 'error', texto: extraerError(err) }); }
    };

    const procesarPago = async (payload) => {
        try {
            const r = await api.post('/pagos/transacciones', payload);
            setMsg({ tipo: 'ok', texto: r.data.message });
            cargar();
        } catch (err) { setMsg({ tipo: 'error', texto: extraerError(err) }); }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-extrabold">Módulo de Pagos Electrónicos (Aranceles y Capacitación DEDTE)</h1>
            <AlertBanner msg={msg} onClose={() => setMsg(null)} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Métodos de pago */}
                <div className="themed-card p-5 space-y-4">
                    <h2 className="font-bold text-lg">1. Métodos de Pago Registrados</h2>
                    <form onSubmit={crearMetodo} className="grid grid-cols-2 gap-2">
                        <select className="themed-input px-3 py-2 text-sm" value={metodoForm.tipo} onChange={(e) => setMetodoForm({ ...metodoForm, tipo: e.target.value })}>
                            <option value="TARJETA">TARJETA</option><option value="QR">QR SIMPLE</option><option value="TRANSFERENCIA">TRANSFERENCIA</option>
                        </select>
                        <input className="themed-input px-3 py-2 text-sm" placeholder="Alias (ej. Visa BCP)" value={metodoForm.etiqueta} onChange={(e) => setMetodoForm({ ...metodoForm, etiqueta: e.target.value })} required />
                        <input className="themed-input px-3 py-2 text-sm" placeholder="Titular" value={metodoForm.titular} onChange={(e) => setMetodoForm({ ...metodoForm, titular: e.target.value })} required />
                        <input className="themed-input px-3 py-2 text-sm" placeholder="Últ. 4 dígitos" value={metodoForm.ultimos_digitos} onChange={(e) => setMetodoForm({ ...metodoForm, ultimos_digitos: e.target.value })} />
                        <button type="submit" className="btn-primary px-4 py-2 text-sm font-bold col-span-2 cursor-pointer">Agregar Método</button>
                    </form>
                    <div className="space-y-2">
                        {data.metodos.map((m) => (
                            <div key={m.id} className="p-3 rounded-lg border flex justify-between text-sm" style={{ borderColor: 'var(--border-color)' }}>
                                <div><strong>{m.etiqueta}</strong> ({m.tipo}) · •••• {m.ultimos_digitos || '0000'}</div>
                                <span className="text-xs opacity-75">{m.titular}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pago único */}
                <div className="themed-card p-5 space-y-4">
                    <h2 className="font-bold text-lg">2. Pago Electrónico Único (Simulado)</h2>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            procesarPago({ metodo_pago_id: Number(pagoUnico.metodo_pago_id), concepto: pagoUnico.concepto, monto: Number(pagoUnico.monto) });
                        }}
                        className="space-y-3"
                    >
                        <select className="themed-input px-3 py-2 text-sm w-full" value={pagoUnico.metodo_pago_id} onChange={(e) => setPagoUnico({ ...pagoUnico, metodo_pago_id: e.target.value })} required>
                            <option value="">Seleccione método de pago...</option>
                            {data.metodos.map((m) => <option key={m.id} value={m.id}>{m.etiqueta} ({m.tipo})</option>)}
                        </select>
                        <input className="themed-input px-3 py-2 text-sm w-full" placeholder="Concepto" value={pagoUnico.concepto} onChange={(e) => setPagoUnico({ ...pagoUnico, concepto: e.target.value })} required />
                        <input className="themed-input px-3 py-2 text-sm w-full" type="number" min="1" step="0.01" placeholder="Monto (Bs)" value={pagoUnico.monto} onChange={(e) => setPagoUnico({ ...pagoUnico, monto: e.target.value })} required />
                        <button type="submit" className="btn-primary px-4 py-2 text-sm font-bold w-full cursor-pointer">Procesar Pago Único</button>
                    </form>
                </div>
            </div>

            {/* Planes de Pago en Cuotas */}
            <div className="themed-card p-5 space-y-4">
                <h2 className="font-bold text-lg">3. Planes de Pago por Cuotas</h2>
                <form onSubmit={crearPlan} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input className="themed-input px-3 py-2 text-sm md:col-span-2" placeholder="Concepto del plan" value={planForm.concepto} onChange={(e) => setPlanForm({ ...planForm, concepto: e.target.value })} required />
                    <input className="themed-input px-3 py-2 text-sm" type="number" min="10" placeholder="Monto Total (Bs)" value={planForm.monto_total} onChange={(e) => setPlanForm({ ...planForm, monto_total: e.target.value })} required />
                    <div className="flex gap-2">
                        <input className="themed-input px-3 py-2 text-sm w-24" type="number" min="2" max="12" value={planForm.cuotas_totales} onChange={(e) => setPlanForm({ ...planForm, cuotas_totales: e.target.value })} required />
                        <button type="submit" className="btn-primary px-4 py-2 text-sm font-bold flex-1 cursor-pointer">Crear Plan</button>
                    </div>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.planes.map((pl) => (
                        <div key={pl.id} className="p-4 rounded-lg border flex justify-between items-center" style={{ borderColor: 'var(--border-color)' }}>
                            <div>
                                <div className="font-bold text-sm">{pl.concepto}</div>
                                <div className="text-xs opacity-80">Total: Bs {pl.monto_total} · Cuotas: {pl.cuotas_pagadas}/{pl.cuotas_totales} · <strong>{pl.estado}</strong></div>
                            </div>
                            {pl.estado !== 'COMPLETADO' && data.metodos[0] && (
                                <button
                                    onClick={() => procesarPago({ metodo_pago_id: Number(pagoUnico.metodo_pago_id || data.metodos[0].id), plan_pago_id: pl.id, concepto: pl.concepto, monto: 1 })}
                                    className="btn-primary px-3 py-1.5 text-xs font-bold cursor-pointer"
                                >
                                    Pagar Cuota #{pl.cuotas_pagadas + 1}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Historial de Transacciones */}
            <div className="themed-card p-5 overflow-x-auto">
                <h2 className="font-bold text-lg mb-3">4. Historial de Transacciones</h2>
                <table className="w-full text-sm">
                    <thead className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                        <tr className="text-left"><th className="p-2">Referencia</th><th className="p-2">Concepto</th><th className="p-2">Tipo</th><th className="p-2">Método</th><th className="p-2">Monto</th><th className="p-2">Estado</th></tr>
                    </thead>
                    <tbody>
                        {data.transacciones.map((t) => (
                            <tr key={t.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                                <td className="p-2 font-mono text-xs">{t.referencia}</td><td className="p-2">{t.concepto}</td><td className="p-2">{t.tipo_pago}</td><td className="p-2">{t.metodo_etiqueta}</td><td className="p-2 font-bold">Bs {t.monto}</td><td className="p-2"><SemaforoBadge valor="VERDE" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ===================== REQUISITO #4: AUDITORÍA Y BITÁCORA =====================
export function BitacoraView() {
    const [data, setData] = useState(null);
    useEffect(() => { api.get('/bitacora').then((r) => setData(r.data)); }, []);
    if (!data) return <div className="themed-card p-6">Cargando bitácora de auditoría...</div>;

    return (
        <div className="space-y-5">
            <h1 className="text-2xl font-extrabold">Auditoría y Bitácora de Seguridad</h1>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="themed-card p-4"><div className="text-xs opacity-75">Logins Exitosos</div><div className="text-2xl font-extrabold text-green-600">{data.resumen.logins_exitosos}</div></div>
                <div className="themed-card p-4"><div className="text-xs opacity-75">Intentos Fallidos</div><div className="text-2xl font-extrabold text-red-600">{data.resumen.logins_fallidos}</div></div>
                <div className="themed-card p-4"><div className="text-xs opacity-75">Accesos Denegados (RBAC)</div><div className="text-2xl font-extrabold text-amber-600">{data.resumen.accesos_denegados}</div></div>
                <div className="themed-card p-4"><div className="text-xs opacity-75">Total Eventos</div><div className="text-2xl font-extrabold">{data.resumen.total_eventos}</div></div>
            </div>

            <BarChartSimple titulo="Recursos con Mayor Índice de Acceso" items={data.top_recursos} labelKey="recurso" valueKey="accesos" suffix=" reqs" />

            <div className="themed-card overflow-x-auto">
                <table className="w-full text-xs">
                    <thead className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                        <tr className="text-left"><th className="p-2.5">Fecha</th><th className="p-2.5">Actor</th><th className="p-2.5">Acción</th><th className="p-2.5">Recurso</th><th className="p-2.5">IP</th><th className="p-2.5">Estado</th><th className="p-2.5">Detalle</th></tr>
                    </thead>
                    <tbody>
                        {data.logs.map((l) => (
                            <tr key={l.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                                <td className="p-2.5">{l.created_at}</td><td className="p-2.5 font-semibold">{l.actor}</td><td className="p-2.5">{l.accion}</td><td className="p-2.5 font-mono">{l.recurso}</td><td className="p-2.5">{l.ip}</td>
                                <td className="p-2.5"><SemaforoBadge valor={l.exito ? 'VERDE' : 'ROJO'} /></td><td className="p-2.5">{l.detalle}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ===================== CU1: ADMINISTRACIÓN =====================
export function AdminView() {
    const [data, setData] = useState({ usuarios: [], roles: [], parametros: [] });
    const [msg, setMsg] = useState(null);
    const [uForm, setUForm] = useState({ ci: '', nombre: '', apellido: '', email: '', password: '', rol_id: '', telefono: '' });

    const cargar = () => api.get('/admin').then((r) => {
        setData(r.data);
        if (r.data.roles[0] && !uForm.rol_id) setUForm((f) => ({ ...f, rol_id: r.data.roles[0].id }));
    });
    useEffect(() => { cargar(); }, []);

    const crearUsuario = async (e) => {
        e.preventDefault();
        try {
            const r = await api.post('/admin/usuarios', { ...uForm, rol_id: Number(uForm.rol_id) });
            setMsg({ tipo: 'ok', texto: r.data.message });
            setUForm((f) => ({ ...f, ci: '', nombre: '', apellido: '', email: '', password: '', telefono: '' }));
            cargar();
        } catch (err) { setMsg({ tipo: 'error', texto: extraerError(err) }); }
    };

    const editarParam = async (id, valorActual) => {
        const nuevo = window.prompt('Ingrese el nuevo valor del parámetro:', valorActual);
        if (nuevo === null || !nuevo.trim()) return;
        try {
            const r = await api.put(`/admin/parametros/${id}`, { valor: nuevo.trim() });
            setMsg({ tipo: 'ok', texto: r.data.message });
            cargar();
        } catch (err) { setMsg({ tipo: 'error', texto: extraerError(err) }); }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-extrabold">Administración del Sistema: Usuarios, Roles y Parámetros (CU1)</h1>
            <AlertBanner msg={msg} onClose={() => setMsg(null)} />

            <form onSubmit={crearUsuario} className="themed-card p-5 grid grid-cols-1 md:grid-cols-4 gap-3">
                <input className="themed-input px-3 py-2 text-sm" placeholder="CI / Registro" value={uForm.ci} onChange={(e) => setUForm({ ...uForm, ci: e.target.value })} required />
                <input className="themed-input px-3 py-2 text-sm" placeholder="Nombre" value={uForm.nombre} onChange={(e) => setUForm({ ...uForm, nombre: e.target.value })} required />
                <input className="themed-input px-3 py-2 text-sm" placeholder="Apellido" value={uForm.apellido} onChange={(e) => setUForm({ ...uForm, apellido: e.target.value })} required />
                <input className="themed-input px-3 py-2 text-sm" type="email" placeholder="Correo institucional" value={uForm.email} onChange={(e) => setUForm({ ...uForm, email: e.target.value })} required />
                <input className="themed-input px-3 py-2 text-sm" type="password" minLength={6} placeholder="Contraseña (mín. 6)" value={uForm.password} onChange={(e) => setUForm({ ...uForm, password: e.target.value })} required />
                <select className="themed-input px-3 py-2 text-sm" value={uForm.rol_id} onChange={(e) => setUForm({ ...uForm, rol_id: e.target.value })}>
                    {data.roles.map((r) => <option key={r.id} value={r.id}>{r.codigo} - {r.nombre}</option>)}
                </select>
                <input className="themed-input px-3 py-2 text-sm" placeholder="Teléfono" value={uForm.telefono} onChange={(e) => setUForm({ ...uForm, telefono: e.target.value })} />
                <button type="submit" className="btn-primary px-4 py-2 text-sm font-bold cursor-pointer">Crear Usuario</button>
            </form>

            <div className="themed-card p-5 overflow-x-auto">
                <h2 className="font-bold text-lg mb-3">Usuarios Registrados</h2>
                <table className="w-full text-sm">
                    <thead className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                        <tr className="text-left"><th className="p-2">CI</th><th className="p-2">Nombre</th><th className="p-2">Email</th><th className="p-2">Rol</th><th className="p-2">Estado</th></tr>
                    </thead>
                    <tbody>
                        {data.usuarios.map((u) => (
                            <tr key={u.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                                <td className="p-2">{u.ci}</td><td className="p-2 font-semibold">{u.nombre} {u.apellido}</td><td className="p-2">{u.email}</td><td className="p-2 font-bold">{u.rol_codigo}</td><td className="p-2">{u.estado}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="themed-card p-5">
                <h2 className="font-bold text-lg mb-3">Parámetros y Umbrales del Sistema</h2>
                <div className="space-y-2">
                    {data.parametros.map((p) => (
                        <div key={p.id} className="p-3 rounded-lg border flex justify-between items-center text-sm" style={{ borderColor: 'var(--border-color)' }}>
                            <div><strong>{p.clave}</strong>: <span className="font-mono font-bold">{p.valor}</span> — <span className="opacity-75">{p.descripcion}</span></div>
                            <button onClick={() => editarParam(p.id, p.valor)} className="btn-primary px-3 py-1 text-xs font-bold cursor-pointer">Editar</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
