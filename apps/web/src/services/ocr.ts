/* Lectura de capturas en el dispositivo con Tesseract.js (migrado de legacy/index.html).
   La imagen nunca sale del dispositivo: solo el texto revisado por la persona. */

type Progreso = (pct: number) => void;

export async function leerCaptura(archivo: File, onProgreso?: Progreso): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("spa", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgreso?.(Math.round(m.progress * 100));
    },
  });
  try {
    const { data } = await worker.recognize(archivo);
    return data.text.replace(/\n{3,}/g, "\n\n").trim();
  } finally {
    await worker.terminate();
  }
}
