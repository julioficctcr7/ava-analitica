<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DedteController;
use App\Http\Controllers\Api\PagosController;
use Illuminate\Support\Facades\Route;

// Rutas públicas
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/visitas/registrar', [DedteController::class, 'registrarVisita']);

// Rutas protegidas por API Token + Matriz RBAC
Route::middleware('api.auth')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/buscar', [DedteController::class, 'busquedaGlobal']);

    // CU6 & CU8: Dashboard y Estadísticas
    Route::get('/dashboard', [DedteController::class, 'dashboard'])->middleware('permiso:dashboard.ver');

    // CU2: Entornos Moodle
    Route::get('/entornos', [DedteController::class, 'entornosIndex'])->middleware('permiso:entornos.ver');
    Route::post('/entornos', [DedteController::class, 'entornosStore'])->middleware('permiso:entornos.editar');
    Route::delete('/entornos/{id}', [DedteController::class, 'entornosDestroy'])->middleware('permiso:entornos.editar');

    // CU3: Apertura e Infraestructura
    Route::get('/apertura', [DedteController::class, 'aperturaIndex'])->middleware('permiso:apertura.ver');
    Route::post('/apertura', [DedteController::class, 'aperturaStore'])->middleware('permiso:apertura.editar');

    // CU4: Monitoreo Académico
    Route::get('/monitoreo', [DedteController::class, 'monitoreoIndex'])->middleware('permiso:monitoreo.ver');
    Route::post('/monitoreo', [DedteController::class, 'monitoreoStore'])->middleware('permiso:monitoreo.editar');

    // CU5: Deserción y Semáforos
    Route::get('/riesgo', [DedteController::class, 'riesgoIndex'])->middleware('permiso:riesgo.ver');
    Route::post('/riesgo', [DedteController::class, 'riesgoStore'])->middleware('permiso:riesgo.editar');

    // CU7: Históricos Semestrales
    Route::get('/historicos', [DedteController::class, 'historicosIndex'])->middleware('permiso:historicos.ver');

    // Auditoría y Bitácora
    Route::get('/bitacora', [DedteController::class, 'bitacoraIndex'])->middleware('permiso:bitacora.ver');

    // CU1: Administración (Usuarios y Parámetros)
    Route::get('/admin', [DedteController::class, 'adminData'])->middleware('permiso:admin.gestionar');
    Route::post('/admin/usuarios', [DedteController::class, 'usuarioStore'])->middleware('permiso:admin.gestionar');
    Route::put('/admin/parametros/{id}', [DedteController::class, 'parametroUpdate'])->middleware('permiso:admin.gestionar');

    // Requisito #10: Módulo de Pagos Electrónicos
    Route::get('/pagos', [PagosController::class, 'index'])->middleware('permiso:pagos.gestionar');
    Route::post('/pagos/metodos', [PagosController::class, 'storeMetodo'])->middleware('permiso:pagos.gestionar');
    Route::post('/pagos/planes', [PagosController::class, 'storePlan'])->middleware('permiso:pagos.gestionar');
    Route::post('/pagos/transacciones', [PagosController::class, 'pagar'])->middleware('permiso:pagos.gestionar');
});
