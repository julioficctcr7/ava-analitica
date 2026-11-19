<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DedteSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        // 1. Roles (Admin + 3 roles de negocio diferenciados)
        $roles = [
            ['codigo' => 'ADMIN',     'nombre' => 'Coordinación Central DEDTE', 'descripcion' => 'Control total de usuarios, RBAC, parámetros, auditoría y módulos DEDTE'],
            ['codigo' => 'DIRECTIVO', 'nombre' => 'Directivo DEDTE',            'descripcion' => 'Supervisión estratégica, Dashboard 360°, Históricos, Reportes y Auditoría'],
            ['codigo' => 'ANALISTA',  'nombre' => 'Analista Académico',         'descripcion' => 'Gestión operativa de Entornos, Apertura, Monitoreo, Riesgo y Reportes'],
            ['codigo' => 'DOCENTE',   'nombre' => 'Docente Titular AVA',        'descripcion' => 'Consulta de aulas asignadas, rendimiento, alertas y pagos'],
        ];
        foreach ($roles as $r) {
            DB::table('roles')->updateOrInsert(['codigo' => $r['codigo']], array_merge($r, ['created_at' => $now, 'updated_at' => $now]));
        }
        $rolIds = DB::table('roles')->pluck('id', 'codigo');

        // 2. Permisos
        $permisos = [
            ['codigo' => 'dashboard.ver',    'modulo' => 'CU6 Dashboard',      'descripcion' => 'Ver Centro de Control y Dashboard 360°'],
            ['codigo' => 'admin.gestionar',  'modulo' => 'CU1 Administración', 'descripcion' => 'Gestionar usuarios, roles y parámetros'],
            ['codigo' => 'entornos.ver',     'modulo' => 'CU2 Entornos',       'descripcion' => 'Ver entornos Moodle'],
            ['codigo' => 'entornos.editar',  'modulo' => 'CU2 Entornos',       'descripcion' => 'Crear/editar entornos Moodle'],
            ['codigo' => 'apertura.ver',     'modulo' => 'CU3 Apertura',       'descripcion' => 'Bloque 1: Apertura e Infraestructura'],
            ['codigo' => 'apertura.editar',  'modulo' => 'CU3 Apertura',       'descripcion' => 'Registrar/modificar apertura de aulas'],
            ['codigo' => 'monitoreo.ver',    'modulo' => 'CU4 Monitoreo',      'descripcion' => 'Bloques 2 y 3: Población, Carga y Rendimiento'],
            ['codigo' => 'monitoreo.editar', 'modulo' => 'CU4 Monitoreo',      'descripcion' => 'Registrar cortes de monitoreo'],
            ['codigo' => 'riesgo.ver',       'modulo' => 'CU5 Riesgo',         'descripcion' => 'Bloque 4: Deserción, Retiros y Alertas'],
            ['codigo' => 'riesgo.editar',    'modulo' => 'CU5 Riesgo',         'descripcion' => 'Evaluar deserción y semáforos'],
            ['codigo' => 'historicos.ver',   'modulo' => 'CU7 Históricos',     'descripcion' => 'Consultar y comparar históricos semestrales'],
            ['codigo' => 'reportes.ver',     'modulo' => 'CU8 Reportes',       'descripcion' => 'Matriz Nominal y Reportes Estadísticos'],
            ['codigo' => 'bitacora.ver',     'modulo' => 'Auditoría',          'descripcion' => 'Ver bitácora de accesos y seguridad'],
            ['codigo' => 'pagos.gestionar',  'modulo' => 'Pagos Electrónicos', 'descripcion' => 'Gestionar métodos, pagos únicos y planes de cuotas'],
        ];
        foreach ($permisos as $p) {
            DB::table('permisos')->updateOrInsert(['codigo' => $p['codigo']], $p);
        }
        $permIds = DB::table('permisos')->pluck('id', 'codigo');

        // 3. Matriz RBAC
        $matriz = [
            'ADMIN'     => array_keys($permIds->toArray()),
            'DIRECTIVO' => ['dashboard.ver', 'entornos.ver', 'apertura.ver', 'monitoreo.ver', 'riesgo.ver', 'historicos.ver', 'reportes.ver', 'bitacora.ver', 'pagos.gestionar'],
            'ANALISTA'  => ['dashboard.ver', 'entornos.ver', 'entornos.editar', 'apertura.ver', 'apertura.editar', 'monitoreo.ver', 'monitoreo.editar', 'riesgo.ver', 'riesgo.editar', 'historicos.ver', 'reportes.ver', 'pagos.gestionar'],
            'DOCENTE'   => ['dashboard.ver', 'apertura.ver', 'monitoreo.ver', 'riesgo.ver', 'pagos.gestionar'],
        ];
        DB::table('rol_permiso')->delete();
        foreach ($matriz as $rolCod => $listaPerm) {
            foreach ($listaPerm as $pCod) {
                DB::table('rol_permiso')->insert(['rol_id' => $rolIds[$rolCod], 'permiso_id' => $permIds[$pCod]]);
            }
        }

        // 4. Menú Dinámico desde BD
        DB::table('menu_items')->delete();
        DB::table('menu_items')->insert([
            ['titulo' => 'Centro de Control',       'ruta' => '/dashboard',  'icono' => 'LayoutDashboard', 'permiso_codigo' => 'dashboard.ver',   'orden' => 1],
            ['titulo' => 'B1 · Apertura de Aulas',  'ruta' => '/apertura',   'icono' => 'BookOpen',        'permiso_codigo' => 'apertura.ver',    'orden' => 2],
            ['titulo' => 'B2/B3 · Carga y Notas',   'ruta' => '/monitoreo',  'icono' => 'Activity',        'permiso_codigo' => 'monitoreo.ver',   'orden' => 3],
            ['titulo' => 'B4 · Deserción y Alertas','ruta' => '/riesgo',     'icono' => 'AlertTriangle',   'permiso_codigo' => 'riesgo.ver',      'orden' => 4],
            ['titulo' => 'Entornos Moodle',         'ruta' => '/entornos',   'icono' => 'Server',          'permiso_codigo' => 'entornos.ver',    'orden' => 5],
            ['titulo' => 'Históricos Semestrales',  'ruta' => '/historicos', 'icono' => 'History',         'permiso_codigo' => 'historicos.ver',  'orden' => 6],
            ['titulo' => 'Matriz y Reportes',       'ruta' => '/reportes',   'icono' => 'BarChart3',       'permiso_codigo' => 'reportes.ver',    'orden' => 7],
            ['titulo' => 'Pagos Electrónicos',      'ruta' => '/pagos',      'icono' => 'CreditCard',      'permiso_codigo' => 'pagos.gestionar', 'orden' => 8],
            ['titulo' => 'Auditoría y Bitácora',    'ruta' => '/bitacora',   'icono' => 'ShieldCheck',     'permiso_codigo' => 'bitacora.ver',    'orden' => 9],
            ['titulo' => 'Administración (CU1)',    'ruta' => '/admin',      'icono' => 'Settings',        'permiso_codigo' => 'admin.gestionar', 'orden' => 10],
        ]);

        // 5. Usuarios Demo (clave: 12345678)
        $pass = Hash::make('12345678');
        $usuarios = [
            ['ci' => '219198322', 'nombre' => 'Julio Cesar',   'apellido' => 'Quispe Delgado',   'email' => 'admin@dedte.uagrm.edu.bo',     'rol_id' => $rolIds['ADMIN'],     'telefono' => '70011223'],
            ['ci' => '221044434', 'nombre' => 'Kelly Alisson', 'apellido' => 'Duran Marcelo',    'email' => 'kelly@dedte.uagrm.edu.bo',     'rol_id' => $rolIds['ADMIN'],     'telefono' => '70044556'],
            ['ci' => '4715292',   'nombre' => 'Evans',         'apellido' => 'Balcazar Veizaga', 'email' => 'directivo@dedte.uagrm.edu.bo', 'rol_id' => $rolIds['DIRECTIVO'], 'telefono' => '71055123'],
            ['ci' => '5823411',   'nombre' => 'Carla',         'apellido' => 'Mendoza Rojas',    'email' => 'analista@dedte.uagrm.edu.bo',  'rol_id' => $rolIds['ANALISTA'],  'telefono' => '72133445'],
            ['ci' => '6312098',   'nombre' => 'Elena',         'apellido' => 'Suarez Flores',    'email' => 'docente@dedte.uagrm.edu.bo',   'rol_id' => $rolIds['DOCENTE'],   'telefono' => '73199887'],
        ];
        foreach ($usuarios as $u) {
            DB::table('usuarios_dedte')->updateOrInsert(
                ['email' => $u['email']],
                array_merge($u, ['password' => $pass, 'estado' => 'ACTIVO', 'created_at' => $now, 'updated_at' => $now])
            );
        }
        $adminId = DB::table('usuarios_dedte')->where('email', 'admin@dedte.uagrm.edu.bo')->value('id');

        // 6. Parámetros (Resolución ICU N° 053/2023)
        $params = [
            ['clave' => 'GESTION_ACTUAL',          'valor' => '2026-2', 'descripcion' => 'Gestión académica vigente (Res. ICU N° 053/2023)'],
            ['clave' => 'UMBRAL_RIESGO_AMARILLO',  'valor' => '15.0',   'descripcion' => 'Porcentaje mínimo de deserción para semáforo En Seguimiento (AMARILLO)'],
            ['clave' => 'UMBRAL_RIESGO_ROJO',      'valor' => '25.0',   'descripcion' => 'Porcentaje mínimo de deserción/reprobación para semáforo Crítico (ROJO)'],
            ['clave' => 'CAPACIDAD_ESTANDAR_AULA', 'valor' => '35',     'descripcion' => 'Capacidad óptima pedagógica DEDTE (35 estudiantes por aula virtual)'],
        ];
        foreach ($params as $p) {
            DB::table('parametros_sistema')->updateOrInsert(['clave' => $p['clave']], array_merge($p, ['created_at' => $now, 'updated_at' => $now]));
        }

        // 7. Entornos Moodle
        $entornos = [
            ['codigo' => 'AVA-VIRT', 'nombre' => 'Modalidad Virtual UAGRM',           'tipo' => 'VIRTUAL',      'url_base' => 'https://ava.uagrm.edu.bo/virtual',      'version_moodle' => '5.1 LTS', 'estado_conexion' => 'ACTIVO'],
            ['codigo' => 'AVA-PRES', 'nombre' => 'Apoyo Presencial UAGRM',            'tipo' => 'PRESENCIAL',   'url_base' => 'https://ava.uagrm.edu.bo/presencial',   'version_moodle' => '5.1 LTS', 'estado_conexion' => 'ACTIVO'],
            ['codigo' => 'AVA-CAP',  'nombre' => 'Capacitación Docente DEDTE',        'tipo' => 'CAPACITACION', 'url_base' => 'https://ava.uagrm.edu.bo/capacitacion', 'version_moodle' => '5.1 LTS', 'estado_conexion' => 'ACTIVO'],
        ];
        foreach ($entornos as $e) {
            DB::table('entornos_moodle')->updateOrInsert(['codigo' => $e['codigo']], array_merge($e, ['ultima_sinc' => $now, 'created_at' => $now, 'updated_at' => $now]));
        }
        $entIds = DB::table('entornos_moodle')->pluck('id', 'codigo');

        // 8. Las 21 Asignaturas Reales del Modelo DEDTE-UAGRM (802 estudiantes totales)
        // [sigla, grupo, materia, facultad, carrera, nivel, docente_cod, docente_nom, insc, aprob, repr, 2da, cero_deserc, prom, prom_ap, ret_form, al7, al14, al21, tareas, semaforo]
        $materiasReales = [
            ['CPA100', 'SC', 'CONTABILIDAD I (PARALELO)',              'FCCASGCF', '105-5 Contaduría Pública (FCCASGCF)', 1, 'DOC-101', 'Lic. Marcos Antelo',       40, 32,  8,  3,  2, 63.8, 74.2, 1,  4,  2, 1, 2, 'AMARILLO'],
            ['CPA100', 'SV', 'CONTABILIDAD I',                         'FCCASGCF', '105-5 Contaduría Pública (FCCASGCF)', 1, 'DOC-102', 'Lic. Patricia Flores',     42, 28, 14,  5,  4, 55.1, 71.0, 2,  6,  4, 2, 3, 'AMARILLO'],
            ['ECO100', 'SV', 'TEORÍA DE LOS PRECIOS II',               'FCCASGCF', '105-5 Contaduría Pública (FCCASGCF)', 2, 'DOC-103', 'Lic. Roberto Justiniano',  35, 25, 10,  3,  2, 62.0, 73.5, 1,  4,  2, 1, 2, 'AMARILLO'],
            ['INF101', 'SV', 'INFORMÁTICA APLICADA I',                 'FCCASGCF', '105-5 Contaduría Pública (FCCASGCF)', 1, 'DOC-104', 'Ing. Sonia Terrazas',      38, 26, 12,  4,  3, 58.4, 72.1, 1,  5,  3, 2, 2, 'AMARILLO'],
            ['MAT100', 'SV', 'CÁLCULO I',                              'FCCASGCF', '105-5 Contaduría Pública (FCCASGCF)', 1, 'DOC-105', 'Ing. Jorge Claure',        45, 18, 27,  9,  8, 44.2, 68.0, 3, 11,  8, 5, 5, 'ROJO'],
            ['MAT101', 'SV', 'ESTADÍSTICA I',                          'FCCASGCF', '105-5 Contaduría Pública (FCCASGCF)', 2, 'DOC-106', 'Lic. Claudia Salvatierra', 40, 22, 18,  6,  5, 49.3, 69.5, 2,  8,  5, 3, 4, 'ROJO'],

            ['DER100', 'DV', 'INTRODUCCIÓN AL DERECHO',                'FCJPSRRI', '157-1 Derecho (FCJPSRRI)',            1, 'DOC-201', 'Dr. Adolfo Céspedes',      48, 34, 14,  5,  3, 63.5, 73.8, 2,  6,  3, 2, 2, 'VERDE'],
            ['DER100', 'DX', 'INTRODUCCIÓN AL DERECHO (PARALELO)',     'FCJPSRRI', '157-1 Derecho (FCJPSRRI)',            1, 'DOC-202', 'Dr. Fernando Cuéllar',     46, 29, 17,  6,  5, 57.2, 70.4, 2,  7,  5, 3, 3, 'AMARILLO'],
            ['DER101', 'DV', 'DERECHO CONSTITUCIONAL',                 'FCJPSRRI', '157-1 Derecho (FCJPSRRI)',            1, 'DOC-203', 'Dra. Mónica Saavedra',     46, 31, 15,  5,  4, 59.8, 72.0, 2,  6,  4, 2, 3, 'AMARILLO'],
            ['DER200', 'DV', 'DERECHO CIVIL I (PERSONAS)',             'FCJPSRRI', '157-1 Derecho (FCJPSRRI)',            2, 'DOC-204', 'Dr. Luis Alberto Peña',    40, 24, 16,  6,  5, 52.4, 69.8, 2,  7,  5, 3, 3, 'AMARILLO'],
            ['DER201', 'DV', 'DERECHO PENAL I',                        'FCJPSRRI', '157-1 Derecho (FCJPSRRI)',            2, 'DOC-205', 'Dr. Erwin Roca',           44, 27, 17,  6,  4, 56.1, 71.2, 2,  6,  4, 2, 3, 'AMARILLO'],

            ['TSO100', 'DV', 'INTRODUCCIÓN AL TRABAJO SOCIAL',         'FCJPSRRI', '159-2 Trabajo Social (FCJPSRRI)',     1, 'DOC-206', 'Lic. Carmen Velasco',      36, 28,  8,  3,  2, 68.2, 76.5, 1,  3,  2, 1, 1, 'VERDE'],
            ['TSO101', 'DV', 'TRABAJO SOCIAL Y FAMILIA',               'FCJPSRRI', '159-2 Trabajo Social (FCJPSRRI)',     1, 'DOC-207', 'Lic. Rosa María Ortiz',    34, 25,  9,  3,  2, 64.0, 74.0, 1,  4,  2, 1, 1, 'VERDE'],

            ['FIS100', 'SV', 'FÍSICA I',                               'FICCT',    '187-3 Ingeniería Informática (FICCT)',1, 'DOC-301', 'Ing. Ramiro Gutiérrez',    35, 10, 25,  8, 17, 28.0, 64.5, 5, 19, 17, 11, 6, 'ROJO'],
            ['INF110', 'SC', 'INTRODUCCIÓN A LA INFORMÁTICA (PARALELO)','FICCT',   '187-3 Ingeniería Informática (FICCT)',1, 'DOC-302', 'Ing. Evans Balcazar',      35, 19, 16,  6,  4, 53.4, 71.5, 2,  6,  4, 2, 3, 'AMARILLO'],
            ['INF110', 'SV', 'INTRODUCCIÓN A LA INFORMÁTICA',          'FICCT',    '187-3 Ingeniería Informática (FICCT)',1, 'DOC-303', 'Ing. Carlos Alberto Vega', 34,  7, 27,  9, 13, 24.0, 62.0, 4, 16, 13, 8, 5, 'ROJO'],
            ['INF119', 'SV', 'ESTRUCTURAS DISCRETAS',                  'FICCT',    '187-3 Ingeniería Informática (FICCT)',1, 'DOC-304', 'Ing. Maria Luisa Perez',   35,  4, 31, 11, 10, 19.0, 60.5, 4, 14, 10, 7, 6, 'ROJO'],
            ['LIN100', 'SV', 'INGLÉS TÉCNICO I',                       'FICCT',    '187-3 Ingeniería Informática (FICCT)',1, 'DOC-305', 'Lic. Gabriela Méndez',     27,  8, 19,  7, 12, 29.0, 65.0, 3, 14, 12, 8, 5, 'ROJO'],
            ['MAT101', 'SD', 'CÁLCULO I (INFORMÁTICA)',                'FICCT',    '187-3 Ingeniería Informática (FICCT)',1, 'DOC-306', 'Ing. Hugo Sandoval',       34,  8, 26,  9, 14, 28.0, 63.2, 4, 17, 14, 9, 6, 'ROJO'],

            ['SIS100', 'SV', 'TEORÍA GENERAL DE SISTEMAS',             'FICCT',    '187-4 Ingeniería en Sistemas (FICCT)',1, 'DOC-307', 'Ing. Elena Suarez',        36, 22, 14,  5,  5, 54.3, 70.8, 2,  4,  5, 3, 3, 'AMARILLO'],
            ['SIS200', 'SV', 'METODOLOGÍA DE SISTEMAS I',              'FICCT',    '187-4 Ingeniería en Sistemas (FICCT)',2, 'DOC-308', 'Ing. Víctor Hugo Lara',    32, 19, 13,  4,  4, 57.0, 71.6, 2,  4,  4, 2, 3, 'ROJO'],
        ];

        if (DB::table('aulas_apertura')->count() === 0) {
            foreach ($materiasReales as $m) {
                $aulaId = DB::table('aulas_apertura')->insertGetId([
                    'entorno_id'         => $entIds['AVA-VIRT'],
                    'gestion'            => '2026-2',
                    'facultad'           => $m[3],
                    'carrera'            => $m[4],
                    'nivel'              => $m[5],
                    'sigla'              => $m[0],
                    'grupo'              => $m[1],
                    'materia'            => $m[2],
                    'docente_codigo'     => $m[6],
                    'docente_nombre'     => $m[7],
                    'formato_curso'      => 'Mosaico 5.1',
                    'carpeta_pedagogica' => 'Auditada',
                    'estado_apertura'    => 'APERTURADA',
                    'tareas_semanales'   => $m[19],
                    'fecha_apertura'     => '2026-08-10',
                    'created_at'         => $now,
                    'updated_at'         => $now,
                ]);

                $insc = $m[8];
                $cero = $m[12];
                $densidad = round(($insc * 100) / 35, 2);

                DB::table('monitoreo_academico')->insert([
                    'aula_id'            => $aulaId,
                    'inscritos'          => $insc,
                    'activos'            => max(0, $insc - $cero),
                    'aprobados'          => $m[9],
                    'reprobados'         => $m[10],
                    'segunda_instancia'  => $m[11],
                    'sin_nota'           => $cero,
                    'promedio_notas'     => $m[13],
                    'promedio_aprobados' => $m[14],
                    'densidad_pct'       => $densidad,
                    'fecha_corte'        => '2026-11-18',
                    'created_at'         => $now,
                    'updated_at'         => $now,
                ]);

                $tasaDes = round(($cero * 100) / max($insc, 1), 2);
                $obs = $m[20] === 'ROJO'
                    ? 'Deserción/reprobación crítica; requiere rescate académico y tutoría inmediata'
                    : ($m[20] === 'AMARILLO' ? 'En seguimiento preventivo; activar recordatorios de 2da instancia' : 'Rendimiento óptimo y retención saludable en plataforma');

                DB::table('evaluacion_riesgo')->insert([
                    'aula_id'          => $aulaId,
                    'total_inscritos'  => $insc,
                    'retiros'          => $cero,
                    'retiros_formales' => $m[15],
                    'en_mora'          => max(1, intval($cero / 2)),
                    'alertas_7d'       => $m[16],
                    'alertas_14d'      => $m[17],
                    'alertas_21d'      => $m[18],
                    'tasa_desercion'   => $tasaDes,
                    'semaforo'         => $m[20],
                    'observacion'      => $obs,
                    'fecha_evaluacion' => '2026-11-18',
                    'created_at'       => $now,
                    'updated_at'       => $now,
                ]);
            }
        }

        // 9. Históricos Semestrales (CU7)
        if (DB::table('historicos_semestrales')->count() === 0) {
            DB::table('historicos_semestrales')->insert([
                ['gestion' => '2025-2', 'entorno_id' => $entIds['AVA-VIRT'], 'facultad' => 'FCCASGCF', 'total_aulas' => 6, 'total_inscritos' => 228, 'tasa_aprobacion' => 59.20, 'tasa_desercion' => 11.40, 'promedio_general' => 54.10, 'created_at' => $now, 'updated_at' => $now],
                ['gestion' => '2026-1', 'entorno_id' => $entIds['AVA-VIRT'], 'facultad' => 'FCCASGCF', 'total_aulas' => 6, 'total_inscritos' => 235, 'tasa_aprobacion' => 61.50, 'tasa_desercion' => 10.60, 'promedio_general' => 55.00, 'created_at' => $now, 'updated_at' => $now],
                ['gestion' => '2026-2', 'entorno_id' => $entIds['AVA-VIRT'], 'facultad' => 'FCCASGCF', 'total_aulas' => 6, 'total_inscritos' => 240, 'tasa_aprobacion' => 62.92, 'tasa_desercion' => 10.00, 'promedio_general' => 55.47, 'created_at' => $now, 'updated_at' => $now],
                ['gestion' => '2025-2', 'entorno_id' => $entIds['AVA-VIRT'], 'facultad' => 'FCJPSRRI', 'total_aulas' => 7, 'total_inscritos' => 280, 'tasa_aprobacion' => 64.80, 'tasa_desercion' => 9.80,  'promedio_general' => 59.10, 'created_at' => $now, 'updated_at' => $now],
                ['gestion' => '2026-2', 'entorno_id' => $entIds['AVA-VIRT'], 'facultad' => 'FCJPSRRI', 'total_aulas' => 7, 'total_inscritos' => 294, 'tasa_aprobacion' => 67.35, 'tasa_desercion' => 8.50,  'promedio_general' => 60.17, 'created_at' => $now, 'updated_at' => $now],
                ['gestion' => '2025-2', 'entorno_id' => $entIds['AVA-VIRT'], 'facultad' => 'FICCT',    'total_aulas' => 8, 'total_inscritos' => 255, 'tasa_aprobacion' => 34.10, 'tasa_desercion' => 31.20, 'promedio_general' => 35.80, 'created_at' => $now, 'updated_at' => $now],
                ['gestion' => '2026-2', 'entorno_id' => $entIds['AVA-VIRT'], 'facultad' => 'FICCT',    'total_aulas' => 8, 'total_inscritos' => 268, 'tasa_aprobacion' => 36.19, 'tasa_desercion' => 29.48, 'promedio_general' => 36.59, 'created_at' => $now, 'updated_at' => $now],
            ]);
        }

        // 10. Pagos Electrónicos de ejemplo
        if (DB::table('metodos_pago')->count() === 0) {
            $m1 = DB::table('metodos_pago')->insertGetId([
                'usuario_id' => $adminId, 'tipo' => 'TARJETA', 'etiqueta' => 'Visa Institucional UAGRM',
                'ultimos_digitos' => '4532', 'titular' => 'Julio Cesar Quispe Delgado', 'vencimiento' => '12/28',
                'activo' => true, 'created_at' => $now, 'updated_at' => $now,
            ]);
            $m2 = DB::table('metodos_pago')->insertGetId([
                'usuario_id' => $adminId, 'tipo' => 'QR', 'etiqueta' => 'QR Simple Banco Unión',
                'ultimos_digitos' => 'QR01', 'titular' => 'Julio Cesar Quispe Delgado', 'vencimiento' => null,
                'activo' => true, 'created_at' => $now, 'updated_at' => $now,
            ]);
            $planId = DB::table('planes_pago')->insertGetId([
                'usuario_id' => $adminId, 'concepto' => 'Diplomado en Diseño de Aulas Virtuales Moodle 5.1',
                'monto_total' => 1200.00, 'cuotas_totales' => 3, 'cuotas_pagadas' => 1, 'estado' => 'ACTIVO',
                'created_at' => $now, 'updated_at' => $now,
            ]);
            DB::table('pagos_transacciones')->insert([
                ['usuario_id' => $adminId, 'metodo_pago_id' => $m2, 'plan_pago_id' => $planId, 'concepto' => 'Cuota 1/3 - Diplomado Moodle 5.1', 'tipo_pago' => 'CUOTA', 'numero_cuota' => 1, 'monto' => 400.00, 'referencia' => 'DEDTE-QR-2026001', 'estado' => 'PAGADO', 'created_at' => $now, 'updated_at' => $now],
                ['usuario_id' => $adminId, 'metodo_pago_id' => $m1, 'plan_pago_id' => null,    'concepto' => 'Certificado de Competencias Digitales AVA', 'tipo_pago' => 'UNICO', 'numero_cuota' => 1, 'monto' => 150.00, 'referencia' => 'DEDTE-TC-2026002', 'estado' => 'PAGADO', 'created_at' => $now, 'updated_at' => $now],
            ]);
        }

        // 11. Visitas iniciales
        foreach (['/dashboard' => 'Centro de Control', '/apertura' => 'B1 · Apertura de Aulas', '/monitoreo' => 'B2/B3 · Carga y Notas', '/riesgo' => 'B4 · Deserción y Alertas'] as $ruta => $tit) {
            DB::table('visitas_pagina')->updateOrInsert(['ruta' => $ruta], ['titulo' => $tit, 'contador' => 1, 'created_at' => $now, 'updated_at' => $now]);
        }
    }
}
