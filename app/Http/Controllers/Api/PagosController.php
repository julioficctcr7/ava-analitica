<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Requisito #10: Módulo de Pagos Electrónicos
 * (Métodos de pago, transacciones únicas y planes de pagos por cuotas).
 */
class PagosController extends Controller
{
    public function index(Request $request)
    {
        $u = $request->attributes->get('auth_user');
        $esAdmin = $u->rol_codigo === 'ADMIN';

        $metodos = DB::table('metodos_pago')
            ->when(!$esAdmin, fn ($q) => $q->where('usuario_id', $u->id))
            ->orderByDesc('id')->get();

        $planes = DB::table('planes_pago')
            ->when(!$esAdmin, fn ($q) => $q->where('usuario_id', $u->id))
            ->orderByDesc('id')->get();

        $transacciones = DB::table('pagos_transacciones as t')
            ->join('metodos_pago as m', 'm.id', '=', 't.metodo_pago_id')
            ->select('t.*', 'm.etiqueta as metodo_etiqueta', 'm.tipo as metodo_tipo')
            ->when(!$esAdmin, fn ($q) => $q->where('t.usuario_id', $u->id))
            ->orderByDesc('t.id')->get();

        return response()->json([
            'metodos'       => $metodos,
            'planes'        => $planes,
            'transacciones' => $transacciones,
        ]);
    }

    public function storeMetodo(Request $request)
    {
        $u = $request->attributes->get('auth_user');
        $d = $request->validate([
            'tipo'            => ['required', 'in:TARJETA,QR,TRANSFERENCIA'],
            'etiqueta'        => ['required', 'string', 'max:80'],
            'ultimos_digitos' => ['nullable', 'string', 'max:10'],
            'titular'         => ['required', 'string', 'max:120'],
            'vencimiento'     => ['nullable', 'string', 'max:10'],
        ], [
            'tipo.in'          => 'El tipo de método debe ser TARJETA, QR o TRANSFERENCIA.',
            'etiqueta.required'=> 'Debe ingresar un alias o etiqueta para el método de pago.',
            'titular.required' => 'El nombre del titular es obligatorio.',
        ]);

        $id = DB::table('metodos_pago')->insertGetId(array_merge($d, [
            'usuario_id' => $u->id,
            'activo'     => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]));

        return response()->json(['message' => 'Método de pago registrado correctamente.', 'id' => $id], 201);
    }

    public function storePlan(Request $request)
    {
        $u = $request->attributes->get('auth_user');
        $d = $request->validate([
            'concepto'       => ['required', 'string', 'max:160'],
            'monto_total'    => ['required', 'numeric', 'min:10'],
            'cuotas_totales' => ['required', 'integer', 'min:2', 'max:12'],
        ], [
            'concepto.required'  => 'El concepto del plan de pagos es obligatorio.',
            'monto_total.min'    => 'El monto total debe ser al menos Bs 10.',
            'cuotas_totales.min' => 'Un plan de pagos debe tener entre 2 y 12 cuotas.',
        ]);

        $id = DB::table('planes_pago')->insertGetId(array_merge($d, [
            'usuario_id'     => $u->id,
            'cuotas_pagadas' => 0,
            'estado'         => 'ACTIVO',
            'created_at'     => now(),
            'updated_at'     => now(),
        ]));

        return response()->json(['message' => 'Plan de pagos creado correctamente.', 'id' => $id], 201);
    }

    public function pagar(Request $request)
    {
        $u = $request->attributes->get('auth_user');
        $d = $request->validate([
            'metodo_pago_id' => ['required', 'integer', 'exists:metodos_pago,id'],
            'plan_pago_id'   => ['nullable', 'integer', 'exists:planes_pago,id'],
            'concepto'       => ['required', 'string', 'max:160'],
            'monto'          => ['required', 'numeric', 'min:1'],
        ], [
            'metodo_pago_id.exists' => 'Debe seleccionar un método de pago válido.',
            'concepto.required'     => 'El concepto del pago es obligatorio.',
            'monto.min'             => 'El monto a pagar debe ser mayor a 0.',
        ]);

        $tipoPago = 'UNICO';
        $numCuota = 1;
        $montoFinal = (float) $d['monto'];
        $conceptoFinal = $d['concepto'];

        if (!empty($d['plan_pago_id'])) {
            $plan = DB::table('planes_pago')->where('id', $d['plan_pago_id'])->first();
            if (!$plan || $plan->cuotas_pagadas >= $plan->cuotas_totales) {
                return response()->json(['message' => 'Este plan de pagos ya fue completado en su totalidad.'], 422);
            }
            $tipoPago = 'CUOTA';
            $numCuota = $plan->cuotas_pagadas + 1;
            $montoFinal = round($plan->monto_total / $plan->cuotas_totales, 2);
            $conceptoFinal = "Cuota {$numCuota}/{$plan->cuotas_totales} - {$plan->concepto}";

            DB::table('planes_pago')->where('id', $plan->id)->update([
                'cuotas_pagadas' => $numCuota,
                'estado'         => $numCuota >= $plan->cuotas_totales ? 'COMPLETADO' : 'ACTIVO',
                'updated_at'     => now(),
            ]);
        }

        $ref = 'DEDTE-' . strtoupper(Str::random(8));
        $id = DB::table('pagos_transacciones')->insertGetId([
            'usuario_id'     => $u->id,
            'metodo_pago_id' => $d['metodo_pago_id'],
            'plan_pago_id'   => $d['plan_pago_id'] ?? null,
            'concepto'       => $conceptoFinal,
            'tipo_pago'      => $tipoPago,
            'numero_cuota'   => $numCuota,
            'monto'          => $montoFinal,
            'referencia'     => $ref,
            'estado'         => 'PAGADO',
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);

        DB::table('bitacora_auditoria')->insert([
            'usuario_id'    => $u->id,
            'email_intento' => $u->email,
            'accion'        => 'PAGO_ELECTRONICO',
            'recurso'       => '/api/pagos/transacciones',
            'metodo'        => 'POST',
            'ip'            => $request->ip(),
            'exito'         => true,
            'detalle'       => "Ref {$ref} por Bs {$montoFinal}",
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        return response()->json([
            'message'    => "Pago procesado exitosamente. Referencia: {$ref} (Bs {$montoFinal}).",
            'referencia' => $ref,
            'id'         => $id,
        ], 201);
    }
}
