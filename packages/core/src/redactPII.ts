/* Oculta datos personales antes de que la evidencia salga del dispositivo (FR-021, Constitución §I).
   Los números de remitente del estafador NO se ocultan: son indicadores a verificar (extraerNumeros). */

export type TipoOculto = "tarjeta" | "codigo" | "documento" | "cuenta" | "correo" | "parametros_url";

export interface ResultadoRedaccion {
  texto: string;
  ocultos: { tipo: TipoOculto; cantidad: number }[];
}

const marca = (tipo: TipoOculto) => `[DATO OCULTO:${tipo}]`;

function luhnValido(digitos: string): boolean {
  let suma = 0;
  let doble = false;
  for (let i = digitos.length - 1; i >= 0; i--) {
    let n = digitos.charCodeAt(i) - 48;
    if (doble) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    suma += n;
    doble = !doble;
  }
  return suma % 10 === 0;
}

export function redactPII(entrada: string): ResultadoRedaccion {
  const conteo = new Map<TipoOculto, number>();
  const sumar = (t: TipoOculto) => conteo.set(t, (conteo.get(t) ?? 0) + 1);
  let texto = entrada;

  // 1. URLs: conservar esquema + host + ruta; ocultar query y fragmento.
  texto = texto.replace(/\b((?:https?:\/\/|www\.)[^\s?#<>"']+)([?#][^\s<>"']*)/gi, (_m, base: string) => {
    sumar("parametros_url");
    return `${base}?[PARÁMETROS OCULTOS]`;
  });

  // 2. Correos electrónicos.
  texto = texto.replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, () => {
    sumar("correo");
    return marca("correo");
  });

  // 3. Tarjetas: 13–19 dígitos (con espacios o guiones) que pasan Luhn.
  texto = texto.replace(/\b\d(?:[ -]?\d){12,18}\b/g, (m) => {
    const d = m.replace(/\D/g, "");
    if (d.length >= 13 && d.length <= 19 && luhnValido(d)) {
      sumar("tarjeta");
      return marca("tarjeta");
    }
    return m;
  });

  // 4. Códigos/claves/OTP junto a su palabra clave.
  texto = texto.replace(
    /\b(c[oó]digo|clave|contrase[nñ]a|token|otp|pin)\b([^\d\n]{0,25})(\d{4,8})\b/gi,
    (_m, palabra: string, medio: string) => {
      sumar("codigo");
      return `${palabra}${medio}${marca("codigo")}`;
    },
  );

  // 5. Documento de identidad junto a su palabra clave.
  texto = texto.replace(
    /\b(c[eé]dula|c\.?c\.?|documento|identificaci[oó]n|nit|pasaporte)\b([^\d\n]{0,20})(\d[\d.]{4,13}\d)\b/gi,
    (_m, palabra: string, medio: string) => {
      sumar("documento");
      return `${palabra}${medio}${marca("documento")}`;
    },
  );

  // 6. Cuentas bancarias junto a su palabra clave.
  texto = texto.replace(
    /\b(cuenta|cta\.?|ahorros|corriente)\b([^\d\n]{0,20})(\d[\d-]{5,20}\d)\b/gi,
    (_m, palabra: string, medio: string) => {
      sumar("cuenta");
      return `${palabra}${medio}${marca("cuenta")}`;
    },
  );

  return { texto, ocultos: [...conteo].map(([tipo, cantidad]) => ({ tipo, cantidad })) };
}
