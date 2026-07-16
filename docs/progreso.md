# Seguimiento del blueprint CRM

Última actualización: 16 de julio de 2026.

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
- [x] MFA TOTP: setup, activación, login con código y desactivación.
- [x] Recuperación de contraseña con token hash, expiración y revocación de sesiones.
- [x] Rate limiting en autenticación para provision, login y refresh.
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
- [x] Editar y eliminar clientes desde la interfaz.
- [x] Ficha lateral básica de cliente: datos generales y acciones.
- [x] API de resumen financiero por cliente.
- [x] Ficha lateral financiera en interfaz: resumen, nueva venta y pago parcial.
- [x] Bitácora en ficha lateral: listar y crear notas reales.
- [x] API de ventas, cuotas, pagos parciales y cálculo de saldos por moneda.
- [x] Alertas reales de vencimiento y toggle por cliente.
- [x] Prueba financiera end-to-end: venta, cuotas, pago parcial y bloqueo de sobrepago.
- [x] Pruebas financieras de concurrencia.

## Sprint 4: Marketing y analítica - Pendiente

- [x] Modelo inicial para supresión y consentimiento de marketing.
- [x] API de borradores: consultar y editar campañas antes del encolado.
- [ ] OAuth2 para proveedores de correo.
- [ ] Editor de campañas y archivos en Object Storage.
- [x] Cola idempotente, throttling, reintentos y worker.
- [x] Panel de errores y reconexión.
- [x] Dashboard separado por USD y ARS con datos reales.
- [x] Exportaciones Excel mediante streams.
- [x] Exportación CSV de clientes mediante endpoint protegido y stream.
- [x] Pruebas de carga, rebotes y recuperación de errores.

## Validaciones realizadas

- [x] TypeScript typecheck en API y frontend.
- [x] Tres pruebas de esquemas de autenticación.
- [x] Una prueba de renderizado del frontend.
- [x] Dos pruebas de esquemas de usuarios.
- [x] Dos pruebas de esquemas de clientes.
- [x] Dos pruebas de esquemas financieros.
- [x] Build de producción de API y frontend.
- [x] Build de frontend con ficha lateral, edición y eliminación de clientes.
- [x] Build de frontend con ficha financiera conectada.
- [x] Evaluación independiente del diseño: `PASS`.
- [x] Pruebas con PostgreSQL y Docker.
- [x] Prueba end-to-end de empresa, sesión y clientes.
- [x] Prueba end-to-end CRUD de clientes: crear, leer, editar y eliminación lógica con 404 posterior.
- [x] Prueba end-to-end financiera: venta con 2 cuotas, pago parcial y rechazo de sobrepago.
- [x] Prueba end-to-end de bitácora: crear y listar nota con autor.
- [x] Prueba end-to-end de alertas reales: saldo vencido calculado desde cuotas y toggle a desactivada.
- [x] Prueba end-to-end de concurrencia financiera: dos pagos simultáneos sobre la misma cuota dejan un pago aceptado y un sobrepago rechazado.
- [x] Prueba end-to-end de dashboard financiero: totales USD y ARS separados con cobrado y saldo real.
- [x] Prueba end-to-end de rate limiting: login repetido devuelve HTTP 429 tras superar el umbral.
- [x] Prueba end-to-end de recuperación de contraseña: respuesta genérica, reset, token no reutilizable y refresh anterior revocado.
- [x] Prueba end-to-end de MFA TOTP: setup, activación, bloqueo sin código, login con código y desactivación.
- [x] Prueba end-to-end de marketing queue: encolado idempotente, supresión por consentimiento, throttling y reintento con fallo simulado.
- [x] Prueba end-to-end de panel de errores: listar entrega fallida, reintentar y procesar correctamente.
- [x] Prueba end-to-end de rebotes y carga: rebote suprime email en campañas futuras y lote de 20 entregas respeta idempotencia/throttling.
- [x] Prueba end-to-end de exportación CSV: descarga protegida con escape de comas y campos financieros visibles.
- [x] Prueba end-to-end de exportación Excel: descarga protegida SpreadsheetML con escape XML y campos financieros visibles.
- [x] Prueba end-to-end de administración de usuarios: maestro crea usuario y colaborador recibe 403 en `/users`.
- [x] Stack Docker completo y migraciones idempotentes.
- [ ] Auditoría de seguridad previa a producción.
