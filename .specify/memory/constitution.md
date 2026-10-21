<!--
Sync Impact Report
- Version change: (plantilla sin ratificar) → 1.0.0
- Principles defined:
  - [PRINCIPLE_1_NAME] → I. Privacidad por defecto
  - [PRINCIPLE_2_NAME] → II. Veredictos explicables y honestos
  - [PRINCIPLE_3_NAME] → III. Siempre hay orientación (degradación elegante)
  - [PRINCIPLE_4_NAME] → IV. Independencia de proveedor y costo controlado
  - [PRINCIPLE_5_NAME] → V. Simplicidad, lógica compartida y calidad medible
- Added sections: Seguridad y manejo de datos; Flujo de desarrollo y puertas de calidad
- Removed sections: ninguna
- Templates: plan-template.md (Constitution Check lee este archivo en tiempo de ejecución — sin cambios);
  spec-template.md, tasks-template.md (sin cambios requeridos)
- Follow-up TODOs: ninguno
-->

# Identifica tu fraude Constitution

## Core Principles

### I. Privacidad por defecto

- La evidencia de una persona (texto, captura, audio, relato) MUST NOT salir de su dispositivo
  sin un consentimiento explícito para ese análisis concreto, que diga qué se envía, a quién y
  para qué.
- Los datos personales (claves, códigos, tarjetas, cuentas, documentos) MUST redactarse antes de
  enviarse a cualquier servicio externo, tanto en el cliente como en el servidor.
- El contenido original de la evidencia MUST NOT persistirse; el registro guarda solo huellas,
  veredictos y metadatos.
- Toda funcionalidad MUST respetar los derechos de la Ley 1581 de 2012 (conocer, actualizar,
  rectificar, suprimir) y los permisos MUST ser opcionales, separados y revocables.

**Rationale**: quienes usan el servicio suelen ser víctimas potenciales; exponer su información
repetiría el daño que se intenta prevenir.

### II. Veredictos explicables y honestos

- Todo veredicto MUST incluir nivel (bajo/medio/alto), motivos en lenguaje sencillo, qué hacer y
  dónde denunciar.
- Cada motivo MUST declarar su origen: regla, modelo de IA o fuente abierta (con nombre y fecha
  de consulta).
- El sistema MUST NOT declarar algo como "seguro"; la falta de datos MUST presentarse como
  "sin datos suficientes", nunca como prueba de fraude o de legitimidad.
- Datos simulados MUST NOT mostrarse como reales, y el servicio MUST declarar que orienta y no
  reemplaza a las entidades ni a las autoridades.

**Rationale**: la confianza del público depende de que pueda entender y verificar por qué se le
recomienda algo.

### III. Siempre hay orientación (degradación elegante)

- El motor de reglas local MUST estar siempre disponible, incluso sin conexión o sin
  consentimiento.
- La falla, lentitud o falta de cuota del modelo de IA o de cualquier fuente abierta MUST NOT
  impedir entregar un veredicto; el resultado MUST indicar qué componente no estuvo disponible.
- Cuando reglas e IA discrepen, MUST prevalecer el nivel de riesgo más alto, con la discrepancia
  explicada.

**Rationale**: una persona frente a un posible fraude necesita una respuesta en ese momento, no un
mensaje de error.

### IV. Independencia de proveedor y costo controlado

- El proveedor y el modelo de IA MUST poder cambiarse solo por configuración, sin cambios en la
  interfaz ni en el formato del veredicto; ningún módulo fuera de la capa de IA puede depender de
  un proveedor concreto.
- Cada análisis MUST registrar el proveedor y la versión del modelo usados.
- Mientras el proyecto sea una prueba de concepto, el costo de operación MUST ser cero; cualquier
  servicio con costo o con términos que usen los datos enviados para entrenamiento MUST
  justificarse en `research.md` y reflejarse en el aviso de privacidad.
- Credenciales y secretos MUST vivir solo en secretos del entorno, nunca en el código ni en la
  interfaz.

**Rationale**: los planes gratuitos cambian; el proyecto debe poder migrar sin reescrituras.

### V. Simplicidad, lógica compartida y calidad medible

- La lógica que debe comportarse igual en dispositivo y servidor (reglas, redacción, huellas,
  tipos) MUST existir una sola vez en un paquete compartido.
- No se añaden servicios, capas o dependencias sin una necesidad presente documentada (YAGNI).
- Los cambios en reglas o en el agente MUST evaluarse contra el conjunto dorado de mensajes
  etiquetados; una regresión por debajo de las metas de la spec (detección de fraude ≥ 90 %,
  especificidad ≥ 80 %) bloquea la integración.
- Las pruebas automatizadas MUST NOT consumir cuota de servicios reales (usar proveedor simulado).

**Rationale**: un equipo pequeño mantiene un producto confiable solo si la complejidad es mínima y
la calidad se mide, no se supone.

## Seguridad y manejo de datos

- La evidencia analizada MUST tratarse como dato no confiable: el agente MUST ignorar
  instrucciones contenidas en ella y sus herramientas MUST ser de solo lectura.
- Los enlaces sospechosos MUST NOT abrirse ni visitarse desde el dispositivo de la persona; se
  verifican por API.
- Las rutas públicas MUST tener límite de uso por origen y validación de entrada con esquemas.
- Los casos guardados MUST encadenarse y firmarse de forma que cualquier alteración o eliminación
  no declarada sea detectable, y el comprobante entregado a la persona MUST ser verificable por
  sí mismo.
- Las estadísticas públicas MUST ser agregadas y anónimas (grupos con un mínimo de casos), sin
  contenido de mensajes ni identificadores.

## Flujo de desarrollo y puertas de calidad

- Toda funcionalidad sigue el flujo Spec Kit: spec → plan → tasks → implementación, y el plan
  MUST pasar el "Constitution Check".
- Ningún cambio se integra a `main` sin pasar CI (lint, tipos, pruebas unitarias y de contrato,
  E2E y build); el despliegue MUST ser automático desde `main` y MUST NOT ocurrir si CI falla.
- La interfaz MUST ser usable desde 360 px de ancho, en español claro, y comunicar el nivel de
  riesgo con texto e íconos además del color (accesibilidad).
- Cambios que afecten datos personales, consentimiento o proveedores externos MUST actualizar el
  aviso de privacidad en el mismo cambio.

## Governance

- Esta constitución prevalece sobre otras prácticas del proyecto. Toda revisión de PR MUST
  verificar su cumplimiento; las excepciones MUST registrarse en "Complexity Tracking" del plan
  con justificación y alternativa descartada.
- Enmiendas: se proponen por PR que modifique este archivo, con el Sync Impact Report actualizado,
  y requieren aprobación de al menos un responsable del proyecto.
- Versionado semántico: MAJOR para eliminar o redefinir principios de forma incompatible, MINOR
  para agregar principios o secciones o ampliar materialmente su guía, PATCH para aclaraciones de
  redacción.
- Revisión de cumplimiento: al cerrar cada funcionalidad y antes de pasar de prueba de concepto a
  producción (en particular el Principio IV sobre costo cero).

**Version**: 1.0.0 | **Ratified**: 2026-10-20 | **Last Amended**: 2026-10-20
