const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// 🔐 Variables de entorno
const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

const userStates = {};

// =============================
// 🔹 VERIFICACIÓN WEBHOOK
// =============================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("Webhook verificado");
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
});

// =============================
// 🔹 RECIBIR MENSAJES
// =============================
app.post("/webhook", async (req, res) => {
  try {

    // 🔴 FILTRO 1: Verificar que exista mensaje real
    if (
      !req.body.entry ||
      !req.body.entry[0].changes ||
      !req.body.entry[0].changes[0].value.messages ||
      !req.body.entry[0].changes[0].value.messages[0]
    ) {
      return res.sendStatus(200);
    }

    const message = req.body.entry[0].changes[0].value.messages[0];

    // 🔴 FILTRO 2: Solo aceptar texto
    if (message.type !== "text") {
      return res.sendStatus(200);
    }

    // 🔴 FILTRO 3: Evitar que el bot se responda solo
    if (message.from === PHONE_NUMBER_ID) {
      return res.sendStatus(200);
    }

    const text = message.text?.body || "";
    const userMessage = text.toLowerCase().trim();
    const messageId = message.id;

    let raw = message.from;

    // 🔴 Normalizar número México
    if (raw.startsWith("521")) {
      raw = "52" + raw.slice(3);
    }

    let from =
      "+52 " +
      raw.slice(2, 5) + " " +
      raw.slice(5, 8) + " " +
      raw.slice(8);

    // 🔴 Crear estado si no existe
    if (!userStates[from]) {
      userStates[from] = { step: "menu", lastMessageId: null };
    }

    // 🔴 FILTRO 4: Evitar mensajes duplicados
    if (userStates[from].lastMessageId === messageId) {
      return res.sendStatus(200);
    }

    userStates[from].lastMessageId = messageId;

    let responseText = "";

    const mainMenu = `👋 Hola. Bienvenido a Beta Procesos, tu aliado en limpieza profesional.

1️⃣ Información Productos
2️⃣ Cotización
3️⃣ Facturación
4️⃣ Rastreo
5️⃣ Compras
6️⃣ Ficha técnica / Hoja de seguridad
7️⃣ Reclutamiento
8️⃣ Dirección tienda Celaya
9️⃣ Quejas`;

    // =============================
    // 🔴 VOLVER AL MENÚ GLOBAL
    // =============================
    if (userMessage === "0") {
      userStates[from].step = "menu";
      responseText = mainMenu;
    }

    // =============================
    // 🔹 MENÚ PRINCIPAL
    // =============================
    else if (userStates[from].step === "menu") {

      if (userMessage === "1") {
        userStates[from].step = "info_productos";
        responseText =
`📦 Información de Productos
Comparte:
Nombre:
Empresa:
Estado:
Teléfono:
Correo:
Producto deseado:
Escribe 0 para volver al menú.`;
      }

      else if (userMessage === "2") {
        userStates[from].step = "cotizacion";
        responseText =
`💰 Cotización
Indícanos el giro:
A) Hotel
B) Restaurante
C) Hospital
D) Metalmecánica
E) Invernadero
F) Escuelas

¿Qué tipo de suciedad desea eliminar?
¿En qué tipo de superficie?
¿Qué tipo de producto desea adquirir?

Escribe 0 para volver al menú.`;
      }

      else if (userMessage === "3") {
        responseText =
`🧾 Facturación
Envíanos tu constancia de situación fiscal y en caso de refacturación el número de factura al correo:
info@betaprocesos.com.mx

Escribe 0 para volver al menú.`;
      }

      else if (userMessage === "4") {
        responseText =
`🚚 Rastreo
Por el momento no contamos con tienda web.
Escribe 0 para volver al menú.`;
      }

      else if (userMessage === "5") {
        responseText =
`🛒 Compras
Contacto:
staffcompras@betaprocesos.com.mx
Escribe 0 para volver al menú.`;
      }

      else if (userMessage === "6") {
        userStates[from].step = "ficha";
        responseText =
`📄 Ficha Técnica
Comparte:
Razón social:
Empresa:
Ciudad:
Teléfono:
Correo:
Persona que atenderá al ejecutivo:

Escribe 0 para volver al menú.`;
      }

      else if (userMessage === "7") {
        responseText =
`👥 Reclutamiento
Envíanos tu CV a:
fvazquez@betaprocesos.com.mx

Escribe 0 para volver al menú.`;
      }

      else if (userMessage === "8") {
        responseText =
`📍 Sucursal Principal:
Av. México–Japón No.146, Col. Ciudad Industrial, Celaya, Gto.

Sucursal 2 de abril:
Av. 2 de abril #230 local 208 Col. Villa de los Reyes, Celaya, Gto.

Horario:
L-V 8:00am - 6:00pm
Sáb 8:00am - 2:00pm

Escribe 0 para volver al menú.`;
      }

      else if (userMessage === "9") {
        userStates[from].step = "quejas";
        responseText =
`📢 Área de Quejas
Q1 Productos
Q2 Unidades

Escribe Q1 o Q2`;
      }

      else {
        responseText = mainMenu;
      }
    }

    // =============================
    // 🔹 QUEJAS
    // =============================
    else if (userStates[from].step === "quejas") {

      if (userMessage === "q1") {
        userStates[from].step = "queja_producto";
        responseText = "📝 Escribe tu queja sobre el producto.";
      }

      else if (userMessage === "q2") {
        userStates[from].step = "queja_unidad";
        responseText = "📝 Escribe tu queja sobre la unidad.";
      }

      else {
        responseText = "❌ Opción inválida. Escribe Q1 o Q2.";
      }
    }

    else if (userStates[from].step === "queja_producto") {

      console.log("Queja producto:", text);

      responseText =
`✅ Gracias por tu reporte.
Daremos seguimiento inmediato.

Escribe 0 para volver al menú.`;

      userStates[from].step = "menu";
    }

    else if (userStates[from].step === "queja_unidad") {

      console.log("Queja unidad:", text);

      responseText =
`✅ Gracias por tu reporte.
Indícanos ubicación, hora y número de unidad.

Escribe 0 para volver al menú.`;

      userStates[from].step = "menu";
    }

    else if (
      userStates[from].step === "info_productos" ||
      userStates[from].step === "cotizacion" ||
      userStates[from].step === "ficha"
    ) {

      console.log("Solicitud:", text);

      responseText =
`✅ Hemos recibido tu información.
Un asesor se pondrá en contacto contigo.

Escribe 0 para volver al menú.`;

      userStates[from].step = "menu";
    }

    // =============================
    // 🔹 ENVIAR RESPUESTA
    // =============================
    if (responseText !== "") {
      await axios.post(
        `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: "whatsapp",
          to: raw,
          text: { body: responseText }
        },
        {
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            "Content-Type": "application/json"
          }
        }
      );
    }

    res.sendStatus(200);

  } catch (error) {
    console.error(error.response?.data || error);
    res.sendStatus(500);
  }
});

// 🔹 IMPORTANTE PARA RENDER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Servidor corriendo en puerto " + PORT);
});