<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CheckPermission
{
    public function handle(Request $request, Closure $next, string $permiso)
    {
        $permisos = $request->attributes->get('auth_permisos', []);
        $usuario = $request->attributes->get('auth_user');

        if (!in_array($permiso, $permisos, true)) {
            DB::table('bitacora_auditoria')->insert([
                'usuario_id'    => $usuario?->id,
                'email_intento' => $usuario?->email,
                'accion'        => 'ACCESO_DENEGADO',
                'recurso'       => '/' . ltrim($request->path(), '/'),
                'metodo'        => $request->method(),
                'ip'            => $request->ip(),
                'exito'         => false,
                'detalle'       => "Permiso requerido no concedido: {$permiso}",
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);

            return response()->json([
                'message' => "No cuenta con permisos suficientes ({$permiso}) para realizar esta acción.",
            ], 403);
        }

        return $next($request);
    }
}
