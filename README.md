# CRM Modular SaaS

CRM web multiempresa diseñado para ejecutarse en Oracle Cloud Infrastructure Free Tier. La implementación usa un monolito modular para reducir consumo de memoria, complejidad operativa y coste.

## Arquitectura decidida

- React y TypeScript para la aplicación web.
- NestJS y TypeScript para API y procesos en segundo plano.
- PostgreSQL 16 con aislamiento por `empresa_id` y Row-Level Security.
- Docker Compose en desarrollo y en una instancia OCI Ampere.
- Oracle Object Storage para adjuntos y copias de seguridad cifradas.

La especificación técnica y las correcciones al blueprint están en [docs/architecture.md](docs/architecture.md).

## Estado

El repositorio está en fase de infraestructura y modelo de dominio. No debe desplegarse todavía como producción.

