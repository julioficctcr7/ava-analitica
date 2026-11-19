<?php

namespace Tests\Feature;

use Database\Seeders\DedteSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DedteApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DedteSeeder::class);
    }

    public function test_login_rbac_menu_dinamico_y_modulos_completos(): void
    {
        // 1. Login fallido (validación y bitácora)
        $bad = $this->postJson('/api/auth/login', [
            'email'    => 'admin@dedte.uagrm.edu.bo',
            'password' => 'clave-mala',
        ]);
        $bad->assertStatus(401);

        // 2. Login ADMIN -> recibe menú completo (10 módulos)
        $admin = $this->postJson('/api/auth/login', [
            'email'    => 'admin@dedte.uagrm.edu.bo',
            'password' => '12345678',
        ]);
        $admin->assertStatus(200)->assertJsonPath('usuario.rol_codigo', 'ADMIN');
        $this->assertCount(10, $admin->json('menu'));
        $adminToken = $admin->json('token');

        // 3. Login DOCENTE -> recibe menú reducido (5 módulos) y 403 en /api/admin
        $doc = $this->postJson('/api/auth/login', [
            'email'    => 'docente@dedte.uagrm.edu.bo',
            'password' => '12345678',
        ]);
        $doc->assertStatus(200)->assertJsonPath('usuario.rol_codigo', 'DOCENTE');
        $this->assertCount(5, $doc->json('menu'));
        $docToken = $doc->json('token');

        $this->withHeader('Authorization', "Bearer {$docToken}")
            ->getJson('/api/admin')
            ->assertStatus(403);

        // 4. Dashboard KPIs (21 asignaturas, 802 estudiantes), Búsqueda Global, Visitas Footer, Pagos y Bitácora
        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/dashboard')
            ->assertStatus(200)
            ->assertJsonPath('kpis.total_aulas', 21)
            ->assertJsonPath('kpis.total_inscritos', 802)
            ->assertJsonPath('kpis.total_aprobados', 446)
            ->assertJsonPath('kpis.total_reprobados', 356);

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/buscar?q=INF110')
            ->assertStatus(200)
            ->assertJsonCount(4, 'resultados');

        $this->postJson('/api/visitas/registrar', ['ruta' => '/dashboard', 'titulo' => 'Dashboard'])
            ->assertStatus(200)
            ->assertJsonPath('visitas', 2);

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/pagos')
            ->assertStatus(200)
            ->assertJsonCount(2, 'metodos')
            ->assertJsonCount(1, 'planes');

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/bitacora')
            ->assertStatus(200)
            ->assertJsonPath('resumen.logins_fallidos', 1)
            ->assertJsonPath('resumen.accesos_denegados', 1);
    }
}
