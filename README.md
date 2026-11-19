# INF513 · Proyecto Final (#2) — Sistema Web Integral DEDTE-UAGRM (Laravel + React & API RESTful)

**Universidad Autónoma Gabriel René Moreno (UAGRM) — FICCT**  
**Asignatura:** INF513 - Tecnología Web (Gestión 2026-2)  
**Docente:** Ing. Evans Balcázar Veizaga  
**Grupo:** `#11 SA` — Duran Marcelo Kelly Alisson (`221044434`) · Quispe Delgado Julio Cesar (`219198322`)

---

## Arquitectura de 3 Capas
1. **Capa de Presentación (Cliente):** React + Vite + Tailwind CSS + Axios (`resources/js/`).
   - 3 Temas Dinámicos (**Niños**, **Jóvenes**, **Adultos**) + **Modo Día / Noche / Auto (por horario)**.
   - Accesibilidad WCAG: **Escalado tipográfico (`90%–130%`)** y **Alto Contraste**.
   - **Búsqueda Global predictiva** en el Header y **Contador de Visitas Persistente** en el Footer de cada vista.
2. **Capa de Lógica de Negocio (Servidor):** Laravel 13 API RESTful (`routes/api.php`, `app/Http/Controllers/Api/`).
   - Autenticación Bearer Token (`ApiTokenAuth`) + Matriz de Control de Acceso RBAC (`CheckPermission`).
   - 4 Roles (`ADMIN`, `DIRECTIVO`, `ANALISTA`, `DOCENTE`) con **Menú Dinámico desde BD** (`menu_items`).
   - Bitácora de Auditoría (`bitacora_auditoria`: logins exitosos, fallidos, IP, accesos denegados y recursos más visitados).
   - Validaciones estrictas cliente + servidor 100% en Español.
   - Módulo de Pagos Electrónicos (métodos de pago, pagos únicos y planes de cuotas).
3. **Capa de Persistencia:** PostgreSQL (`db_grupo11sa` en `mail.tecnoweb.org.bo:5432`) / SQLite local para pruebas rápidas.

---

## Usuarios de Demostración (Clave universal: `12345678`)
| Rol | Correo | Permisos |
| :--- | :--- | :--- |
| **ADMIN** | `admin@dedte.uagrm.edu.bo` | Acceso total (10 módulos) |
| **DIRECTIVO** | `directivo@dedte.uagrm.edu.bo` | Dashboard, Consultas, Históricos, Reportes, Bitácora, Pagos |
| **ANALISTA** | `analista@dedte.uagrm.edu.bo` | Gestión operativa de Entornos, Apertura, Monitoreo, Riesgo, Históricos, Reportes, Pagos |
| **DOCENTE** | `docente@dedte.uagrm.edu.bo` | Dashboard, Apertura, Monitoreo, Riesgo y Pagos (5 módulos) |

---

## Ejecución Local (Windows)
```powershell
cd 2026-2_INF513-P2_grupo11sa
php artisan migrate --force
php artisan db:seed --class=DedteSeeder --force
npm run build
php artisan serve
# Abrir http://127.0.0.1:8000
```

## Despliegue en `tecnoweb.org.bo` (PostgreSQL)
En `.env` configurar:
```env
DB_CONNECTION=pgsql
DB_HOST=mail.tecnoweb.org.bo
DB_PORT=5432
DB_DATABASE=db_grupo11sa
DB_USERNAME=grupo11sa
DB_PASSWORD=grup11grup11*
```
Y ejecutar `composer install --no-dev`, `npm ci && npm run build`, `php artisan migrate --force && php artisan db:seed --class=DedteSeeder --force`.
