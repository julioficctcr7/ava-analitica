import React, { useEffect, useState } from 'react';
import {
    LayoutDashboard, Server, BookOpen, Activity, AlertTriangle, History,
    BarChart3, CreditCard, ShieldCheck, Settings, Search, Sun, Moon,
    Contrast, LogOut, Eye, Sparkles, Clock
} from 'lucide-react';
import api, { extraerError } from './api';
import {
    DashboardView, EntornosView, AperturaView, MonitoreoView, RiesgoView,
    HistoricosView, ReportesView, PagosView, BitacoraView, AdminView
} from './pages/Modules';

const ICONOS = {
    LayoutDashboard, Server, BookOpen, Activity, AlertTriangle, History,
    BarChart3, CreditCard, ShieldCheck, Settings,
};

function calcularModoAuto() {
    const hora = new Date().getHours();
    return (hora >= 18 || hora < 6) ? 'noche' : 'dia';
}

export default function App() {
    const [session, setSession] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [ruta, setRuta] = useState('/dashboard');

    // Temas (Niños / Jóvenes / Adultos) + Día/Noche/Auto + Accesibilidad WCAG
    const [tema, setTema] = useState(() => localStorage.getItem('dedte_tema') || 'adultos');
    const [modoPref, setModoPref] = useState(() => localStorage.getItem('dedte_modo') || 'auto');
    const [contraste, setContraste] = useState(() => localStorage.getItem('dedte_contraste') || 'normal');
    const [escalaFuente, setEscalaFuente] = useState(() => Number(localStorage.getItem('dedte_fuente') || 100));

    // Búsqueda global en Header
    const [busqueda, setBusqueda] = useState('');
    const [resultados, setResultados] = useState([]);

    // Contador de visitas persistente (Footer obligatorio)
    const [visitas, setVisitas] = useState({ visitas: 0, total_sitio: 0 });

    // Login state
    const [email, setEmail] = useState('admin@dedte.uagrm.edu.bo');
    const [password, setPassword] = useState('12345678');
    const [loginErr, setLoginErr] = useState('');

    // Aplicar atributos globales de tema, modo y accesibilidad
    useEffect(() => {
        const modoEfectivo = modoPref === 'auto' ? calcularModoAuto() : modoPref;
        document.documentElement.setAttribute('data-theme', tema);
        document.documentElement.setAttribute('data-mode', modoEfectivo);
        document.documentElement.setAttribute('data-contrast', contraste);
        document.documentElement.style.fontSize = `${escalaFuente}%`;
        localStorage.setItem('dedte_tema', tema);
        localStorage.setItem('dedte_modo', modoPref);
        localStorage.setItem('dedte_contraste', contraste);
        localStorage.setItem('dedte_fuente', String(escalaFuente));
    }, [tema, modoPref, contraste, escalaFuente]);

    // Restaurar sesión si existe token
    useEffect(() => {
        const token = localStorage.getItem('dedte_token');
        if (!token) {
            setCargando(false);
            return;
        }
        api.get('/auth/me')
            .then((r) => setSession(r.data))
            .catch(() => localStorage.removeItem('dedte_token'))
            .finally(() => setCargando(false));
    }, []);

    // Registrar visita persistente cada vez que cambia la vista
    useEffect(() => {
        const rutaActual = session ? ruta : '/login';
        const tituloActual = session
            ? (session.menu.find((m) => m.ruta === ruta)?.titulo || ruta)
            : 'Inicio de Sesión';
        api.post('/visitas/registrar', { ruta: rutaActual, titulo: tituloActual })
            .then((r) => setVisitas(r.data))
            .catch(() => {});
    }, [ruta, session]);

    // Búsqueda global predictiva
    useEffect(() => {
        if (!session || busqueda.trim().length < 2) {
            setResultados([]);
            return;
        }
        const t = setTimeout(() => {
            api.get(`/buscar?q=${encodeURIComponent(busqueda.trim())}`)
                .then((r) => setResultados(r.data.resultados || []))
                .catch(() => {});
        }, 250);
        return () => clearTimeout(t);
    }, [busqueda, session]);

    const iniciarSesion = async (e, credOverride = null) => {
        if (e) e.preventDefault();
        setLoginErr('');
        const body = credOverride || { email, password };
        if (!body.email || !body.password) {
            return setLoginErr('Debe ingresar su correo electrónico y contraseña.');
        }
        try {
            const res = await api.post('/auth/login', body);
            localStorage.setItem('dedte_token', res.data.token);
            setSession(res.data);
            setRuta(res.data.menu[0]?.ruta || '/dashboard');
        } catch (err) {
            setLoginErr(extraerError(err));
        }
    };

    const cerrarSesion = async () => {
        try { await api.post('/auth/logout'); } catch {}
        localStorage.removeItem('dedte_token');
        setSession(null);
    };

    const tienePermiso = (perm) => (session?.permisos || []).includes(perm);

    if (cargando) {
        return <div className="min-h-screen flex items-center justify-center font-bold">Cargando DEDTE Analytics UAGRM...</div>;
    }

    // ===================== PANTALLA DE LOGIN =====================
    if (!session) {
        const demos = [
            { label: 'Admin (Total)', email: 'admin@dedte.uagrm.edu.bo' },
            { label: 'Directivo', email: 'directivo@dedte.uagrm.edu.bo' },
            { label: 'Analista', email: 'analista@dedte.uagrm.edu.bo' },
            { label: 'Docente', email: 'docente@dedte.uagrm.edu.bo' },
        ];
        return (
            <div className="min-h-screen flex flex-col justify-between p-4">
                <div className="flex justify-end gap-2 flex-wrap">
                    <select className="themed-input px-2 py-1 text-xs" value={tema} onChange={(e) => setTema(e.target.value)} aria-label="Selector de tema">
                        <option value="adultos">Tema: Adultos (Institucional)</option>
                        <option value="jovenes">Tema: Jóvenes (Moderno)</option>
                        <option value="ninos">Tema: Niños (Lúdico)</option>
                    </select>
                    <button onClick={() => setModoPref(modoPref === 'noche' ? 'dia' : 'noche')} className="themed-input px-2.5 py-1 text-xs font-semibold cursor-pointer">
                        {modoPref === 'noche' ? '☀️ Día' : '🌙 Noche'}
                    </button>
                    <button onClick={() => setContraste(contraste === 'alto' ? 'normal' : 'alto')} className="themed-input px-2.5 py-1 text-xs font-semibold cursor-pointer">
                        Alto Contraste
                    </button>
                </div>

                <div className="max-w-md w-full mx-auto themed-card p-8 shadow-xl my-8">
                    <div className="text-center mb-6">
                        <div className="text-xs font-bold tracking-widest uppercase opacity-70">UAGRM · FICCT · INF513 · GRUPO #11 SA</div>
                        <h1 className="text-2xl font-extrabold mt-1" style={{ color: 'var(--accent)' }}>DEDTE Analytics AVA</h1>
                        <p className="text-sm opacity-75 mt-1">Plataforma Web de Analítica y Monitoreo Moodle (3 Capas)</p>
                    </div>

                    {loginErr && (
                        <div className="mb-4 p-3 rounded-lg text-sm font-medium bg-red-50 text-red-800 border border-red-400">
                            {loginErr}
                        </div>
                    )}

                    <form onSubmit={iniciarSesion} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold mb-1">Correo Institucional</label>
                            <input className="themed-input w-full px-3 py-2 text-sm" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">Contraseña</label>
                            <input className="themed-input w-full px-3 py-2 text-sm" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                        <button type="submit" className="btn-primary w-full py-2.5 font-bold text-sm cursor-pointer">
                            Iniciar Sesión
                        </button>
                    </form>

                    <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                        <div className="text-xs font-bold opacity-75 mb-2">Acceso rápido por Rol RBAC (clave: 12345678):</div>
                        <div className="grid grid-cols-2 gap-2">
                            {demos.map((d) => (
                                <button
                                    key={d.email}
                                    type="button"
                                    onClick={() => iniciarSesion(null, { email: d.email, password: '12345678' })}
                                    className="themed-input px-2 py-1.5 text-xs font-semibold hover:opacity-80 cursor-pointer"
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer obligatorio con contador de visitas */}
                <footer className="themed-card px-5 py-3 text-xs flex flex-wrap justify-between items-center gap-2">
                    <span>UAGRM · FICCT · INF513 Grupo #11 SA (Kelly Duran · Julio Quispe)</span>
                    <span className="font-bold flex items-center gap-1.5">
                        <Eye size={14} /> Visitas en esta página: {visitas.visitas} · Total del sitio: {visitas.total_sitio}
                    </span>
                </footer>
            </div>
        );
    }

    // ===================== APLICACIÓN AUTENTICADA =====================
    const renderVista = () => {
        switch (ruta) {
            case '/dashboard':  return <DashboardView />;
            case '/entornos':   return <EntornosView puedeEditar={tienePermiso('entornos.editar')} />;
            case '/apertura':   return <AperturaView puedeEditar={tienePermiso('apertura.editar')} />;
            case '/monitoreo':  return <MonitoreoView puedeEditar={tienePermiso('monitoreo.editar')} />;
            case '/riesgo':     return <RiesgoView puedeEditar={tienePermiso('riesgo.editar')} />;
            case '/historicos': return <HistoricosView />;
            case '/reportes':   return <ReportesView />;
            case '/pagos':      return <PagosView />;
            case '/bitacora':   return <BitacoraView />;
            case '/admin':      return <AdminView />;
            default:            return <DashboardView />;
        }
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row">
            {/* Sidebar Dinámico desde Base de Datos (RBAC) */}
            <aside className="w-full md:w-64 text-white flex flex-col shrink-0" style={{ backgroundColor: 'var(--bg-sidebar)' }}>
                <div className="p-5 border-b border-white/10">
                    <div className="text-[10px] uppercase tracking-widest opacity-70">UAGRM · DEDTE · G11</div>
                    <div className="text-lg font-extrabold mt-0.5">DEDTE Analytics</div>
                    <div className="mt-2 inline-block px-2 py-0.5 text-[11px] rounded-full bg-white/15 font-semibold">
                        Rol: {session.usuario.rol_codigo}
                    </div>
                </div>

                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {session.menu.map((item) => {
                        const Icon = ICONOS[item.icono] || LayoutDashboard;
                        const active = ruta === item.ruta;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setRuta(item.ruta)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                                    active ? 'bg-white/20 text-white font-bold' : 'text-white/80 hover:bg-white/10'
                                }`}
                            >
                                <Icon size={17} />
                                <span>{item.titulo}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/10 text-xs">
                    <div className="font-bold truncate">{session.usuario.nombre} {session.usuario.apellido}</div>
                    <div className="opacity-70 truncate mb-3">{session.usuario.email}</div>
                    <button onClick={cerrarSesion} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-red-600/90 hover:bg-red-600 text-white font-bold cursor-pointer">
                        <LogOut size={14} /> Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Contenido Principal + Header (Búsqueda Global + Temas + Accesibilidad) + Footer */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="themed-card rounded-none border-x-0 border-t-0 px-5 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20">
                    {/* Requisito #9: Búsqueda Global en Header */}
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <Search size={16} className="absolute left-3 top-2.5 opacity-60" />
                        <input
                            type="text"
                            className="themed-input w-full pl-9 pr-3 py-1.5 text-sm"
                            placeholder="Búsqueda global: aulas, entornos, usuarios, riesgo..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                        {resultados.length > 0 && (
                            <div className="themed-card absolute left-0 right-0 mt-1 shadow-xl z-30 max-h-72 overflow-y-auto">
                                {resultados.map((res, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => { setRuta(res.ruta); setBusqueda(''); setResultados([]); }}
                                        className="w-full text-left px-3 py-2 border-b hover:opacity-80 cursor-pointer"
                                        style={{ borderColor: 'var(--border-color)' }}
                                    >
                                        <div className="text-[11px] font-bold" style={{ color: 'var(--accent)' }}>{res.tipo}</div>
                                        <div className="text-sm font-semibold">{res.titulo}</div>
                                        <div className="text-xs opacity-75">{res.subtitulo}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Requisito #5: 3 Temas + Día/Noche/Auto + Accesibilidad WCAG */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <div className="flex items-center gap-1">
                            <Sparkles size={14} />
                            <select className="themed-input px-2 py-1" value={tema} onChange={(e) => setTema(e.target.value)} aria-label="Tema por segmento">
                                <option value="adultos">Adultos</option>
                                <option value="jovenes">Jóvenes</option>
                                <option value="ninos">Niños</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-1">
                            <button onClick={() => setModoPref('dia')} className={`themed-input px-2 py-1 cursor-pointer ${modoPref === 'dia' ? 'font-extrabold underline' : ''}`} title="Modo Día"><Sun size={14} /></button>
                            <button onClick={() => setModoPref('noche')} className={`themed-input px-2 py-1 cursor-pointer ${modoPref === 'noche' ? 'font-extrabold underline' : ''}`} title="Modo Noche"><Moon size={14} /></button>
                            <button onClick={() => setModoPref('auto')} className={`themed-input px-2 py-1 cursor-pointer flex items-center gap-1 ${modoPref === 'auto' ? 'font-extrabold underline' : ''}`} title="Automático según horario"><Clock size={13} /> Auto</button>
                        </div>

                        <div className="flex items-center gap-1">
                            <button onClick={() => setEscalaFuente((s) => Math.max(90, s - 10))} className="themed-input px-2 py-1 font-bold cursor-pointer" title="Reducir fuente">A-</button>
                            <span className="font-mono">{escalaFuente}%</span>
                            <button onClick={() => setEscalaFuente((s) => Math.min(130, s + 10))} className="themed-input px-2 py-1 font-bold cursor-pointer" title="Aumentar fuente">A+</button>
                        </div>

                        <button
                            onClick={() => setContraste(contraste === 'alto' ? 'normal' : 'alto')}
                            className="themed-input px-2.5 py-1 font-bold flex items-center gap-1 cursor-pointer"
                            title="Alternar Alto Contraste WCAG"
                        >
                            <Contrast size={14} /> {contraste === 'alto' ? 'Normal' : 'Contraste'}
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-5 md:p-6">
                    {renderVista()}
                </main>

                {/* Requisito #7: Contador de Visitas Persistente en Footer */}
                <footer className="themed-card rounded-none border-x-0 border-b-0 px-5 py-3 text-xs flex flex-wrap justify-between items-center gap-2">
                    <span><strong>DEDTE Analytics UAGRM</strong> · INF513 Proyecto Final (Laravel + React API RESTful) · Grupo #11 SA</span>
                    <span className="font-bold flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
                        <Eye size={14} /> Visitas en esta vista ({ruta}): {visitas.visitas} · Total acumulado del sitio: {visitas.total_sitio}
                    </span>
                </footer>
            </div>
        </div>
    );
}
