<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // ===================== RBAC & MENÚ DINÁMICO =====================
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 30)->unique();
            $table->string('nombre', 80);
            $table->string('descripcion', 200)->nullable();
            $table->timestamps();
        });

        Schema::create('permisos', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 60)->unique();
            $table->string('modulo', 60);
            $table->string('descripcion', 200);
        });

        Schema::create('rol_permiso', function (Blueprint $table) {
            $table->foreignId('rol_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignId('permiso_id')->constrained('permisos')->cascadeOnDelete();
            $table->primary(['rol_id', 'permiso_id']);
        });

        Schema::create('menu_items', function (Blueprint $table) {
            $table->id();
            $table->string('titulo', 80);
            $table->string('ruta', 100);
            $table->string('icono', 40);
            $table->string('permiso_codigo', 60);
            $table->integer('orden')->default(1);
        });

        // ===================== CU1: USUARIOS Y PARÁMETROS =====================
        Schema::create('usuarios_dedte', function (Blueprint $table) {
            $table->id();
            $table->string('ci', 20)->unique();
            $table->string('nombre', 100);
            $table->string('apellido', 100);
            $table->string('email', 120)->unique();
            $table->string('password');
            $table->foreignId('rol_id')->constrained('roles');
            $table->string('telefono', 30)->nullable();
            $table->string('estado', 15)->default('ACTIVO');
            $table->string('tema_preferido', 20)->default('adultos');
            $table->string('modo_preferido', 20)->default('auto');
            $table->timestamps();
        });

        Schema::create('api_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios_dedte')->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        Schema::create('parametros_sistema', function (Blueprint $table) {
            $table->id();
            $table->string('clave', 60)->unique();
            $table->string('valor', 120);
            $table->string('descripcion', 255);
            $table->timestamps();
        });

        // ===================== CU2: ENTORNOS MOODLE =====================
        Schema::create('entornos_moodle', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 20)->unique();
            $table->string('nombre', 100);
            $table->string('tipo', 20);
            $table->string('url_base', 200);
            $table->string('version_moodle', 20)->default('5.1 LTS');
            $table->string('estado_conexion', 20)->default('ACTIVO');
            $table->timestamp('ultima_sinc')->useCurrent();
            $table->timestamps();
        });

        // ===================== CU3: APERTURA E INFRAESTRUCTURA (BLOQUE 1) =====================
        Schema::create('aulas_apertura', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entorno_id')->constrained('entornos_moodle');
            $table->string('gestion', 15);
            $table->string('facultad', 100);
            $table->string('carrera', 140);
            $table->integer('nivel')->default(1);
            $table->string('sigla', 20);
            $table->string('grupo', 10);
            $table->string('materia', 150);
            $table->string('docente_codigo', 30);
            $table->string('docente_nombre', 150);
            $table->string('formato_curso', 40)->default('Mosaico 5.1');
            $table->string('carpeta_pedagogica', 30)->default('Auditada');
            $table->string('estado_apertura', 25)->default('APERTURADA');
            $table->integer('tareas_semanales')->default(3);
            $table->date('fecha_apertura')->nullable();
            $table->unique(['entorno_id', 'gestion', 'sigla', 'grupo']);
            $table->timestamps();
        });

        // ===================== CU4: MONITOREO ACADÉMICO (BLOQUES 2 Y 3) =====================
        Schema::create('monitoreo_academico', function (Blueprint $table) {
            $table->id();
            $table->foreignId('aula_id')->constrained('aulas_apertura')->cascadeOnDelete();
            $table->integer('inscritos');
            $table->integer('activos');
            $table->integer('aprobados')->default(0);
            $table->integer('reprobados')->default(0);
            $table->integer('segunda_instancia')->default(0); // 40-50 pts
            $table->integer('sin_nota')->default(0);          // #S/NOT o #REP_0
            $table->decimal('promedio_notas', 5, 2)->default(0);
            $table->decimal('promedio_aprobados', 5, 2)->default(70.00);
            $table->decimal('densidad_pct', 5, 2)->default(0);
            $table->date('fecha_corte')->nullable();
            $table->timestamps();
        });

        // ===================== CU5: DESERCIÓN Y SEMÁFOROS (BLOQUE 4) =====================
        Schema::create('evaluacion_riesgo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('aula_id')->constrained('aulas_apertura')->cascadeOnDelete();
            $table->integer('total_inscritos');
            $table->integer('retiros')->default(0);          // #REP_0 / deserción
            $table->integer('retiros_formales')->default(0); // #RETMA
            $table->integer('en_mora')->default(0);
            $table->integer('alertas_7d')->default(0);       // Nivel 1 (>7d)
            $table->integer('alertas_14d')->default(0);      // Nivel 2 (>14d)
            $table->integer('alertas_21d')->default(0);      // Nivel 3 (>21d)
            $table->decimal('tasa_desercion', 5, 2)->default(0);
            $table->string('semaforo', 10);                  // VERDE, AMARILLO, ROJO
            $table->string('observacion', 255)->nullable();
            $table->date('fecha_evaluacion')->nullable();
            $table->timestamps();
        });

        // ===================== CU7: HISTÓRICOS SEMESTRALES =====================
        Schema::create('historicos_semestrales', function (Blueprint $table) {
            $table->id();
            $table->string('gestion', 15);
            $table->foreignId('entorno_id')->constrained('entornos_moodle');
            $table->string('facultad', 100);
            $table->integer('total_aulas');
            $table->integer('total_inscritos');
            $table->decimal('tasa_aprobacion', 5, 2);
            $table->decimal('tasa_desercion', 5, 2);
            $table->decimal('promedio_general', 5, 2);
            $table->unique(['gestion', 'entorno_id', 'facultad']);
            $table->timestamps();
        });

        // ===================== BITÁCORA Y CONTADOR DE VISITAS =====================
        Schema::create('bitacora_auditoria', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios_dedte')->nullOnDelete();
            $table->string('email_intento', 120)->nullable();
            $table->string('accion', 60);
            $table->string('recurso', 120);
            $table->string('metodo', 10)->default('GET');
            $table->string('ip', 45)->nullable();
            $table->boolean('exito')->default(true);
            $table->string('detalle', 255)->nullable();
            $table->timestamps();
        });

        Schema::create('visitas_pagina', function (Blueprint $table) {
            $table->id();
            $table->string('ruta', 120)->unique();
            $table->string('titulo', 120);
            $table->unsignedBigInteger('contador')->default(0);
            $table->timestamps();
        });

        // ===================== MÓDULO DE PAGOS ELECTRÓNICOS =====================
        Schema::create('metodos_pago', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios_dedte')->cascadeOnDelete();
            $table->string('tipo', 20);
            $table->string('etiqueta', 80);
            $table->string('ultimos_digitos', 10)->nullable();
            $table->string('titular', 120);
            $table->string('vencimiento', 10)->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        Schema::create('planes_pago', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios_dedte')->cascadeOnDelete();
            $table->string('concepto', 160);
            $table->decimal('monto_total', 10, 2);
            $table->integer('cuotas_totales');
            $table->integer('cuotas_pagadas')->default(0);
            $table->string('estado', 20)->default('ACTIVO');
            $table->timestamps();
        });

        Schema::create('pagos_transacciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios_dedte')->cascadeOnDelete();
            $table->foreignId('metodo_pago_id')->constrained('metodos_pago');
            $table->foreignId('plan_pago_id')->nullable()->constrained('planes_pago')->nullOnDelete();
            $table->string('concepto', 160);
            $table->string('tipo_pago', 15);
            $table->integer('numero_cuota')->default(1);
            $table->decimal('monto', 10, 2);
            $table->string('referencia', 60)->unique();
            $table->string('estado', 20)->default('PAGADO');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pagos_transacciones');
        Schema::dropIfExists('planes_pago');
        Schema::dropIfExists('metodos_pago');
        Schema::dropIfExists('visitas_pagina');
        Schema::dropIfExists('bitacora_auditoria');
        Schema::dropIfExists('historicos_semestrales');
        Schema::dropIfExists('evaluacion_riesgo');
        Schema::dropIfExists('monitoreo_academico');
        Schema::dropIfExists('aulas_apertura');
        Schema::dropIfExists('entornos_moodle');
        Schema::dropIfExists('parametros_sistema');
        Schema::dropIfExists('api_tokens');
        Schema::dropIfExists('usuarios_dedte');
        Schema::dropIfExists('menu_items');
        Schema::dropIfExists('rol_permiso');
        Schema::dropIfExists('permisos');
        Schema::dropIfExists('roles');
    }
};
