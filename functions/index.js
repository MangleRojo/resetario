/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container,
// so this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

/**
 * Función HTTP que actúa como proxy seguro hacia la API de Google Gemini.
 *
 * Lee la API key desde process.env.GEMINI_API_KEY (configurada vía dotenv /
 * Firebase), recibe un JSON { prompt: string } desde el frontend y devuelve
 * { text: string }.
 *
 * Más adelante podemos extender esta misma función para usar File Search,
 * añadiendo la configuración de tools.fileSearch según la guía oficial:
 * https://ai.google.dev/gemini-api/docs/file-search#javascript
 */
exports.callGemini = onRequest({cors: true}, async (req, res) => {
  // Permitir solo POST para mantener la API simple.
  if (req.method !== "POST") {
    return res.status(405).json({error: "Method not allowed. Use POST."});
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.error("GEMINI_API_KEY no está definida en variables de entorno.");
    return res.status(500).json({
      error: "Configuración del servidor incompleta: " +
        "falta GEMINI_API_KEY.",
    });
  }

  const fileSearchStoreName = process.env.FILE_SEARCH_STORE_NAME;
  if (!fileSearchStoreName) {
    logger.error("FILE_SEARCH_STORE_NAME no está definida en el entorno.");
    return res.status(500).json({
      error: "Configuración del servidor incompleta: " +
        "falta FILE_SEARCH_STORE_NAME.",
    });
  }

  const {prompt} = req.body || {};
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({
      error: "El cuerpo de la petición debe incluir un campo 'prompt' de " +
        "tipo string.",
    });
  }

  // Modelo por defecto; se puede ajustar sin cambiar el frontend.
  const model = "gemini-2.5-pro";

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    `${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const systemTextLines = [
      "Eres experto en APICCA COMÚN y solo respondes temas " +
      "relacionados con las tácticas del Re(s)etario.",
      "Responde siempre en español latinoamericano, de forma clara y breve, " +
      "usando un máximo de 80 palabras.",
      "Responde siempre con un humor negro y una creatividad, " +
      "que recuerda al de Terry Pratchett.",
      "Nunca utilices modismos.",
      "No utilices markdown en tus respuestas, utiliza siempre " +
      "etiquetas html.",
      "Usa los documentos del File Search Store del Re(s)etario " +
      "como fuente principal de información.",
      "La respuesta la debes estructurar como si fuera una receta de cocina " +
      "que utiliza como ingredientes a las tácticas que el usuario ha enviado.",
      "Estructura SIEMPRE tu respuesta en dos secciones, en este orden:",
      "<h4>1. Poner la mesa común.</h4>",
      "<h4>2. Preparar presentes alternativos.</h4>",
    ];

    const payload = {
      systemInstruction: {
        role: "system",
        parts: [
          {
            text: systemTextLines.join(" "),
          },
        ],
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                "Pregunta del usuario sobre el Re(s)etario de APICCA:\n" +
                prompt,
            },
          ],
        },
      ],
      tools: [
        {
          fileSearch: {
            fileSearchStoreNames: [fileSearchStoreName],
          },
        },
      ],
      // En el futuro, aquí podremos añadir más herramientas o configuración.
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Error de Gemini API", {
        status: response.status,
        body: errorText,
      });
      return res.status(502).json({
        error: "La API de Gemini devolvió un error.",
        status: response.status,
      });
    }

    const data = await response.json();
    const candidate = data.candidates && data.candidates[0];
    const parts = candidate && candidate.content && candidate.content.parts;

    const text = parts && parts.length ?
      parts.map((p) => p.text || "").join("\n").trim() :
      "";

    if (!text) {
      logger.warn("Respuesta de Gemini sin texto utilizable.", {data});
      return res.status(200).json({
        text: "No he podido generar una respuesta útil en este momento.",
      });
    }

    return res.status(200).json({text});
  } catch (err) {
    logger.error("Error al llamar a la API de Gemini", err);
    return res.status(500).json({
      error: "Error interno al consultar la API de Gemini.",
    });
  }
});

