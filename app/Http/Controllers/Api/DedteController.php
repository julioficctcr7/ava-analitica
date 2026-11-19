<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DedteController extends Controller
{
    private function registrarBitacora(Request $request, string $accion, string $detalle = ''): void
    {
        $u = $request->attributes->get('auth_user');
        DB::table('bitacora_auditoria')->insert([
            'usuario_id'    => $u?->id,
            'email_intento' => $u?->email,
            'accion'        => $accion,
            'recurso'       => '/' . ltrim($request->path(), '/'),
            'metodo'        => $request->method(),
            'ip'            => $request->ip(),
            'exito'         => true,
            'detalle'       => $detalle,
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);
    }

    // ===================== CONTADOR DE VISITAS (FOOTER) =====================
    public function registrarVisita(Request $request)
    {
        $data = $request->validate([
            'ruta'   => ['required', 'string', 'max:120'],
            'titulo' => ['nullable', 'string', 'max:120'],
        ], [
            'ruta.required' => 'La ruta de la página es obligatoria.',
        ]);

        $ruta = $data['ruta'];
        $titulo = $data['titulo'] ?? $ruta;
        $row = DB::table('visitas_pagina')->where('ruta', $ruta)->first();

        if ($row) {
            DB::table('visitas_pagina')->where('id', $row->id)->update([
                'contador'   => $row->contador + 1,
                'titulo'     => $titulo,
                'updated_at' => now(),
            ]);
            $actual = $row->contador + 1;
        } else {
            DB::table('visitas_pagina')->insert([
                'ruta'       => $ruta,
                'titulo'     => $titulo,
                'contador'   => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $actual = 1;
        }

        $totalSitio = (int) DB::table('visitas_pagina')->sum('contador');

        return response()->json([
            'ruta'        => $ruta,
            'visitas'     => $actual,
            'total_sitio' => $totalSitio,
        ]);
    }

    // ===================== BÚSQUEDA GLOBAL (HEADER) =====================
    public function busquedaGlobal(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        if (mb_strlen($q) < 2) {
            return response()->json(['resultados' => []]);
        }

        $like = '%' . strtolower($q) . '%';
        $resultados = [];

        $aulas = DB::table('aulas_apertura')
            ->whereRaw('LOWER(sigla) LIKE ? OR LOWER(materia) LIKE ? OR LOWER(docente_nombre) LIKE ? OR LOWER(facultad) LIKE ?', [$like, $like, $like, $like])
            ->limit(5)->get();
        foreach ($aulas as $a) {
            $resultados[] = ['tipo' => 'Aula (CU3)', 'titulo' => "{$a->sigla}-{$a->grupo} · {$a->materia}", 'subtitulo' => "{$a->facultad} · {$a->docente_nombre}", 'ruta' => '/apertura'];
        }

        $entornos = DB::table('entornos_moodle')
            ->whereRaw('LOWER(codigo) LIKE ? OR LOWER(nombre) LIKE ? OR LOWER(tipo) LIKE ?', [$like, $like, $like])
            ->limit(4)->get();
        foreach ($entornos as $e) {
            $resultados[] = ['tipo' => 'Entorno Moodle (CU2)', 'titulo' => "{$e->codigo} · {$e->nombre}", 'subtitulo' => "{$e->tipo} · {$e->estado_conexion}", 'ruta' => '/entornos'];
        }

        $usuarios = DB::table('usuarios_dedte')
            ->whereRaw('LOWER(nombre) LIKE ? OR LOWER(apellido) LIKE ? OR LOWER(email) LIKE ? OR LOWER(ci) LIKE ?', [$like, $like, $like, $like])
            ->limit(4)->get();
        foreach ($usuarios as $u) {
            $resultados[] = ['tipo' => 'Usuario (CU1)', 'titulo' => "{$u->nombre} {$u->apellido}", 'subtitulo' => $u->email, 'ruta' => '/admin'];
        }

        $riesgos = DB::table('evaluacion_riesgo as r')
            ->join('aulas_apertura as a', 'a.id', '=', 'r.aula_id')
            ->select('r.*', 'a.sigla', 'a.grupo', 'a.materia')
            ->whereRaw('LOWER(r.semaforo) LIKE ? OR LOWER(r.observacion) LIKE ? OR LOWER(a.sigla) LIKE ?', [$like, $like, $like])
            ->limit(4)->get();
        foreach ($riesgos as $r) {
            $resultados[] = ['tipo' => 'Riesgo (CU5)', 'titulo' => "{$r->sigla}-{$r->grupo} · Semáforo {$r->semaforo}", 'subtitulo' => "Deserción: {$r->tasa_desercion}%", 'ruta' => '/riesgo'];
        }

        return response()->json(['resultados' => $resultados]);
    }

    // ===================== CU6 & CU8: DASHBOARD 360° + FILTROS MULTI-DIMENSIONALES =====================
    public function dashboard(Request $request)
    {
        $facultad  = $request->query('facultad');
        $carrera   = $request->query('carrera');
        $gestion   = $request->query('gestion');
        $nivel     = $request->query('nivel');
        $entornoId = $request->query('entorno_id');

        $base = DB::table('aulas_apertura as a')
            ->join('entornos_moodle as e', 'e.id', '=', 'a.entorno_id')
            ->leftJoin('monitoreo_academico as m', 'm.aula_id', '=', 'a.id')
            ->leftJoin('evaluacion_riesgo as r', 'r.aula_id', '=', 'a.id')
            ->select(
                'a.id', 'a.entorno_id', 'e.codigo as entorno_codigo', 'e.nombre as entorno_nombre',
                'a.gestion', 'a.facultad', 'a.carrera', 'a.nivel', 'a.sigla', 'a.grupo', 'a.materia',
                'a.docente_nombre', 'a.formato_curso', 'a.carpeta_pedagogica', 'a.estado_apertura', 'a.tareas_semanales',
                DB::raw('COALESCE(m.inscritos, 0) as inscritos'),
                DB::raw('COALESCE(m.activos, 0) as activos'),
                DB::raw('COALESCE(m.aprobados, 0) as aprobados'),
                DB::raw('COALESCE(m.reprobados, 0) as reprobados'),
                DB::raw('COALESCE(m.segunda_instancia, 0) as segunda_instancia'),
                DB::raw('COALESCE(m.sin_nota, 0) as sin_nota'),
                DB::raw('COALESCE(m.promedio_notas, 0) as promedio_notas'),
                DB::raw('COALESCE(m.promedio_aprobados, 70) as promedio_aprobados'),
                DB::raw('COALESCE(m.densidad_pct, 0) as densidad_pct'),
                DB::raw('COALESCE(r.retiros, 0) as retiros'),
                DB::raw('COALESCE(r.retiros_formales, 0) as retiros_formales'),
                DB::raw('COALESCE(r.alertas_7d, 0) as alertas_7d'),
                DB::raw('COALESCE(r.alertas_14d, 0) as alertas_14d'),
                DB::raw('COALESCE(r.alertas_21d, 0) as alertas_21d'),
                DB::raw('COALESCE(r.tasa_desercion, 0) as tasa_desercion'),
                DB::raw("COALESCE(r.semaforo, 'VERDE') as semaforo"),
                'r.observacion'
            );

        if ($facultad && $facultad !== 'TODAS') {
            $base->where('a.facultad', $facultad);
        }
        if ($carrera && $carrera !== 'TODAS') {
            $base->where('a.carrera', $carrera);
        }
        if ($gestion && $gestion !== 'TODAS') {
            $base->where('a.gestion', $gestion);
        }
        if ($nivel && $nivel !== 'TODOS') {
            $base->where('a.nivel', (int) $nivel);
        }
        if ($entornoId && $entornoId !== 'TODOS') {
            $base->where('a.entorno_id', (int) $entornoId);
        }

        $materias = $base->orderBy('a.carrera')->orderBy('a.sigla')->orderBy('a.grupo')->get();

        $totalAulas    = $materias->count();
        $totalInsc     = (int) $materias->sum('inscritos');
        $totalAprob    = (int) $materias->sum('aprobados');
        $totalRepro    = (int) $materias->sum('reprobados');
        $total2da      = (int) $materias->sum('segunda_instancia');
        $totalDeserc   = (int) $materias->sum('retiros');
        $totalRetForm  = (int) $materias->sum('retiros_formales');
        $totalAl7      = (int) $materias->sum('alertas_7d');
        $totalAl14     = (int) $materias->sum('alertas_14d');
        $totalAl21     = (int) $materias->sum('alertas_21d');

        $tasaAprob     = $totalInsc > 0 ? round(($totalAprob * 100) / $totalInsc, 2) : 0;
        $tasaRepro     = $totalInsc > 0 ? round(($totalRepro * 100) / $totalInsc, 2) : 0;
        $tasa2da       = $totalInsc > 0 ? round(($total2da * 100) / $totalInsc, 2) : 0;
        $tasaDeserc    = $totalInsc > 0 ? round(($totalDeserc * 100) / $totalInsc, 2) : 0;
        $promGeneral   = $totalAulas > 0 ? round((float) $materias->avg('promedio_notas'), 1) : 0;
        $promAprob     = $totalAulas > 0 ? round((float) $materias->avg('promedio_aprobados'), 1) : 0;
        $cargaMedia    = $totalAulas > 0 ? round($totalInsc / $totalAulas, 1) : 0;
        $aulasSobrec   = $materias->where('inscritos', '>', 40)->count();

        $kpis = [
            'total_aulas'       => $totalAulas,
            'total_entornos'    => DB::table('entornos_moodle')->count(),
            'total_inscritos'   => $totalInsc,
            'total_activos'     => (int) $materias->sum('activos'),
            'total_aprobados'   => $totalAprob,
            'total_reprobados'  => $totalRepro,
            'tasa_aprobacion'   => $tasaAprob,
            'tasa_reprobacion'  => $tasaRepro,
            'segunda_instancia' => $total2da,
            'tasa_segunda_inst' => $tasa2da,
            'total_desercion'   => $totalDeserc,
            'retiros_formales'  => $totalRetForm,
            'tasa_desercion'    => $tasaDeserc,
            'alertas_7d'        => $totalAl7,
            'alertas_14d'       => $totalAl14,
            'alertas_21d'       => $totalAl21,
            'promedio_global'   => $promGeneral,
            'promedio_aprobados'=> $promAprob,
            'carga_media'       => $cargaMedia,
            'aulas_sobrecarga'  => $aulasSobrec,
            'desercion_media'   => $tasaDeserc,
            'semaforo_verde'    => $materias->where('semaforo', 'VERDE')->count(),
            'semaforo_amarillo' => $materias->where('semaforo', 'AMARILLO')->count(),
            'semaforo_rojo'     => $materias->where('semaforo', 'ROJO')->count(),
            'total_pagos_bs'    => round((float) DB::table('pagos_transacciones')->where('estado', 'PAGADO')->sum('monto'), 2),
        ];

        // Radar Pentagonal 360° (Diagnóstico en Vivo vs Ideal ICU 053/2023)
        $radar = [
            ['eje' => 'Infraestructura',     'actual' => 100, 'ideal' => 100],
            ['eje' => 'Retención Activa',    'actual' => max(0, round(100 - $tasaDeserc, 1)), 'ideal' => 90],
            ['eje' => 'Calidad de Notas',    'actual' => min(100, round($promAprob, 1)), 'ideal' => 80],
            ['eje' => 'Aulas Mosaico 5.1',   'actual' => 100, 'ideal' => 100],
            ['eje' => 'Tasa Aprobación',     'actual' => $tasaAprob, 'ideal' => 80],
        ];

        // Benchmarking Docente entre Paralelos (materias con la misma sigla y distintos grupos)
        $benchmarking = [];
        foreach ($materias->groupBy('sigla') as $sigla => $grupos) {
            if ($grupos->count() >= 2) {
                $ordenados = $grupos->sortByDesc(fn ($g) => $g->inscritos > 0 ? ($g->aprobados / $g->inscritos) : 0)->values();
                $a = $ordenados[0];
                $b = $ordenados[1];
                $pctA = $a->inscritos > 0 ? round(($a->aprobados * 100) / $a->inscritos, 1) : 0;
                $pctB = $b->inscritos > 0 ? round(($b->aprobados * 100) / $b->inscritos, 1) : 0;
                $benchmarking[] = [
                    'sigla'   => $sigla,
                    'materia' => $a->materia,
                    'brecha'  => round(abs($pctA - $pctB), 1),
                    'grupo_a' => ['grupo' => $a->grupo, 'docente' => $a->docente_nombre, 'aprob_pct' => $pctA, 'prom' => $a->promedio_notas],
                    'grupo_b' => ['grupo' => $b->grupo, 'docente' => $b->docente_nombre, 'aprob_pct' => $pctB, 'prom' => $b->promedio_notas],
                ];
            }
        }

        // Correlación Carga Operativa (tareas/semana) vs % Deserción
        $correlacion = $materias->groupBy('tareas_semanales')->map(function ($g, $tareas) {
            return ['tareas' => (int) $tareas, 'desercion' => round((float) $g->avg('tasa_desercion'), 1), 'aulas' => $g->count()];
        })->sortBy('tareas')->values();

        // Filtros disponibles para los selects
        $filtros = [
            'entornos'   => DB::table('entornos_moodle')->select('id', 'codigo', 'nombre')->orderBy('id')->get(),
            'facultades' => DB::table('aulas_apertura')->distinct()->orderBy('facultad')->pluck('facultad'),
            'carreras'   => DB::table('aulas_apertura')->distinct()->orderBy('carrera')->pluck('carrera'),
            'gestiones'  => DB::table('aulas_apertura')->distinct()->orderByDesc('gestion')->pluck('gestion'),
            'niveles'    => DB::table('aulas_apertura')->distinct()->orderBy('nivel')->pluck('nivel'),
        ];

        $porFacultad = $materias->groupBy('facultad')->map(function ($g, $fac) {
            $insc = (int) $g->sum('inscritos');
            $aprob = (int) $g->sum('aprobados');
            return [
                'facultad'   => $fac,
                'aulas'      => $g->count(),
                'inscritos'  => $insc,
                'aprobados'  => $aprob,
                'promedio'   => round((float) $g->avg('promedio_notas'), 2),
                'desercion'  => round((float) $g->avg('tasa_desercion'), 2),
            ];
        })->values();

        $porEntorno = DB::table('entornos_moodle as e')
            ->leftJoin('aulas_apertura as a', 'a.entorno_id', '=', 'e.id')
            ->leftJoin('monitoreo_academico as m', 'm.aula_id', '=', 'a.id')
            ->select(
                'e.codigo', 'e.nombre', 'e.tipo', 'e.estado_conexion',
                DB::raw('COUNT(DISTINCT a.id) as aulas'),
                DB::raw('COALESCE(SUM(m.inscritos), 0) as inscritos'),
                DB::raw('ROUND(COALESCE(AVG(m.promedio_notas), 0), 2) as promedio')
            )
            ->groupBy('e.codigo', 'e.nombre', 'e.tipo', 'e.estado_conexion')
            ->get();

        $topVisitas = DB::table('visitas_pagina')->orderByDesc('contador')->limit(6)->get();
        $evolucion  = DB::table('historicos_semestrales')
            ->select('gestion', DB::raw('SUM(total_inscritos) as inscritos'), DB::raw('ROUND(AVG(tasa_aprobacion),2) as aprobacion'), DB::raw('ROUND(AVG(tasa_desercion),2) as desercion'))
            ->groupBy('gestion')->orderBy('gestion')->get();

        return response()->json([
            'kpis'         => $kpis,
            'materias'     => $materias,
            'radar'        => $radar,
            'benchmarking' => $benchmarking,
            'correlacion'  => $correlacion,
            'filtros'      => $filtros,
            'por_facultad' => $porFacultad,
            'por_entorno'  => $porEntorno,
            'top_visitas'  => $topVisitas,
            'evolucion'    => $evolucion,
        ]);
    }

    // ===================== CU2: ENTORNOS MOODLE =====================
    public function entornosIndex()
    {
        return response()->json(DB::table('entornos_moodle')->orderBy('id')->get());
    }

    public function entornosStore(Request $request)
    {
        $d = $request->validate([
            'codigo'          => ['required', 'string', 'max:20', 'unique:entornos_moodle,codigo'],
            'nombre'          => ['required', 'string', 'max:100'],
            'tipo'            => ['required', 'in:VIRTUAL,PRESENCIAL,CAPACITACION'],
            'url_base'        => ['required', 'url', 'max:200'],
            'version_moodle'  => ['required', 'string', 'max:20'],
            'estado_conexion' => ['required', 'in:ACTIVO,INACTIVO,MANTENIMIENTO'],
        ], [
            'codigo.required'   => 'El código del entorno es obligatorio.',
            'codigo.unique'     => 'Ya existe un entorno Moodle con ese código.',
            'nombre.required'   => 'El nombre del entorno es obligatorio.',
            'tipo.in'           => 'El tipo debe ser VIRTUAL, PRESENCIAL o CAPACITACION.',
            'url_base.url'      => 'La URL base debe ser una dirección web válida (https://...).',
            'estado_conexion.in'=> 'El estado debe ser ACTIVO, INACTIVO o MANTENIMIENTO.',
        ]);

        $id = DB::table('entornos_moodle')->insertGetId(array_merge($d, [
            'codigo' => strtoupper($d['codigo']),
            'ultima_sinc' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]));
        $this->registrarBitacora($request, 'CREAR_ENTORNO', "Entorno #{$id} ({$d['codigo']})");
        return response()->json(['message' => 'Entorno Moodle registrado correctamente.', 'id' => $id], 201);
    }

    public function entornosDestroy(Request $request, int $id)
    {
        $enUso = DB::table('aulas_apertura')->where('entorno_id', $id)->exists();
        if ($enUso) {
            return response()->json(['message' => 'No se puede eliminar el entorno porque tiene aulas aperturadas asociadas.'], 422);
        }
        DB::table('entornos_moodle')->where('id', $id)->delete();
        $this->registrarBitacora($request, 'ELIMINAR_ENTORNO', "Entorno #{$id}");
        return response()->json(['message' => 'Entorno Moodle eliminado correctamente.']);
    }

    // ===================== CU3: APERTURA E INFRAESTRUCTURA =====================
    public function aperturaIndex()
    {
        $rows = DB::table('aulas_apertura as a')
            ->join('entornos_moodle as e', 'e.id', '=', 'a.entorno_id')
            ->select('a.*', 'e.codigo as entorno_codigo', 'e.nombre as entorno_nombre')
            ->orderByDesc('a.id')->get();
        return response()->json($rows);
    }

    public function aperturaStore(Request $request)
    {
        $d = $request->validate([
            'entorno_id'      => ['required', 'integer', 'exists:entornos_moodle,id'],
            'gestion'         => ['required', 'string', 'max:15'],
            'facultad'        => ['required', 'string', 'max:100'],
            'carrera'         => ['required', 'string', 'max:120'],
            'sigla'           => ['required', 'string', 'max:20'],
            'grupo'           => ['required', 'string', 'max:10'],
            'materia'         => ['required', 'string', 'max:150'],
            'docente_codigo'  => ['required', 'string', 'max:30'],
            'docente_nombre'  => ['required', 'string', 'max:150'],
            'formato_curso'   => ['required', 'string', 'max:40'],
            'estado_apertura' => ['required', 'in:APERTURADA,PENDIENTE,OBSERVADA,CERRADA'],
        ], [
            'entorno_id.exists' => 'El entorno Moodle seleccionado no existe.',
            'sigla.required'    => 'La sigla de la materia es obligatoria.',
            'materia.required'  => 'El nombre de la materia es obligatorio.',
            'estado_apertura.in'=> 'Estado inválido (APERTURADA, PENDIENTE, OBSERVADA o CERRADA).',
        ]);

        $id = DB::table('aulas_apertura')->insertGetId(array_merge($d, [
            'facultad'       => strtoupper($d['facultad']),
            'sigla'          => strtoupper($d['sigla']),
            'grupo'          => strtoupper($d['grupo']),
            'fecha_apertura' => now()->toDateString(),
            'created_at'     => now(),
            'updated_at'     => now(),
        ]));
        $this->registrarBitacora($request, 'CREAR_AULA', "Aula #{$id} ({$d['sigla']}-{$d['grupo']})");
        return response()->json(['message' => 'Aula registrada correctamente.', 'id' => $id], 201);
    }

    // ===================== CU4: MONITOREO ACADÉMICO =====================
    public function monitoreoIndex()
    {
        $rows = DB::table('monitoreo_academico as m')
            ->join('aulas_apertura as a', 'a.id', '=', 'm.aula_id')
            ->select('m.*', 'a.sigla', 'a.grupo', 'a.materia', 'a.facultad')
            ->orderByDesc('m.id')->get();
        return response()->json($rows);
    }

    public function monitoreoStore(Request $request)
    {
        $d = $request->validate([
            'aula_id'        => ['required', 'integer', 'exists:aulas_apertura,id'],
            'inscritos'      => ['required', 'integer', 'min:0'],
            'activos'        => ['required', 'integer', 'min:0', 'lte:inscritos'],
            'aprobados'      => ['required', 'integer', 'min:0'],
            'reprobados'     => ['required', 'integer', 'min:0'],
            'promedio_notas' => ['required', 'numeric', 'min:0', 'max:100'],
        ], [
            'aula_id.exists'     => 'El aula seleccionada no existe.',
            'activos.lte'        => 'Los estudiantes activos no pueden superar a los inscritos.',
            'promedio_notas.max' => 'El promedio no puede superar 100 puntos.',
        ]);

        $capacidad = (float) (DB::table('parametros_sistema')->where('clave', 'CAPACIDAD_ESTANDAR_AULA')->value('valor') ?? 50);
        $densidad = $capacidad > 0 ? round(($d['inscritos'] * 100) / $capacidad, 2) : 0;

        $id = DB::table('monitoreo_academico')->insertGetId(array_merge($d, [
            'densidad_pct' => $densidad,
            'fecha_corte'  => now()->toDateString(),
            'created_at'   => now(),
            'updated_at'   => now(),
        ]));
        $this->registrarBitacora($request, 'REGISTRAR_MONITOREO', "Monitoreo #{$id} Aula #{$d['aula_id']}");
        return response()->json(['message' => "Monitoreo guardado (Densidad calculada: {$densidad}%).", 'id' => $id], 201);
    }

    // ===================== CU5: DESERCIÓN Y SEMÁFOROS =====================
    public function riesgoIndex()
    {
        $rows = DB::table('evaluacion_riesgo as r')
            ->join('aulas_apertura as a', 'a.id', '=', 'r.aula_id')
            ->select('r.*', 'a.sigla', 'a.grupo', 'a.materia', 'a.facultad')
            ->orderByDesc('r.tasa_desercion')->get();
        return response()->json($rows);
    }

    public function riesgoStore(Request $request)
    {
        $d = $request->validate([
            'aula_id'         => ['required', 'integer', 'exists:aulas_apertura,id'],
            'total_inscritos' => ['required', 'integer', 'min:1'],
            'retiros'         => ['required', 'integer', 'min:0', 'lte:total_inscritos'],
            'en_mora'         => ['required', 'integer', 'min:0'],
            'observacion'     => ['nullable', 'string', 'max:255'],
        ], [
            'total_inscritos.min' => 'El total de inscritos debe ser mayor a 0.',
            'retiros.lte'         => 'Los retiros no pueden superar al total de inscritos.',
        ]);

        $tasa = round(($d['retiros'] * 100) / $d['total_inscritos'], 2);
        $uRojo = (float) (DB::table('parametros_sistema')->where('clave', 'UMBRAL_RIESGO_ROJO')->value('valor') ?? 30);
        $uAmar = (float) (DB::table('parametros_sistema')->where('clave', 'UMBRAL_RIESGO_AMARILLO')->value('valor') ?? 15);
        $semaforo = $tasa >= $uRojo ? 'ROJO' : ($tasa >= $uAmar ? 'AMARILLO' : 'VERDE');

        $id = DB::table('evaluacion_riesgo')->insertGetId(array_merge($d, [
            'tasa_desercion'   => $tasa,
            'semaforo'         => $semaforo,
            'fecha_evaluacion' => now()->toDateString(),
            'created_at'       => now(),
            'updated_at'       => now(),
        ]));
        $this->registrarBitacora($request, 'EVALUAR_RIESGO', "Riesgo #{$id} Semáforo {$semaforo} ({$tasa}%)");
        return response()->json(['message' => "Riesgo evaluado: {$tasa}% → Semáforo {$semaforo}.", 'id' => $id, 'semaforo' => $semaforo], 201);
    }

    // ===================== CU7: HISTÓRICOS SEMESTRALES =====================
    public function historicosIndex(Request $request)
    {
        $gestA = $request->query('gestion_a');
        $gestB = $request->query('gestion_b');

        $q = DB::table('historicos_semestrales as h')
            ->join('entornos_moodle as e', 'e.id', '=', 'h.entorno_id')
            ->select('h.*', 'e.codigo as entorno_codigo', 'e.nombre as entorno_nombre');

        if ($gestA && $gestB) {
            $q->whereIn('h.gestion', [$gestA, $gestB]);
        }

        return response()->json($q->orderByDesc('h.gestion')->orderBy('h.facultad')->get());
    }

    // ===================== AUDITORÍA Y BITÁCORA =====================
    public function bitacoraIndex()
    {
        $logs = DB::table('bitacora_auditoria as b')
            ->leftJoin('usuarios_dedte as u', 'u.id', '=', 'b.usuario_id')
            ->select('b.*', DB::raw("COALESCE(u.nombre || ' ' || u.apellido, b.email_intento, 'Anónimo') as actor"))
            ->orderByDesc('b.id')->limit(60)->get();

        $topRecursos = DB::table('bitacora_auditoria')
            ->select('recurso', DB::raw('COUNT(*) as accesos'))
            ->groupBy('recurso')->orderByDesc('accesos')->limit(8)->get();

        $resumen = [
            'logins_exitosos' => DB::table('bitacora_auditoria')->where('accion', 'LOGIN_EXITOSO')->count(),
            'logins_fallidos' => DB::table('bitacora_auditoria')->where('accion', 'LOGIN_FALLIDO')->count(),
            'accesos_denegados' => DB::table('bitacora_auditoria')->where('accion', 'ACCESO_DENEGADO')->count(),
            'total_eventos'   => DB::table('bitacora_auditoria')->count(),
        ];

        return response()->json([
            'logs'         => $logs,
            'top_recursos' => $topRecursos,
            'resumen'      => $resumen,
        ]);
    }

    // ===================== CU1: ADMINISTRACIÓN (USUARIOS, ROLES, PARÁMETROS) =====================
    public function adminData()
    {
        $usuarios = DB::table('usuarios_dedte as u')
            ->join('roles as r', 'r.id', '=', 'u.rol_id')
            ->select('u.id', 'u.ci', 'u.nombre', 'u.apellido', 'u.email', 'u.telefono', 'u.estado', 'r.codigo as rol_codigo', 'r.nombre as rol_nombre')
            ->orderBy('u.id')->get();
        $roles = DB::table('roles')->orderBy('id')->get();
        $parametros = DB::table('parametros_sistema')->orderBy('id')->get();
        return response()->json(['usuarios' => $usuarios, 'roles' => $roles, 'parametros' => $parametros]);
    }

    public function usuarioStore(Request $request)
    {
        $d = $request->validate([
            'ci'       => ['required', 'string', 'max:20', 'unique:usuarios_dedte,ci'],
            'nombre'   => ['required', 'string', 'max:100'],
            'apellido' => ['required', 'string', 'max:100'],
            'email'    => ['required', 'email', 'max:120', 'unique:usuarios_dedte,email'],
            'password' => ['required', 'string', 'min:6'],
            'rol_id'   => ['required', 'integer', 'exists:roles,id'],
            'telefono' => ['nullable', 'string', 'max:30'],
        ], [
            'ci.unique'       => 'Ya existe un usuario registrado con ese CI.',
            'email.unique'    => 'Ese correo electrónico ya está en uso.',
            'password.min'    => 'La contraseña debe tener al menos 6 caracteres.',
            'rol_id.exists'   => 'El rol seleccionado no es válido.',
        ]);

        $id = DB::table('usuarios_dedte')->insertGetId([
            'ci'         => $d['ci'],
            'nombre'     => $d['nombre'],
            'apellido'   => $d['apellido'],
            'email'      => strtolower($d['email']),
            'password'   => Hash::make($d['password']),
            'rol_id'     => $d['rol_id'],
            'telefono'   => $d['telefono'] ?? null,
            'estado'     => 'ACTIVO',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->registrarBitacora($request, 'CREAR_USUARIO', "Usuario #{$id} ({$d['email']})");
        return response()->json(['message' => 'Usuario creado correctamente.', 'id' => $id], 201);
    }

    public function parametroUpdate(Request $request, int $id)
    {
        $d = $request->validate([
            'valor' => ['required', 'string', 'max:120'],
        ], [
            'valor.required' => 'El valor del parámetro es obligatorio.',
        ]);

        DB::table('parametros_sistema')->where('id', $id)->update([
            'valor'      => $d['valor'],
            'updated_at' => now(),
        ]);
        $this->registrarBitacora($request, 'ACTUALIZAR_PARAMETRO', "Parámetro #{$id} = {$d['valor']}");
        return response()->json(['message' => 'Parámetro actualizado correctamente.']);
    }
}
