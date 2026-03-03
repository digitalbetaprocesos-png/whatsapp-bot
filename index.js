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
    const message =
      req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) return res.sendStatus(200);

    const text = message.text?.body || "";
    const userMessage = text.toLowerCase().trim();

    let raw = message.from;

    if (raw.startsWith("521")) {
      raw = "52" + raw.slice(3);
    }

    let from =
      "+52 " +
      raw.slice(2, 5) + " " +
      raw.slice(5, 8) + " " +
      raw.slice(8);

    if (!userStates[from]) {
      userStates[from] = { step: "menu" };
    }

    let responseText = "";

    // =============================
    // 🔴 VOLVER AL MENÚ GLOBAL
    // =============================
    if (userMessage === "0" || userMessage === "menu") {
      userStates[from].step = "menu";
      responseText =
`👋 Hola. Bienvenido a Beta Procesos, tu aliado en limpieza profesional.

1️⃣ Información Productos
2️⃣ Cotización
3️⃣ Facturación
4️⃣ Rastreo
5️⃣ Compras
6️⃣ Ficha técnica / Hoja de seguridad
7️⃣ Reclutamiento
8️⃣ Dirección tienda Celaya
9️⃣ Quejas`;
    }

    // =============================
    // 🔹 MENÚ PRINCIPAL
    // =============================
    else if (userStates[from].step === "menu") {

      if (userMessage === "hola") {
        responseText = "👋 Hola. Escribe MENU para ver opciones.";
      }

      else if (userMessage === "1") {
        userStates[from].step = "info_productos";
        responseText =
`📦 Información de Productos
Comparte los siguientes datos:
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
Indícanos el giro de tu empresa:
A) Hotel
B) Restaurante
C) Hospital
D) Metalmecánica
E) Invernadero
F) Escuelas
Escribe 0 para volver al menú.`;
      }

      else if (userMessage === "3") {
        userStates[from].step = "facturacion";
        responseText =
`🧾 Facturación
Con gusto te apoyamos, proporcionanos tu constancia de situación fiscal \ny en caso de refacturación el número de factura involucrada al correo info@betaprocesos.com.mx
Beta, Brillantez Excepcional, Tu Aliado en limpieza profesional :)
Escribe 0 para volver al menú.`;
      }

      else if (userMessage === "4") {
        responseText =
`🚚 Rastreo
Por el momento no contamos con rastreo web.
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
Hola, puedes compartirnos los siguientes datos para vincularte con un ejecutivo y pueda darte más información, por favor:
  Razón social:
  Empresa:
  Ciudad: 
  Teléfono:
  Correo:
  Y nombre de la persona que atenderá a nuestro ejecutivo
Escribe 0 para volver al menú.`;
      }

      else if (userMessage === "7") {
        responseText =
`👥 Reclutamiento
Envía tu CV a:
fvazquez@betaprocesos.com.mx
Escribe 0 para volver al menú.`;
      }

      else if (userMessage === "8") {
        responseText =
`📍 Dirección tienda Celaya
Av. México–Japón No.146
Col. Ciudad Industrial
Celaya, Gto.
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
Lamentamos lo ocurrido y daremos seguimiento inmediato.
Escribe MENU para volver.`;

      userStates[from].step = "menu";
    }

    else if (userStates[from].step === "queja_unidad") {

      console.log("Queja unidad:", text);

      responseText =
`✅ 
Hola, buen día.
Gracias por hacernos llegar este reporte. Lamentamos lo ocurrido y valoramos mucho este tipo de comentarios, ya que nos ayudan a mejorar y a reforzar la seguridad vial.
¿Podría apoyarnos indicándonos la ubicación exacta, la hora aproximada del incidente y, en caso de haberlo identificado, el número de unidad? Con esta información podremos dar seguimiento puntual con el área correspondiente y tomar las medidas necesarias.
Quedamos a sus órdenes y le reiteramos nuestro compromiso con la conducción responsable.`;

      userStates[from].step = "menu";
    }


    else if (
      userStates[from].step === "info_productos" ||
      userStates[from].step === "cotizacion" ||
      userStates[from].step === "facturacion" ||
      userStates[from].step === "ficha"
    ) {
      console.log("Solicitud:", text);

      responseText =
`✅ Hemos recibido tu información.
Un asesor se pondrá en contacto contigo.
Escribe MENU para volver.`;

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