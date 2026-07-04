# Arquitectura y decisiones de seguridad

## Alcance

El producto será un SaaS multiempresa. Cada petición autenticada obtiene `user_id`, `empresa_id` y permisos desde el token validado; el cliente nunca selecciona ni dicta su rol. El backend establece el contexto de tenant dentro de una transacción PostgreSQL y Row-Level Security aplica el aislamiento incluso si una consulta omite accidentalmente el filtro.

## Diseño operativo

Se usará un monolito modular NestJS con módulos de identidad, empresas, clientes, ventas, cobranzas, campañas, archivos, reportes y auditoría. El worker de correo se ejecutará como un segundo proceso del mismo artefacto. Esta separación permite escalar el worker sin asumir el coste operativo de microservicios.

Los permisos se modelarán por capacidades, no por verbos HTTP globales. `maestro` administra su empresa; `colaborador` opera registros propios o asignados; `solo_lectura` consulta paneles y exportaciones autorizadas. Los módulos habilitados se almacenarán por empresa.

## Correcciones al modelo original

- Todas las entidades de negocio incluyen `empresa_id` obligatorio.
- Las cuotas programadas y los pagos realizados son entidades distintas.
- Los importes usan `numeric(18,2)`, moneda ISO y restricciones de valores positivos.
- Fechas de negocio usan `date`; eventos técnicos usan `timestamptz` en UTC.
- La bitácora comercial, auditoría, consentimiento de marketing y lista de supresión son persistentes.
- Las eliminaciones lógicas no dependen de cascadas físicas.
- Los envíos usan claves de idempotencia, bloqueo concurrente, backoff y límites por proveedor.
- Tokens OAuth y secretos se cifran; nunca se guardan contraseñas de correo.

## Seguridad mínima de producción

Contraseñas con Argon2id, access tokens breves, refresh tokens rotatorios y revocables, rate limiting, validación estricta de entrada, logs sin secretos, CSP, CORS restringido y auditoría inmutable. PostgreSQL no se expondrá públicamente. Backups cifrados se enviarán a Object Storage y se probará periódicamente su restauración.

## Restricciones de OCI Free Tier

Una sola instancia Ampere reduce disponibilidad. La infraestructura automatizará reconstrucción, health checks y backups, pero no puede prometer alta disponibilidad real sin recursos adicionales. El servicio de correo se integrará con proveedores externos; no se operará un servidor SMTP propio desde la instancia.

