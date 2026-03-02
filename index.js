const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const TOKEN = "EAAd138gADPABQ4wiPYNkPZBIsDdwdedKeVLcMQlCZBiy6CiWbu2LnERZBUNZBzxiDqUwiuAAVsxXRbR7mMPZBLj7yy2ef3Sk7pHKBWrL5xkSFLOqjyFTQz5so5ezjqZBhQXbhaDI1CZBZCPdpiZBzAPlFqaqeKfXacbfQFkdOWuimE1cH2T9evdgbCbJLHB0FGALIInZCUo1NZArqWBuY6JVpXX8WICqBZCqlcEy9ay8R9PyGgrN6517VZCQ0EuOVJjvpdCkxQyQxpajQsOP2ju7YeyztTtb7OvaSTdLTVBuZBRfMZD"; 
const PHONE_NUMBER_ID = "981726608362636";
const VERIFY_TOKEN = "diego123";

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
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
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
`👋 Hola. Bienvenido a Beta Procesos, tu aliado en limpieza profesional, te atiende Sr. Beta. 
    ¿En qué puedo ayudarte?

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
    Hola, puedes adquirirlos en nuestras tiendas de venta al público en general que se encuentran ubicadas en Celaya Gto.
    Si requieres productos para satisfacer necesidades de limpieza para tu empresa uno de nuestros ejecutivos puede darte seguimiento compartiéndonos los siguientes datos:
    Nombre: 
    Giro de la empresa: 
    Estado de la república:
    Teléfono: 
    Correo electrónico:
    Producto deseado:
    ¿Cuenta con alguna certificación?
    Escribe o para volver a menu`
    ;
      }

      else if (userMessage === "2") {
        userStates[from].step = "cotizacion";
        responseText =
`💰 Cotización
     Estamos encantados de proporcionarte una cotización personalizada. 

   Por favor, indicanos el giro de tu empresa. 
   A) Hotel
   B) Restaurante
   C) Hospital
   D) Metalmecánica
   E) Invernadero 
   F) Escuelas
   D) Otro 

`;
      }

      else if (userMessage === "3") {
        userStates[from].step = "facturacion";
        responseText =
`🧾Con gusto te apoyamos, proporcionanos tu constancia de situación fiscal y en caso de refacturación el número de factura involucrada al correo info@betaprocesos.com.mx

    Beta, Brillantez Excepcional, Tu Aliado en limpieza profesional :)
    Escribe 0 para volver al menú.`;
      }

      else if (userMessage === "4") {
        userStates[from].step = "rastreo";
        responseText =
`🚚 Rastreo
    Por el momento no contamos con servicio en la tienda web 
Escribe 0 para volver al menú.`;
      }

      else if (userMessage === "5") {
        userStates[from].step = "compras";
        responseText =
`🛒 Compras
  Para ofrecernos tus prodcutos te puedes comunicar a este correo 
  staffcompras@betaprocesos.com.mx

  Escribe 0 para volver al menú.`;
      }

      else if (userMessage === "6") {
        userStates[from].step = "ficha";
        responseText =
`📄 Ficha Técnica / Hoja de Seguridad
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
        userStates[from].step = "reclutamiento";
        responseText =
`👥 Reclutamiento
Hola. En Beta Procesos nos encanta tener nuevos talentos.
 Por favor, envíanos tu curriculum vitae a fvazquez@betaprocesos.com.mx  o visita nuestro facebook dando clic en el enlace y con gusto uno de nuestros reclutadores te atenderan. ¡Mucho éxito! 

https://www.facebook.com/profile.php?id=61555196763207&locale=es_LA
Escribe 0 para volver al menú.`;
      }

      else if (userMessage === "8") {
        userStates[from].step = "direccion";
        responseText =
`📍 Ubicación tienda Celaya

Sucursal Principal:
Av. México–Japón No.146
Col. Ciudad Industrial
Celaya, Gto.

Sucursal 2 de abril:
Av. 2 de abril #230 local 208
Col. Villa de los Reyes

Horario:
Lunes a viernes 8:00am - 6:00pm
Sábado 8:00am - 2:00pm

Escribe 0 para volver al menú.`;
      }

      else if (userMessage === "9") {
        userStates[from].step = "quejas";
        responseText =
`📢 Área de Quejas

Q1 Productos
Q2 Mal manejo de unidades

Escribe Q1 o Q2
Escribe 0 para volver al menú.`;
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

    // =============================
    // 🔹 CAPTURA GENERAL
    // =============================
    else if (
      userStates[from].step === "info_productos" ||
      userStates[from].step === "cotizacion" ||
      userStates[from].step === "facturacion" ||
      userStates[from].step === "rastreo" ||
      userStates[from].step === "compras" ||
      userStates[from].step === "ficha"
    ) {

      console.log(`Solicitud ${userStates[from].step}:`, text);

      responseText =
`✅ Hemos recibido tu información.
Un asesor se pondrá en contacto contigo a la brevedad.
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

app.listen(3000, () => {
  console.log("🚀 Servidor corriendo en puerto 3000");
});