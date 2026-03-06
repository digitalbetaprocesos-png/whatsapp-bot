const express = require("express");
const axios = require("axios");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB conectado"))
.catch(err => console.error(err));

mongoose.connection.on("connected", () => {
  console.log("📦 MongoDB conectado");
});

const CotizacionSchema = new mongoose.Schema({
  cliente: String,
  telefono: String,
  giro: String,
  respuestas: [String],
  fecha: {
    type: Date,
    default: Date.now
  }
});

const Cotizacion = mongoose.model("Cotizacion", CotizacionSchema);

const app = express();
app.use(express.json());

// 🔐 Variables
const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

const userStates = {};


// =============================
// FUNCIÓN PARA ENVIAR MENSAJES
// =============================

async function sendMessage(to, message) {

  try {

    let raw = to.replace(/\D/g, "");

    await axios.post(
      `https://graph.facebook.com/v24.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: raw,
        text: { body: message }
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

  } catch (error) {

    console.log("Error enviando mensaje");
    console.log(error.response?.data || error.message);

  }

}


// =============================
// VERIFICAR WEBHOOK
// =============================

app.get("/webhook", (req, res) => {

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("Webhook verificado");
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);

});


// =============================
// RECIBIR MENSAJES
// =============================

app.post("/webhook", async (req, res) => {

  try {

    if (
      !req.body.entry ||
      !req.body.entry[0].changes ||
      !req.body.entry[0].changes[0].value.messages
    ) {
      return res.sendStatus(200);
    }

    const message = req.body.entry[0].changes[0].value.messages[0];

    if (!message || message.type !== "text") {
      return res.sendStatus(200);
    }

    const text = message.text.body;
    const userMessage = text.toLowerCase().trim();
    const msg = userMessage;

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

    const mainMenu = `Hola 👋
Bienvenido a *Beta* especialistas en limpieza y sanitización.

Selecciona una opción:

1️⃣ Conocer productos
2️⃣ Servicios de sanitización
3️⃣ Información de Betita
4️⃣ Solicitar cotización
5️⃣ Reclutamiento`;


// =============================
// VOLVER AL MENÚ
// =============================

if (msg === "0") {

  userStates[from].step = "menu";
  await sendMessage(from, mainMenu);

}


// =============================
// MENÚ PRINCIPAL
// =============================

else if (userStates[from].step === "menu") {

if (msg === "1") {

userStates[from].step = "productos";

await sendMessage(from,
`Selecciona el área:

1️⃣ Industria alimentaria
2️⃣ Industria institucional
3️⃣ Limpieza industrial
4️⃣ Negocios y hogar`
);

}

else if (msg === "2") {

userStates[from].step = "sanitizacion";

await sendMessage(from,
`Servicios de sanitización.

Selecciona el tipo de espacio:

1️⃣ Oficinas
2️⃣ Plantas industriales
3️⃣ Restaurantes
4️⃣ Espacios comerciales
5️⃣ Casas`
);

}

else if (msg === "3") {

userStates[from].step = "betita";

await sendMessage(from,
`Betita - tienda de productos de higiene.

1️⃣ Ubicación de sucursales
2️⃣ Pedidos a domicilio en Celaya`
);

}

else if (msg === "4") {

userStates[from].step = "cot_nombre";

await sendMessage(from,
`Para cotizar necesitamos algunos datos.

Escribe tu *nombre completo*`
);

}

else if (msg === "5") {

await sendMessage(from,
`Envía tu CV al correo:

ggutierrez@betaprocesos.com.mx

Gracias por tu interés en formar parte de Beta.`
);

}

else {

await sendMessage(from, mainMenu);

}

}


// =============================
// PRODUCTOS
// =============================

else if (userStates[from].step === "productos") {

let texto = "";

if (msg === "1") {

texto =
`Industria alimentaria

• Detergentes industriales
• Desinfectantes
• Sistemas de limpieza
• Programas de higiene

1️⃣ Recomendación de productos
2️⃣ Solicitar cotización
3️⃣ Hablar con asesor`;

}

if (msg === "2") {

texto =
`Industria institucional

• Detergentes profesionales
• Sanitizantes
• Lavado de utensilios

1️⃣ Recomendación de productos
2️⃣ Solicitar cotización
3️⃣ Hablar con asesor`;

}

if (msg === "3") {

texto =
`Limpieza industrial

• Desengrasantes
• Detergentes alcalinos
• Desinfectantes

1️⃣ Recomendación de productos
2️⃣ Solicitar cotización
3️⃣ Hablar con asesor`;

}

if (msg === "4") {

texto =
`Negocios y hogar

• Detergentes
• Limpieza de pisos
• Suavizantes
• Gel antibacterial

1️⃣ Recomendación de productos
2️⃣ Solicitar cotización
3️⃣ Hablar con asesor`;

}

await sendMessage(from, texto);

}


// =============================
// SANITIZACIÓN
// =============================

else if (userStates[from].step === "sanitizacion") {

await sendMessage(from,
`Nuestros servicios incluyen:

• Sanitización profesional
• Protocolos de higiene
• Personal capacitado
• Equipos especializados

1️⃣ Solicitar cotización
2️⃣ Hablar con asesor`
);

}


// =============================
// BETITA
// =============================

else if (userStates[from].step === "betita") {

if (msg === "1") {

await sendMessage(from,
`Sucursales Betita en Celaya:

Av México Japón
https://maps.app.goo.gl/1p7j7Z7ihmPFJhUj8

Av 2 de Abril
https://maps.app.goo.gl/JpPS5LqrhEqMhjtm8`
);

}

if (msg === "2") {

await sendMessage(from,
`Pedidos a domicilio:

https://wa.me/524612397325

Instagram
@betita.tienda`
);

}

}


// =============================
// FORMULARIO COTIZACIÓN
// =============================

else if (userStates[from].step === "cot_nombre") {

userStates[from].nombre = msg;
userStates[from].step = "cot_empresa";

await sendMessage(from,"Nombre de tu empresa:");

}

else if (userStates[from].step === "cot_empresa") {

userStates[from].empresa = msg;
userStates[from].step = "cot_ciudad";

await sendMessage(from,"Ciudad:");

}

else if (userStates[from].step === "cot_ciudad") {

userStates[from].ciudad = msg;
userStates[from].step = "cot_giro";

await sendMessage(from,
`Giro de la empresa:

• Industria alimentaria
• Restaurante
• Hotel
• Industria
• Comercio
• Otro`
);

}

else if (userStates[from].step === "cot_giro") {

userStates[from].giro = msg;
userStates[from].step = "cot_producto";

await sendMessage(from,"¿Qué producto o servicio te interesa?");

}

else if (userStates[from].step === "cot_producto") {

userStates[from].producto = msg;

await sendMessage(from,
`Gracias por la información.

Un asesor de *Beta* revisará tu solicitud y se pondrá en contacto contigo pronto.`
);

userStates[from].step = "menu";

}

res.sendStatus(200);

} catch (error) {

console.log(error.response?.data || error);
res.sendStatus(500);

}

});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

console.log("🚀 Servidor corriendo en puerto " + PORT);

});