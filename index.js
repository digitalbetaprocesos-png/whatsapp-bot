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

    if (
      !req.body.entry ||
      !req.body.entry[0].changes ||
      !req.body.entry[0].changes[0].value.messages ||
      !req.body.entry[0].changes[0].value.messages[0]
    ) {
      return res.sendStatus(200);
    }

    const message = req.body.entry[0].changes[0].value.messages[0];

    if (message.type !== "text") {
      return res.sendStatus(200);
    }

    if (message.from === PHONE_NUMBER_ID) {
      return res.sendStatus(200);
    }

    const text = message.text?.body || "";
    const userMessage = text.toLowerCase().trim();
    const messageId = message.id;

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
      userStates[from] = { step: "menu", lastMessageId: null };
    }

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
    // 🔹 VOLVER AL MENÚ
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
        userStates[from].step = "cotizacion_menu";
        responseText =
`💰 Cotización Especializada

Indícanos el giro:

A) Hotel
B) Restaurante
C) Hospital
D) Metalmecánica
E) Invernadero
F) Escuelas

Escribe la letra correspondiente.
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
    // 🔹 COTIZACIÓN DINÁMICA
    // =============================
    else if (userStates[from].step === "cotizacion_menu") {

      const preguntasPorGiro = {
        a: { nombre: "Hotel", preguntas: [
          "¿Cuántas habitaciones tiene el hotel?",
          "¿Qué áreas desea sanitizar?",
          "¿Frecuencia requerida?"
        ]},
        b: { nombre: "Restaurante", preguntas: [
          "¿Cuenta con cocina industrial?",
          "¿Tipo de grasa a eliminar?",
          "¿Frecuencia de limpieza?"
        ]},
        c: { nombre: "Hospital", preguntas: [
          "¿Número de camas?",
          "¿Requiere desinfectante grado hospitalario?",
          "¿Áreas críticas?"
        ]},
        d: { nombre: "Metalmecánica", preguntas: [
          "¿Tipo de residuo?",
          "¿Área aproximada?",
          "¿Frecuencia?"
        ]},
        e: { nombre: "Invernadero", preguntas: [
          "¿Tipo de cultivo?",
          "¿Área en m²?",
          "¿Problema principal?"
        ]},
        f: { nombre: "Escuela", preguntas: [
          "¿Nivel educativo?",
          "¿Número de salones?",
          "¿Frecuencia?"
        ]}
      };

      if (preguntasPorGiro[userMessage]) {

        userStates[from] = {
          step: "cot_pregunta",
          giro: preguntasPorGiro[userMessage].nombre,
          preguntas: preguntasPorGiro[userMessage].preguntas,
          respuestas: [],
          index: 0,
          lastMessageId: messageId
        };

        responseText =
`📌 Cotización para ${userStates[from].giro}

1️⃣ ${userStates[from].preguntas[0]}`;

      } else {
        responseText = "❌ Opción inválida. Escribe A, B, C, D, E o F.";
      }
    }

    else if (userStates[from].step === "cot_pregunta") {

      userStates[from].respuestas.push(text);
      userStates[from].index++;

      if (userStates[from].index < userStates[from].preguntas.length) {

        responseText =
`${userStates[from].index + 1}️⃣ ${userStates[from].preguntas[userStates[from].index]}`;

      } else {

        console.log("==== NUEVA COTIZACIÓN ====");
        console.log("Cliente:", from);
        console.log("Giro:", userStates[from].giro);
        console.log("Respuestas:", userStates[from].respuestas);

        responseText =
`✅ Gracias por la información.

Hemos registrado tu solicitud de cotización para ${userStates[from].giro}.
Un asesor especializado se pondrá en contacto contigo a la brevedad.

Agradecemos tu confianza.`;

        userStates[from].step = "menu";
      }
    }

    // =============================
    // 🔹 RESTO DE FLUJOS
    // =============================
    else if (
      userStates[from].step === "info_productos" ||
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Servidor corriendo en puerto " + PORT);
});