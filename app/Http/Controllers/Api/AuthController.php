<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string', 'min:4'],
        ], [
            'email.required'    => 'El correo electrónico es obligatorio.',
            'email.email'       => 'Debe ingresar un correo electrónico válido.',
            'password.required' => 'La contraseña es obligatoria.',
            'password.min'      => 'La contraseña debe tener al menos 4 caracteres.',
        ]);

        $usuario = DB::table('usuarios_dedte as u')
            ->join('roles as r', 'r.id', '=', 'u.rol_id')
            ->select('u.*', 'r.codigo as rol_codigo', 'r.nombre as rol_nombre')
            ->where('u.email', strtolower(trim($data['email'])))
            ->first();

        if (!$usuario || !Hash::check($data['password'], $usuario->password)) {
            DB::table('bitacora_auditoria')->insert([
                'usuario_id'    => $usuario?->id,
                'email_intento' => $data['email'],
                'accion'        => 'LOGIN_FALLIDO',
                'recurso'       => '/api/auth/login',
                'metodo'        => 'POST',
                'ip'            => $request->ip(),
                'exito'         => false,
                'detalle'       => 'Credenciales incorrectas',
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);

            return response()->json(['message' => 'Correo electrónico o contraseña incorrectos.'], 401);
        }

        if ($usuario->estado !== 'ACTIVO') {
            return response()->json(['message' => 'Su cuenta está inactiva. Contacte al Administrador DEDTE.'], 403);
        }

        $plainToken = Str::random(60);
        DB::table('api_tokens')->insert([
            'usuario_id' => $usuario->id,
            'token_hash' => hash('sha256', $plainToken),
            'expires_at' => now()->addDays(7),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('bitacora_auditoria')->insert([
            'usuario_id'    => $usuario->id,
            'email_intento' => $usuario->email,
            'accion'        => 'LOGIN_EXITOSO',
            'recurso'       => '/api/auth/login',
            'metodo'        => 'POST',
            'ip'            => $request->ip(),
            'exito'         => true,
            'detalle'       => 'Inicio de sesión correcto (' . $usuario->rol_codigo . ')',
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        return response()->json($this->buildSessionPayload($usuario, $plainToken));
    }

    public function me(Request $request)
    {
        $usuario = $request->attributes->get('auth_user');
        return response()->json($this->buildSessionPayload($usuario, null));
    }

    public function logout(Request $request)
    {
        $usuario = $request->attributes->get('auth_user');
        $header = $request->header('Authorization', '');
        if (str_starts_with($header, 'Bearer ')) {
            $hash = hash('sha256', trim(substr($header, 7)));
            DB::table('api_tokens')->where('token_hash', $hash)->delete();
        }

        DB::table('bitacora_auditoria')->insert([
            'usuario_id'    => $usuario?->id,
            'email_intento' => $usuario?->email,
            'accion'        => 'LOGOUT',
            'recurso'       => '/api/auth/logout',
            'metodo'        => 'POST',
            'ip'            => $request->ip(),
            'exito'         => true,
            'detalle'       => 'Cierre de sesión',
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        return response()->json(['message' => 'Sesión cerrada correctamente.']);
    }

    private function buildSessionPayload(object $usuario, ?string $token): array
    {
        $permisos = DB::table('rol_permiso as rp')
            ->join('permisos as p', 'p.id', '=', 'rp.permiso_id')
            ->where('rp.rol_id', $usuario->rol_id)
            ->pluck('p.codigo')
            ->toArray();

        // Menú dinámico filtrado estrictamente desde la BD según permisos del rol
        $menu = DB::table('menu_items')
            ->whereIn('permiso_codigo', $permisos)
            ->orderBy('orden')
            ->get();

        return [
            'token'    => $token,
            'usuario'  => [
                'id'         => $usuario->id,
                'ci'         => $usuario->ci,
                'nombre'     => $usuario->nombre,
                'apellido'   => $usuario->apellido,
                'email'      => $usuario->email,
                'rol_codigo' => $usuario->rol_codigo,
                'rol_nombre' => $usuario->rol_nombre,
            ],
            'permisos' => $permisos,
            'menu'     => $menu,
        ];
    }
}
