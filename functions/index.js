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
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

/**
 * Función HTTP que actúa como proxy seguro hacia la API de Google Gemini.
 *
 * Lee la API key desde process.env.GEMINI_API_KEY (configurada vía dotenv / Firebase),
 * recibe un JSON { prompt: string } desde el frontend y devuelve { text: string }.
 *
 * Más adelante podemos extender esta misma función para usar File Search
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
    logger.error("GEMINI_API_KEY no está definida en las variables de entorno.");
    return res.status(500).json({
      error: "Configuración del servidor incompleta: falta GEMINI_API_KEY.",
    });
  }

  const {prompt} = req.body || {};
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({
      error: "El cuerpo de la petición debe incluir un campo 'prompt' de tipo string.",
    });
  }

  // Modelo por defecto; se puede ajustar sin cambiar el frontend.
  const model = "gemini-2.5-flash";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Responde en español de forma clara y breve.\n\n" +
                "Pregunta del usuario sobre el Re(s)etario de APICCA:\n" +
                prompt,
            },
          ],
        },
      ],
      // En el futuro, aquí podremos añadir la sección `tools.fileSearch`.
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

