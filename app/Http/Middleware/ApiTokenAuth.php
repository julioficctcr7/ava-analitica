<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ApiTokenAuth
{
    public function handle(Request $request, Closure $next)
    {
        $header = $request->header('Authorization', '');
        if (!str_starts_with($header, 'Bearer ')) {
            return response()->json(['message' => 'Acceso no autorizado. Debe iniciar sesión para continuar.'], 401);
        }

        $plain = trim(substr($header, 7));
        $hash = hash('sha256', $plain);

        $tokenRow = DB::table('api_tokens')->where('token_hash', $hash)->first();
        if (!$tokenRow) {
            return response()->json(['message' => 'Sesión inválida o expirada. Inicie sesión nuevamente.'], 401);
        }

        $usuario = DB::table('usuarios_dedte as u')
            ->join('roles as r', 'r.id', '=', 'u.rol_id')
            ->select('u.*', 'r.codigo as rol_codigo', 'r.nombre as rol_nombre')
            ->where('u.id', $tokenRow->usuario_id)
            ->where('u.estado', 'ACTIVO')
            ->first();

        if (!$usuario) {
            return response()->json(['message' => 'La cuenta de usuario se encuentra inactiva.'], 403);
        }

        $permisos = DB::table('rol_permiso as rp')
            ->join('permisos as p', 'p.id', '=', 'rp.permiso_id')
            ->where('rp.rol_id', $usuario->rol_id)
            ->pluck('p.codigo')
            ->toArray();

        DB::table('api_tokens')->where('id', $tokenRow->id)->update(['last_used_at' => now()]);

        $request->attributes->set('auth_user', $usuario);
        $request->attributes->set('auth_permisos', $permisos);

        return $next($request);
    }
}
