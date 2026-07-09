# Seguimiento del blueprint CRM

Última actualización: 9 de julio de 2026.

Los elementos solo se marcan como completados cuando tienen implementación y validación verificable. Una interfaz de demostración no implica que su integración con backend esté terminada.

## Sprint 1: Infraestructura - En progreso

- [x] Repositorio Git y estructura monorepo.
- [x] Docker Compose para PostgreSQL 16.
- [x] Migraciones iniciales PostgreSQL.
- [x] Índices principales y claves multiempresa.
- [x] Row-Level Security y endurecimiento por tenant.
- [x] Compilación, typecheck y pruebas locales sin base de datos.
- [x] Ejecutar migraciones sobre PostgreSQL real.
- [x] Pruebas de aislamiento RLS contra una base real.
- [x] Contenedores de API y frontend.
- [ ] Infraestructura y despliegue en Oracle Cloud.

Docker Desktop y PostgreSQL 16 están operativos localmente.

## Sprint 2: Autenticación y permisos - En progreso

- [x] Creación de empresa y usuario maestro.
- [x] Contraseñas con Argon2id.
- [x] Access tokens JWT de duración corta.
- [x] Refresh tokens rotatorios almacenados como hash.
- [x] Cierre y revocación de sesiones.
- [x] Roles `maestro`, `colaborador` y `solo_lectura`.
- [x] Guard de autenticación y control de roles.
- [x] Activación de módulos por empresa en la base de datos.
- [x] Administración CRUD básica de usuarios: listar, crear, actualizar rol/estado y revocar tokens por cambio de rol/estado.
- [x] Interfaz conectada al login real mediante `/api/auth/login`.
- [ ] MFA, recuperación de contraseña y rate limiting.
- [x] Prueba integral de rotación y revocación de refresh tokens.
- [x] Prueba de aislamiento entre dos empresas con PostgreSQL RLS.

## Sprint 3: Operación comercial - En progreso

- [x] Modelo corregido de clientes, ventas, cuotas, pagos y notas.
- [x] Endpoint para crear clientes.
- [x] Endpoint para listar clientes del tenant.
- [x] Dashboard y listado visual responsive con datos de demostración.
- [x] Búsqueda visual y estados de alerta.
- [x] CRUD API completo de clientes y eliminación lógica.
- [x] Integración inicial del dashboard/listado de clientes con `/api/customers`.
- [x] Crear clientes desde el frontend con formulario conectado a /api/customers.
- [ ] Editar y eliminar clientes desde la interfaz.
- [ ] Ficha lateral: General, Financiero y Bitácora.
- [ ] Ventas, cuotas, pagos parciales y cálculo de saldos.
- [ ] Alertas reales de vencimiento y toggle por cliente.
- [ ] Pruebas financieras y de concurrencia.

## Sprint 4: Marketing y analítica - Pendiente

- [x] Modelo inicial para supresión y consentimiento de marketing.
- [ ] OAuth2 para proveedores de correo.
- [ ] Editor de campañas y archivos en Object Storage.
- [ ] Cola idempotente, throttling, reintentos y worker.
- [ ] Panel de errores y reconexión.
- [ ] Dashboard separado por USD y ARS con datos reales.
- [ ] Exportaciones CSV y Excel mediante streams.
- [ ] Pruebas de carga, rebotes y recuperación de errores.

## Validaciones realizadas

- [x] TypeScript typecheck en API y frontend.
- [x] Tres pruebas de esquemas de autenticación.
- [x] Una prueba de renderizado del frontend.
- [x] Dos pruebas de esquemas de usuarios.
- [x] Dos pruebas de esquemas de clientes.
- [x] Build de producción de API y frontend.
- [x] Evaluación independiente del diseño: `PASS`.
- [x] Pruebas con PostgreSQL y Docker.
- [x] Prueba end-to-end de empresa, sesión y clientes.
- [x] Prueba end-to-end CRUD de clientes: crear, leer, editar y eliminación lógica con 404 posterior.
- [x] Prueba end-to-end de administración de usuarios: maestro crea usuario y colaborador recibe 403 en `/users`.
- [x] Stack Docker completo y migraciones idempotentes.
- [ ] Auditoría de seguridad previa a producción.

