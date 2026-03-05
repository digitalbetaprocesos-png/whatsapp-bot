const express = require("express");
const axios = require("axios");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());

// 🔐 Variables de entorno
const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_USER = process.env.EMAIL_USER;



// 🔹 CONFIGURACIÓN EMAIL
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function enviarCorreoCotizacion(cliente, giro, respuestas) {

  const contenido = `
Nueva solicitud de cotización

Cliente: ${cliente}
Giro: ${giro}

Respuestas:
${respuestas.map((r,i)=>`${i+1}. ${r}`).join("\n")}
`;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: "ventas@betaprocesos.com.mx",
    subject: "Nueva Cotización WhatsApp",
    text: contenido
  });

}

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
`📦Información de Productos
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
Envíanos tu constancia de situación fiscal,ticket o comprobante de compra y en caso de refacturación el número de factura al correo:
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
Para ofrecernos tus productos comunicate a este correo:
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
Hola. En Beta Procesos nos encanta tener nuevos talentos.
Por favor, envíanos tu curriculum vitae a fvazquez@betaprocesos.com.mx  o visita nuestro facebook 
dando clic en el enlace y con gusto uno de nuestros reclutadores te atenderan. ¡Mucho éxito! 
https://www.facebook.com/profile.php?id=61555196763207&locale=es_LA
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
    // 🔹 PROTOCOLO QUEJAS
    // =============================
    else if (userStates[from].step === "quejas") {

      if (userMessage === "q1") {
        userStates[from].step = "queja_producto";
        responseText = "📝 Escribe tu queja sobre el producto.";

      } else if (userMessage === "q2") {
        userStates[from].step = "queja_unidad";
        responseText = "📝 Escribe tu queja sobre la unidad.";
      } else {
        responseText = "❌ Opción inválida. Escribe Q1 o Q2.";
      }
    }

    else if (userStates[from].step === "queja_producto") {

      console.log("Queja registrada:", text);

      responseText =
"✅ Hola, buen día.Gracias por hacernos llegar este reporte.\nLamentamos lo ocurrido y valoramos mucho este tipo de comentarios,ya que nos ayudan a mejorar.";

      userStates[from].step = "menu";
    }

    else if (userStates[from].step === "queja_unidad") {

      console.log("Queja registrada:", text);

      responseText = 
"✅ Hola, buen día.Gracias por hacernos llegar este reporte.\nLamentamos lo ocurrido y valoramos mucho este tipo de comentarios,ya que nos ayudan a mejorar y a reforzar la seguridad vial.\n¿Podría apoyarnos indicándonos la ubicación exacta, la hora aproximada del incidente y, en caso de haberlo identificado, el número de unidad? Con esta información podremos dar seguimiento puntual con el área correspondiente y tomar las medidas necesarias.\nQuedamos a sus órdenes y le reiteramos nuestro compromiso con la conducción responsable.";

      userStates[from].step = "menu";
    }

    // =============================
    // 🔹 COTIZACIÓN DINÁMICA
    // =============================
    else if (userStates[from].step === "cotizacion_menu") {

      const preguntasPorGiro = {
        a: { nombre: "Hotel", preguntas: [
          "¿Cuántas habitaciones tiene el hotel?",
          "¿Qué tipo de suciedad desea limpiar?",
          "¿En qué tipo de superficies se encuentra esta suciedad o desea aplicar el producto?",
          "Para continuar con la cotizacion,\nPor favor proporcionanos la siguiente información,\nNombre de la persona que atenderá a nuestro ejecutivo",
          "Ciudad",
          "Estado de la república:",
          "Teléfono:",
          "Correo electrónico:",
          "¿Cuenta con alguna certificación?"
        ]},
        b: { nombre: "Restaurante", preguntas: [
          "¿Con cuántas mesas cuentan?",
          "¿Tipo de grasa a eliminar?",
          "¿En qué tipo de superficies se encuentra esta suciedad o desea aplicar el producto?",
          "Para continuar con la cotizacion,\nPor favor proporcionanos la siguiente información,\nNombre de la persona que atenderá a nuestro ejecutivo",
          "Ciudad",
          "Estado de la república:",
          "Teléfono:",
          "Correo electrónico:",
          "¿Cuenta con alguna certificación?"
        ]},
        c: { nombre: "Hospital", preguntas: [
          "¿Número de cuartos?",
          "¿Qué tipo de suciedad desea limpiar?",
          "¿En qué tipo de superficies se encuentra esta suciedad o desea aplicar el producto?",
          "Para continuar con la cotizacion,\nPor favor proporcionanos la siguiente información,\nNombre de la persona que atenderá a nuestro ejecutivo",
          "Ciudad",
          "Estado de la república:",
          "Teléfono:",
          "Correo electrónico:",
          "¿Cuenta con alguna certificación?"
        ]},
        d: { nombre: "Metalmecánica", preguntas: [
          "¿Con cuántos empleados cuentan?",
          "¿Qué tipo de suciedad desea limpiar?",
          "¿En qué tipo de superficies se encuentra esta suciedad o desea aplicar el producto?",
          "Para continuar con la cotizacion,\nPor favor proporcionanos la siguiente información,\nNombre de la persona que atenderá a nuestro ejecutivo",
          "Ciudad",
          "Estado de la república:",
          "Teléfono:",
          "Correo electrónico:",
          "¿Cuenta con alguna certificación?"
        ]},
        e: { nombre: "Invernadero", preguntas: [
          "¿Con cuántas hectareas cuentan?",
          "¿Qué tipo de suciedad desea limpiar?",
          "¿En qué tipo de superficies se encuentra esta suciedad o desea aplicar el producto?",
          "Para continuar con la cotizacion,\nPor favor proporcionanos la siguiente información,\nNombre de la persona que atenderá a nuestro ejecutivo",
          "Ciudad",
          "Estado de la república:",
          "Teléfono:",
          "Correo electrónico:",
          "¿Cuenta con alguna certificación?"
        ]},
        f: { nombre: "Escuela", preguntas: [
          "¿Con cuántos estudiantes cuentan?",
          "¿Número de salones?",
          "¿Qué tipo de suciedad desea limpiar?",
          "¿En qué tipo de superficies se encuentra esta suciedad o desea aplicar el producto?",
          "Para continuar con la cotizacion,\nPor favor proporcionanos la siguiente información,\nNombre de la persona que atenderá a nuestro ejecutivo",
          "Ciudad",
          "Estado de la república:",
          "Teléfono:",
          "Correo electrónico:",
          "¿Cuenta con alguna certificación?"
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
        await enviarCorreoCotizacion(
          from,
          userStates[from].giro,
          userStates[from].respuestas
        );
        responseText =
`✅ Gracias por la información.

Hemos registrado tu solicitud.
Un asesor se pondrá en contacto contigo.`;

        userStates[from].step = "menu";
      }
    }

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