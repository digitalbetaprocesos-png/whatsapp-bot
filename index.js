const express = require("express");
const axios = require("axios");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
// =============================
// SHOPIFY CONFIG
// =============================
const mainMenu = `Hola 👋
Bienvenido a *Beta* especialistas en limpieza y sanitización.

Selecciona una opción:

1️⃣ Conocer productos
2️⃣ Servicios de sanitización
3️⃣ Información de Betita
4️⃣ Solicitar cotización
5️⃣ Reclutamiento
6️⃣ Horarios`;
//7️⃣ 

const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;
const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
async function obtenerProductos() {
  try {
    const res = await axios.get(
      `https://${SHOPIFY_STORE}/admin/api/2024-01/products.json`,
      {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_TOKEN
        }
      }
    );

    return res.data.products;

  } catch (error) {
    console.log("❌ Error Shopify:", error.response?.data || error.message);
    return [];
  }
}
// =============================
// CONTROL DE INTERVENCIÓN HUMANA
// =============================

const humanActive = {};
const HUMAN_TIMEOUT = 30 * 60 * 1000; // 30 minutos
function normalizarNumero(numero){

  let limpio = numero.replace(/\D/g,""); // solo números

  if(limpio.startsWith("521")){
    limpio = limpio.slice(3);
  } else if(limpio.startsWith("52")){
    limpio = limpio.slice(2);
  } else if(limpio.startsWith("1") && limpio.length === 11){
    limpio = limpio.slice(1);
  }

  return limpio;
}mongoose.connect(process.env.MONGO_URI)
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
  },
  
});
const ChatSchema = new mongoose.Schema({
numero:String,
nombre: String,
mensaje:String,
tipo:String,
etiquetas: [String],
marcadoNoLeido:{
  type: Boolean,
  default: false
},
fecha:{ type:Date, default:Date.now },
  leido: Boolean,
  favorito: Boolean
  
});
const ContactoSchema = new mongoose.Schema({

numero:String,
nombre:String,
empresa:String,
correo:String,
notas:String,
etiquetas: [String],
fotos: String,
fecha:{
type:Date,
default:Date.now
}

});

const Contacto = mongoose.model("Contacto", ContactoSchema);

const Chat = mongoose.model("Chat", ChatSchema);

const Cotizacion = mongoose.model("Cotizacion", CotizacionSchema);

const app = express();
app.use(express.json());
app.use(express.static("public"));

const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

const userStates = {};
const processedMessages = new Set();


// limpiar memoria de mensajes procesados cada 10 minutos
setInterval(() => {
  processedMessages.clear();
}, 600000);


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
    await Chat.create({
numero: normalizarNumero(to),
mensaje: message,
tipo: "bot"
});

  } catch (error) {

    console.log(error.response?.data || error.message);

  }

 }


// =============================
// MENSAJE DE CIERRE
// =============================

async function mensajeCierre(from){

await sendMessage(from,
`Gracias por contactar a Beta.
Nuestro equipo revisará tu solicitud y se pondrá en contacto contigo lo antes posible.
Mientras tanto, puedes conocer más sobre nuestras soluciones en:
🌐 www.betaprocesos.com.mx 
para hacer otra consulta presiona 0`

);
delete userStates[from];
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

const value = req.body.entry?.[0]?.changes?.[0]?.value;
const nombreCliente = value.contacts?.[0]?.profile?.name || "Cliente";
// =============================
// FILTROS DE EVENTOS
// =============================

if (!value?.messages) return res.sendStatus(200);

const message = value.messages[0];

// evitar responder a mensajes del propio bot
if (message.from === PHONE_NUMBER_ID) {
  return res.sendStatus(200);
}

// solo aceptar mensajes de texto
if (!message) {
  return res.sendStatus(200);
}
if (message.type === "image"){
  await Chat.create({
    numero : normalizarNumero(message.from),
    nombre : nombreCliente,
    mensaje : "[Imagen]",
    leido : false 
  });
  return res.sendStatus(200);
}

if (processedMessages.has(message.id)) return res.sendStatus(200);

processedMessages.add(message.id);

const msg = message.text.body.toLowerCase().trim();
await Chat.create({
numero: normalizarNumero(message.from),
nombre: nombreCliente,
mensaje: msg,
tipo: "cliente",
leido: false // 👈 CLAVE
});const numeroLimpio = normalizarNumero(message.from);

// 🔥 GUARDAR CONTACTO AUTOMÁTICAMENTE
await Contacto.findOneAndUpdate(
  { numero: numeroLimpio },
  { 
    numero: numeroLimpio,
    nombre: nombreCliente
  },
  { upsert: true }
);
// =============================
// ACTIVAR ASESOR HUMANO
// =============================
if (msg === "asesor") {

humanActive[numeroLimpio] = Date.now();

await sendMessage(message.from,
`Un asesor continuará la conversación contigo en breve.`);

return res.sendStatus(200);
}let raw = message.from;

if (raw.startsWith("521")) {
  raw = "52" + raw.slice(3);
}

let from =
"+52 " +
raw.slice(2,5)+" "+
raw.slice(5,8)+" "+
raw.slice(8);
const now = Date.now();
if (humanActive[numeroLimpio] && (now - humanActive[numeroLimpio] < HUMAN_TIMEOUT)) {
  console.log("👨‍💼 Conversación en modo humano:", numeroLimpio);
  return res.sendStatus(200);
}

// =============================
// REACTIVAR BOT
// =============================

if (msg === "menu" || msg === "menú") {

delete humanActive[from];

userStates[from].step = "menu";

await sendMessage(from, mainMenu);

return res.sendStatus(200);

}



// =============================
// RESPUESTAS AUTOMÁTICAS
// =============================
if (msg.includes("vacante")|| msg.includes("Trabajo")||msg.includes ("trabajo")|| msg.includes ("alguna vacante disponible")|| msg.includes("Vacante")){
  await sendMessage(from,
`Para cualquier informacion de vacantes envía tu CV al correo:

ggutierrez@betaprocesos.com.mx
  
Gracias por tu interés en formar parte de Beta.`)
return res.sendStatus(200);
  }
if (msg.includes("donde se encuentra beta") || msg.includes("dónde se encuentra beta")|| msg.includes("ubicación")|| msg.includes("ubicacion")) {

await sendMessage(from,
`Nuestro corporativo se encuentra en Celaya, Guanajuato.
Atendemos clientes en distintas regiones del país.`);

return res.sendStatus(200);

}

if (msg.includes("atienden en todo mexico") ||msg.includes('atienden')){

await sendMessage(from,
`Sí, contamos con cobertura en diferentes regiones del país a través de nuestra red comercial.`);

return res.sendStatus(200);

}

if (msg.includes("venden a pequeñas empresas") ||msg.includes('venden') ) {

await sendMessage(from,
`Sí. Atendemos desde pequeños negocios hasta grandes industrias.`);

return res.sendStatus(200);

}

if (msg.includes("venden a particulares")||msg.includes('particulares')) {

await sendMessage(from,
`Sí, puedes comprar directamente en nuestra tienda Betita.`);

return res.sendStatus(200);

}
// =============================
// SALUDO AUTOMÁTICO
// =============================
// 🔥 ASEGURAR ESTADO DEL USUARIO (ANTES DE TODO)
if (!userStates[from]) {
  userStates[from] = { step: "menu" };
}
const saludos = [
"hola","buenas","buenos dias","buenos días",
"buen dia","buen día","buenas tardes",
"buenas noches"
];

if (saludos.some(s => msg.includes(s))) {
await sendMessage(from, mainMenu);
return res.sendStatus(200);

}


// =============================
// DESPEDIDA AUTOMÁTICA
// =============================

const despedidas = [
"gracias","muchas gracias","ok","vale",
"perfecto","listo","esta bien","está bien","okey"
];

if (despedidas.some(s => msg.includes(s))) {

await mensajeCierre(from);
return res.sendStatus(200);

}




// =============================
// VOLVER AL MENÚ
// =============================

if (msg === "0") {

userStates[from].step = "menu";
await sendMessage(from, mainMenu);
return res.sendStatus(200);

}


// =============================
// MENÚ PRINCIPAL
// =============================

if (userStates[from].step === "menu") {
  
if (msg === "1") {

  userStates[from].step = "tipo_cliente";

  await sendMessage(from,  
`Necesitas productos para:

1️⃣ Uso personal (hogar)
2️⃣ Negocio / mayoreo

Selecciona una opción:`);
return res.sendStatus(200);
}

/*if (msg === "1") {

userStates[from].step = "productos";

await sendMessage(from,  
`En Beta desarrollamos soluciones profesionales de limpieza y sanitización para diferentes sectores
Selecciona el área:

Seleccione una opción:

🇦 Industria alimentaria
🇧 Industria institucional
🇨 Limpieza industrial
🇩 Negocios y hogar`);

}*/

else if (msg === "2") {

userStates[from].step = "sanitizacion_menu";

await sendMessage(from,
`Servicios de sanitización.

Selecciona el tipo de espacio:

1️⃣ Oficinas
2️⃣ Plantas industriales
3️⃣ Restaurantes
4️⃣ Espacios comerciales
5️⃣ Casas`);
return res.sendStatus(200);
}

else if (msg === "3") {

userStates[from].step = "betita";

await sendMessage(from,
`Betita es la tienda de productos de higiene de calidad industrial de Beta..

1️⃣ Ubicación de sucursales
2️⃣ Pedidos a domicilio en Celaya`);
return res.sendStatus(200);
}

else if (msg === "4") {

userStates[from].step = "cot_nombre";

await sendMessage(from,
`Para cotizar necesitamos algunos datos.

Escribe tu *nombre completo*`);
return res.sendStatus(200);
}

else if (msg === "5") {

await sendMessage(from,
`Envía tu CV al correo:

ggutierrez@betaprocesos.com.mx

Gracias por tu interés en formar parte de Beta.`);
return res.sendStatus(200);
}
else if (msg === "6"){
  await sendMessage(from,
  `Hola contamos con sucursales solamente celaya con un horario de:
Lunes a viernes:8:00 a.m.-6:00 p.m.
Sábado:8:00 a.m.-2:00 p.m.
Si requiere otro tipo de informacion 
presiona 0 para volver al menu`);
return res.sendStatus(200);
}
if (msg === "7") {

  const productos = await obtenerProductos();

  if (!productos.length) {
    await sendMessage(from, "No hay productos disponibles en este momento.");
    return;
  }

  let respuesta = "🛒 Estos son algunos productos:\n";

  productos.slice(0, 5).forEach(p => {
    respuesta += `\n• ${p.title}`;
  });

  await sendMessage(from, respuesta);
}

else {

await sendMessage(from, "Selecciona una opcion del menu \nsi ninguna de las opciones satisface su necesidades escriba la palabra *asesor* para recibir una atencion adecuada");

}

}

// Productos tipo cliente 
else if (userStates[from].step === "tipo_cliente") {

  if (msg === "1") {

    // 👉 CLIENTE PERSONAL
    userStates[from].step = "menu";

    await sendMessage(from,
`Perfecto 😊

Puedes comprar directamente en nuestra tienda en línea Betita:

🛒 https://betasafe.myshopify.com/

Ahí encontrarás productos para uso en hogar.

Si necesitas ayuda escribe *asesor* o presiona 0 para volver al menú.`);
  
return res.sendStatus(200);
  }

  else if (msg === "2") {

    // 👉 CLIENTE MAYOREO
    userStates[from].step = "productos";

    await sendMessage(from,
`Excelente 👍

Trabajamos soluciones para empresas y compras a mayoreo.

Selecciona el área:

🇦 Industria alimentaria
🇧 Industria institucional
🇨 Limpieza industrial
🇩 Negocios y hogar`);
 return res.sendStatus(200);
  }

  else {

    await sendMessage(from, "Selecciona una opción válida (1 o 2)");
  }
}



// =============================
// PRODUCTOS
// =============================

else if (userStates[from].step === "productos") {
  if (msg === "2") {

userStates[from].step = "cot_nombre";

await sendMessage(from,"Para cotizar escribe tu *nombre completo*");

return;

}
if (msg === "1") {

await sendMessage(from,"Escribenos tu nombre completo y un asesor se pondrá en contacto contigo en breve.");
return;
}



let texto = "";

if (msg === "a") {

texto =
`Industria alimentaria

En la industria alimentaria es fundamental garantizar higiene, inocuidad y seguridad en los procesos.
En Beta contamos con:
• Detergentes industriales
• Desinfectantes y sanitizantes
• Sistemas de limpieza especializados
• Programas de higiene para plantas alimentarias

1️⃣ Hablar con asesor
2️⃣ Solicitar cotización`;

}

if (msg === "b") {

texto =
`Industria institucional

Ofrecemos soluciones para mantener espacios seguros, higiénicos y libres de contaminación.
Algunos productos incluyen:
• Detergentes profesionales
• Sanitizantes para cocina
• Productos para lavado de utensilios
• Sistemas de higiene para restaurantes

1️⃣ Hablar con asesor
2️⃣ Solicitar cotización`;

}

if (msg === "c") {

texto =
`Limpieza industrial

Contamos con soluciones especializadas para procesos industriales:
• Desengrasantes industriales
• Detergentes alcalinos y ácidos
• Desinfectantes profesionales
• Sistemas de limpieza técnica

1️⃣ Hablar con asesor
2️⃣ Solicitar cotización`;

}

if (msg === "d") {

texto =
`Negocios y hogar

Contamos con soluciones especializadas para tu negocio y hogar:
• Detergentes
• Productos para limpieza de pisos
• Suavizantes de tela
• Gel antibacterial

1️⃣ Hablar con asesor
2️⃣ Solicitar cotización`;

}

await sendMessage(from, texto);






}

// =============================
// SANITIZACIÓN
// =============================

else if (userStates[from].step === "sanitizacion_menu") {

if (["1","2","3","4","5"].includes(msg)) {

userStates[from].step = "sanitizacion";

await sendMessage(from,
`Nuestros servicios incluyen:

• Sanitización profesional
• Protocolos de higiene
• Personal capacitado
• Equipos especializados

1️⃣ Solicitar cotización
2️⃣ Hablar con asesor`);

}

}


// =============================
// OPCIONES SANITIZACIÓN
// =============================

else if (userStates[from].step === "sanitizacion") {

if (msg === "1") {

userStates[from].step = "cot_nombre";
await sendMessage(from,"Para cotizar escribe tu *nombre completo*");

}

if (msg === "2") {

await sendMessage(from,
"Escribenos tu nombre completo y un asesor se pondrá en contacto contigo en breve.");

}

}


// =============================
// BETITA
// =============================

else if (userStates[from].step === "betita") {

if (msg === "1") {

await sendMessage(from,
`Betita cuenta con sucursales en Celaya.

Av. México Japón
https://maps.app.goo.gl/1p7j7Z7ihmPFJhUj8

Av. 2 de Abril
https://maps.app.goo.gl/JpPS5LqrhEqMhjtm8

Si deseas realizar un pedido o recibir información puedes escribir directamente a nuestro WhatsApp:
WhatsApp:
https://wa.me/524612397325
También puedes seguirnos en Instagram:
Instagram:
https://www.instagram.com/betita.tienda/`);

}

if (msg === "2") {

await sendMessage(from,
`Pedidos Betita:
Escríbenos en nuestro WhatsApp exclusivo de Betita.
https://wa.me/524612397325
También puedes seguirnos en Instagram:
https://www.instagram.com/betita.tienda/`);

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
userStates[from].step = "cot_correo";

await sendMessage(from,"Correo electronico:");

}


else if (userStates[from].step === "cot_correo") {

userStates[from].correo = msg;
userStates[from].step = "cot_ciudad";

await sendMessage(from,"Ciudad:");

}

else if (userStates[from].step === "cot_ciudad") {

userStates[from].ciudad = msg;
userStates[from].step = "cot_giro";

await sendMessage(from,"Giro de la empresa:");

}

else if (userStates[from].step === "cot_giro") {

userStates[from].giro = msg;
userStates[from].step = "cot_producto";

await sendMessage(from,"¿Qué producto o servicio te interesa?");
}
else if (userStates[from].step ==="cot_producto"){
  userStates[from].producto=msg;
  userStates[from].step="cot_comentarios"
await sendMessage(from,"Escribe un comentario extra para tu cotizacion por ejemplo:\n¿Qué tipo de superfice desea aplicar el servicio?\n¿Qué tipo de suciedad desea eliminar?")

}
else if (userStates[from].step ==="cot_comentarios"){
  userStates[from].comentarios=msg;


const nuevaCotizacion = new Cotizacion({

cliente: userStates[from].nombre,
telefono: from,
giro: userStates[from].giro,
nombreE:userStates[from].empresa, 
respuestas: [
userStates[from].empresa,
userStates[from].correo,
userStates[from].ciudad,
userStates[from].producto,
userStates[from].comentarios
]

});

await nuevaCotizacion.save();

await sendMessage(from,
`Gracias por la información.
Un asesor de Beta revisará tu solicitud y se pondrá en contacto contigo en breve.
`);



userStates[from].step = "menu";

}

res.sendStatus(200);

} catch (error) {

console.log(error);
res.sendStatus(500);

}

});
// =============================
// PANEL DE CHATS
// =============================
app.get("/clientes", async (req,res)=>{

const chats = await Chat.aggregate([
  {
    $sort: { fecha: -1 } // ordenamos
  },
  {
    $group: {
      _id: "$numero",
      ultimoMensaje: { $first: "$mensaje" },
      fecha: { $first: "$fecha" },
      noLeidos: {
        $sum: {
          $cond: [{ $eq: ["$leido", false] }, 1, 0]
        }
      },
      marcadoNoLeido:{
        $max: "$marcadoNoLeido"
      }
    }
  },
  {
    $sort: { fecha: -1 } // chats recientes arriba
  }
]);

const resultado = [];

for(const c of chats){

  const contacto = await Contacto.findOne({numero:c._id});

  resultado.push({
    numero: c._id,
    nombre: contacto?.nombre || "Cliente",
    ultimoMensaje: c.ultimoMensaje,
    noLeidos: c.noLeidos,
    fecha: c.fecha,
    marcadoNoLeido: c.marcadoNoLeido
  });

}

res.json(resultado);

});
app.get("/mensajes/:numero", async (req,res)=>{

const numero = normalizarNumero(req.params.numero);

const variantes = [
numero,
"52"+numero,
"521"+numero,
"1"+numero
];

const mensajes = await Chat.find({
numero: { $in: variantes }
}).sort({fecha:1});

res.json(mensajes);

});
app.post("/favorito/:id", async (req,res)=>{
await Chat.findByIdAndUpdate(req.params.id,{favorito:true});
res.sendStatus(200);
});

app.post("/responder", async (req,res)=>{

const {numero,mensaje} = req.body;

// 🔥 LIMPIAR NÚMERO
let numeroLimpio = numero.replace(/\D/g,"");

// 🔥 ASEGURAR FORMATO MÉXICO (52)
if(!numeroLimpio.startsWith("52")){
  numeroLimpio = "52" + numeroLimpio;
}

try{

await axios.post(
`https://graph.facebook.com/v24.0/${PHONE_NUMBER_ID}/messages`,
{
messaging_product:"whatsapp",
to: numeroLimpio, // ✅ CORRECTO
text:{body:mensaje}
},
{
headers:{
Authorization:`Bearer ${TOKEN}`,
"Content-Type":"application/json"
}
}
);

// 🔥 GUARDAR COMO HUMANO
await Chat.create({
numero: normalizarNumero(numero),
mensaje: mensaje,
tipo: "humano"
});

res.send("ok");

}catch(error){

console.log("❌ ERROR ENVÍO:", error.response?.data || error.message);

res.status(500).send("error");

}

});// =============================
// GUARDAR ETIQUETA
// =============================
app.post("/etiqueta", async (req,res)=>{

const {numero, tag} = req.body;

await Contacto.updateOne(
  {numero},
  {
    $addToSet: { etiquetas: tag } // 🔥 evita duplicados
  },
  {upsert:true}
);

res.sendStatus(200);

});
// =============================
// OBTENER ETIQUETAS
// =============================

app.get("/etiquetas/:numero", async (req,res)=>{

const numero = normalizarNumero(req.params.numero);

const contacto = await Contacto.findOne({numero});

console.log("Buscando:", numero);
console.log("Encontrado:", contacto);

res.json(contacto?.etiquetas || []);

});

app.delete("/borrar/:numero", async (req,res)=>{

const numero = normalizarNumero(req.params.numero);
const variantes =[
  numero,
  "52"+numero,
  "521"+numero,
  "1"+numero
];
await Chat.deleteMany({numero: {$in: variantes}});

res.json({ok:true});

});
app.get("/limpiar", async (req,res)=>{

const chats = await Chat.find();

// 1. NORMALIZAR TODOS LOS NÚMEROS
for(const c of chats){

  const numeroLimpio = normalizarNumero(c.numero);

  await Chat.updateOne(
    { _id: c._id },
    { numero: numeroLimpio }
  );
}

// 2. ELIMINAR DUPLICADOS
const duplicados = await Chat.aggregate([
  {
    $group: {
      _id: {
        numero: "$numero",
        mensaje: "$mensaje",
        fecha: "$fecha"
      },
      ids: { $push: "$_id" },
      count: { $sum: 1 }
    }
  },
  {
    $match: { count: { $gt: 1 } }
  }
]);

for(const d of duplicados){
  d.ids.shift(); // deja uno
  await Chat.deleteMany({ _id: { $in: d.ids } });
}

res.send("✅ Base limpia");
});
app.get("/actualizar-nombres", async (req,res)=>{

const chats = await Chat.find();

for(const c of chats){

if(!c.nombre || c.nombre==="Cliente"){

const contacto = await Contacto.findOne({numero:c.numero});

if(contacto && contacto.nombre){

await Chat.updateMany(
{numero:c.numero},
{$set:{nombre:contacto.nombre}}
);

}

}

}

res.send("Nombres actualizados");

});
// guardar contacto
app.post("/guardar-contacto", async (req,res)=>{

const {numero,nombre,empresa,correo,notas} = req.body;

const numeroLimpio = normalizarNumero(numero);

await Contacto.findOneAndUpdate(
{numero: numeroLimpio},
{numero: numeroLimpio, nombre, empresa, correo, notas},
{upsert:true}
);

res.json({ok:true});

});
// obtener contacto 
app.get("/contacto/:numero", async (req,res)=>{

const numero = normalizarNumero(req.params.numero);

const contacto = await Contacto.findOne({numero});

res.json(contacto || {});

});
//buscar contacto
app.get("/contactos", async (req,res)=>{

const contactos = await Contacto.find().sort({nombre:1});

res.json(contactos);

});
app.post("/activar-humano", (req,res)=>{

const {numero} = req.body;

const limpio = normalizarNumero(numero);

humanActive[limpio] = Date.now();

res.json({ok:true});

});
app.post("/activar-bot", (req,res)=>{

const {numero} = req.body;

const limpio = normalizarNumero(numero);

delete humanActive[limpio];

res.json({ok:true});

});
app.post("/eliminar-etiqueta", async (req,res)=>{

const {numero, tag} = req.body;

const numeroLimpio = normalizarNumero(numero);

const result = await Contacto.updateOne(
  { numero: numeroLimpio },
  {
    $pull: { etiquetas: tag }
  }
);

console.log("Eliminar etiqueta:", numeroLimpio, tag, result);

res.sendStatus(200);

});
app.post("/marcar-leidos/:numero", async (req,res)=>{

const numero = normalizarNumero(req.params.numero);

const variantes = [
  numero,
  "52"+numero,
  "521"+numero,
  "1"+numero
];

await Chat.updateMany(
{numero: { $in: variantes }},
{
  $set:{
    leido:true,
    marcadoNoLeido:false
  }
}
);

res.json({ok:true});

});
app.post("/marcar-no-leido/:numero", async (req,res)=>{

const numero = normalizarNumero(req.params.numero);

const variantes = [
  numero,
  "52"+numero,
  "521"+numero,
  "1"+numero
];

await Chat.updateMany(
  { numero: { $in: variantes } },
  { $set: { marcadoNoLeido: true } }
);

res.json({ok:true});

});
/*app.get("/migrar-nombres", async (req,res)=>{

const chats = await Chat.find();

for(const c of chats){

  if(!c.nombre || c.nombre === "Cliente") continue;

  const numero = normalizarNumero(c.numero);

  const contactoExistente = await Contacto.findOne({numero});

  if(!contactoExistente){
    await Contacto.create({
      numero,
      nombre: c.nombre
    });
  }

}

res.send("✅ Nombres migrados a contactos");

});*/
app.get("/exportar-cotizaciones", async (req, res) => {

try{

let { inicio, fin } = req.query;


let filtro = {};

if(inicio && fin){

  const fechaInicio = new Date(inicio);
  const fechaFin = new Date(fin);

  fechaFin.setHours(23,59,59,999);

  filtro.fecha = {
    $gte: fechaInicio,
    $lte: fechaFin
  };

}

const cotizaciones = await Cotizacion.find(filtro).sort({fecha:-1});

const ExcelJS = require("exceljs");
const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet("Cotizaciones");

sheet.columns = [
  { header: "Cliente", key: "cliente", width: 25 },
  { header: "Teléfono", key: "telefono", width: 20 },
  { header: "Empresa", key: "empresa", width: 25 },
  { header: "Correo", key: "correo", width: 30 },
  { header: "Ciudad", key: "ciudad", width: 20 },
  { header: "Giro", key: "giro", width: 20 },
  { header: "Producto", key: "producto", width: 30 },
  { header: "Comentarios", key: "comentarios", width: 40 },
  { header: "Fecha", key: "fecha", width: 20 }
];

cotizaciones.forEach(c => {
  sheet.addRow({
    cliente: c.cliente,
    telefono: c.telefono,
    empresa: c.respuestas?.[0] || "",
    correo: c.respuestas?.[1] || "",
    ciudad: c.respuestas?.[2] || "",
    producto: c.respuestas?.[3] || "",
    comentarios: c.respuestas?.[4] || "",
    giro: c.giro,
    fecha: new Date(c.fecha).toLocaleString()
  });
});

res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
res.setHeader("Content-Disposition","attachment; filename=cotizaciones.xlsx");

await workbook.xlsx.write(res);
res.end();

}catch(error){
console.log(error);
res.status(500).send("Error");
}

});
async function obtenerFotoPerfil(numero) {
  try {

    const res = await axios.get(
      `https://graph.facebook.com/v24.0/${numero}`,
      {
        params: {
          fields: "profile_pic",
          access_token: TOKEN
        }
      }
    );

    return res.data.profile_pic || "";

  } catch (error) {
    console.log("Error foto:", error.response?.data || error.message);
    return "";
  }
}
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

console.log("🚀 Servidor corriendo en puerto " + PORT);

});