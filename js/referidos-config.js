/* ============================================================
   CONFIGURACIÓN DEL SISTEMA DE REFERIDOS — referidos-config.js
   ------------------------------------------------------------
   Aquí está TODO lo que puedes necesitar cambiar, en un solo lugar.

   MODO
     "demo"      → datos de mentira (no se conecta a nada). Sirve para ver y
                   probar el diseño. Aparecen unos botones de "simular".
     "supabase"  → el sistema real, conectado a la base de datos.
                   (se activa en la Fase 5)

   SEGURIDAD
     La clave "sb_publishable_..." es PÚBLICA: está hecha para ir dentro de
     la página. Lo que protege los datos son las reglas de la base de datos.
     NUNCA pegues aquí la clave "secret" ni la "service_role" de Supabase.
   ============================================================ */
window.REFERIDOS_CONFIG = {
  MODO: "supabase",

  SUPABASE_URL: "https://mpoqxmlqbkyfexjnnkoj.supabase.co",
  SUPABASE_CLAVE_PUBLICA: "sb_publishable_PIJ6dLF8hr6JzCja1_0jpQ_2zqJtyFj",

  // Dirección pública de la página: es la base de los enlaces de referido
  // (…/?ref=CODIGO). Si algún día compras un dominio propio, cámbiala aquí.
  URL_PUBLICA: "https://ayrc1920-wq.github.io/cuerno-navideno-moto/",

  // Número de WhatsApp del negocio (para canjear los cupones)
  WHATSAPP: "573212122689"
};
