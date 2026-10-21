/* Almacenamiento temporal del contenido compartido (Cache Storage, accesible desde el SW y la página).
   Se borra apenas la página lo lee. */

export const CACHE_COMPARTIDO = "itf-compartido-v1";
const CLAVE_DATOS = "/__compartido/datos";
const CLAVE_AUDIO = "/__compartido/audio";

export interface Compartido {
  texto: string;
  audio?: File;
}

export async function guardarCompartido(form: FormData): Promise<void> {
  const cache = await caches.open(CACHE_COMPARTIDO);
  const partes = ["title", "text", "url"].map((k) => String(form.get(k) ?? "").trim()).filter(Boolean);
  await cache.put(CLAVE_DATOS, new Response(JSON.stringify({ texto: [...new Set(partes)].join("\n") })));
  const audio = form.get("audio");
  if (audio instanceof File && audio.size > 0) {
    await cache.put(
      CLAVE_AUDIO,
      new Response(audio, { headers: { "content-type": audio.type || "audio/ogg", "x-nombre": encodeURIComponent(audio.name || "audio") } }),
    );
  }
}

export async function leerCompartido(): Promise<Compartido | null> {
  if (!("caches" in globalThis)) return null;
  const cache = await caches.open(CACHE_COMPARTIDO);
  const datos = await cache.match(CLAVE_DATOS);
  if (!datos) return null;
  const { texto } = (await datos.json()) as { texto: string };
  const resAudio = await cache.match(CLAVE_AUDIO);
  let audio: File | undefined;
  if (resAudio) {
    const blob = await resAudio.blob();
    const nombre = decodeURIComponent(resAudio.headers.get("x-nombre") ?? "audio");
    audio = new File([blob], nombre, { type: resAudio.headers.get("content-type") ?? blob.type });
  }
  await caches.delete(CACHE_COMPARTIDO);
  return { texto, audio };
}
