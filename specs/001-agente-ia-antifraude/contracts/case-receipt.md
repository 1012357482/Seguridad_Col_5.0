# Contract: Comprobante de caso y verificación

**Requisitos**: FR-014–FR-017, SC-004 · **Formato**: `identifica-tu-fraude/comprobante@1`

## Estructura (JSON descargable)

```json
{
  "formato": "identifica-tu-fraude/comprobante@1",
  "caso": {
    "id": "IF-20261020-7K2M9Q",
    "creadoEn": "2026-10-20T23:41:05.123Z",
    "huellaEvidencia": "<sha256 hex>",
    "tipoEvidencia": "texto",
    "veredicto": { "…": "Veredicto sin texto de evidencia" },
    "previaOwner": "<sha256 hex | INICIO>",
    "previaGlobal": "<sha256 hex | INICIO>",
    "hashEntrada": "<sha256 hex>"
  },
  "firma": "<Ed25519 base64 sobre hashEntrada (bytes hex-decodificados)>",
  "claveId": "<primeros 16 hex de SHA-256 de la clave pública DER>",
  "clavePublicaPem": "-----BEGIN PUBLIC KEY-----…"
}
```

La vista imprimible (PDF desde el navegador) muestra lo mismo en lenguaje legible + QR con el ID de caso y la leyenda: *"Soporte para la persona; no constituye prueba pericial. Versión de prueba: el caso puede no estar en el servidor tras una actualización; este comprobante sigue siendo verificable."*

## JSON canónico

`hashEntrada = SHA-256(UTF-8(canonical(caso sin hashEntrada)))`, donde `canonical` = JSON con claves ordenadas lexicográficamente en todos los niveles, sin espacios, números sin ceros sobrantes (RFC 8785 JCS). Implementado una sola vez en `packages/core/src/canonical.ts` y usado por cliente y servidor.

## Huella de evidencia

`huellaEvidencia = SHA-256(UTF-8(normalize(texto)))`, `normalize` = Unicode NFC → `trim` → espacios en blanco consecutivos a un solo espacio. Se calcula sobre el texto **original revisado por la persona** (no el redactado), en el dispositivo.

## Verificación

1. `hashEntrada` recalculado == `caso.hashEntrada` → si no: "contenido alterado".
2. `Ed25519.verify(clavePublicaPem, hex(hashEntrada), firma)` → si no: "firma inválida".
3. `claveId` coincide con la clave pública → si no: "clave no corresponde".
4. (Opcional, en servidor) caso existe y es idéntico → `enBaseDeDatos`.
5. Cadena (`GET /casos`): para cada par consecutivo, `previaOwner` == `hashEntrada` del anterior; huecos registrados en `deleted_ranges` se reportan como "borrado por la persona", no como alteración.

La verificación 1–3 también se ejecuta en el navegador (WebCrypto Ed25519 donde esté disponible; si no, vía `POST /comprobantes/verificar`).
