// Cliente frontend para hablar con la Firebase Function `callGemini`
// sin exponer la API key de Gemini en el navegador.

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("resetario-ai-form");
  const questionEl = document.getElementById("resetario-ai-question");
  const statusEl = document.getElementById("resetario-ai-status");
  const answerContainer = document.getElementById("resetario-ai-answer");
  const answerTextEl = document.getElementById("resetario-ai-answer-text");
  const ejeButtons = document.querySelectorAll(".tp7-eje-button");
  const glyphLayer = document.querySelector(".tp7-disk-glyph-layer");

  if (!form || !questionEl) return;

  // Botones de ejes de color (agua, alimento, cobijo, etc.)
  if (ejeButtons && ejeButtons.length > 0) {
    const ejeLabels = {
      agua: "Agua",
      alimento: "Alimento",
      cobijo: "Cobijo",
      energia: "Energía",
      comunicacion: "Comunicación",
    };

    ejeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const ejeKey = btn.dataset.eje;
        const label = ejeLabels[ejeKey] || ejeKey || "";

        // Cambiar estado visual activo
        ejeButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        // Escribir el eje en el textarea
        if (label) {
          questionEl.value = `[${label}] `;
          questionEl.focus();
        }

        // Dibujar un glyph aleatorio dentro del círculo
        if (glyphLayer) {
          // Borrar cualquier glyph previo al cambiar de color
          while (glyphLayer.firstChild) {
            glyphLayer.removeChild(glyphLayer.firstChild);
          }

          const wrapper = document.createElement("div");
          wrapper.className = `tp7-disk-glyph tp7-disk-glyph-${ejeKey}`;

          const img = document.createElement("img");
          const index = Math.floor(Math.random() * 32); // glyph_00 a glyph_31
          const padded = index.toString().padStart(2, "0");
          img.src = `img/glyph/glyph_${padded}.png`;
          img.alt = `Glyph ${padded}`;

          // Posición aleatoria dentro de la capa (en porcentaje)
          const top = 15 + Math.random() * 70;
          const left = 15 + Math.random() * 70;
          wrapper.style.top = `${top}%`;
          wrapper.style.left = `${left}%`;

          wrapper.appendChild(img);

          glyphLayer.appendChild(wrapper);
        }
      });
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const prompt = questionEl.value.trim();
    if (!prompt) return;

    statusEl.textContent = "Consultando al asistente del Re(s)etario...";
    answerContainer.hidden = true;
    answerTextEl.textContent = "";

    try {
      // URL de la Firebase Function HTTP.
      // En emulador suele ser:
      //   http://127.0.0.1:5001/PROJECT_ID/REGION/callGemini
      // En producción algo como:
      //   https://REGION-PROJECT_ID.cloudfunctions.net/callGemini
      //
      // Truco práctico: durante desarrollo, puedes sobrescribir esta constante
      // directamente para apuntar al emulador; en producción, a la URL deployada.
      const FUNCTION_URL = "/callGemini"; // opción simple si usas rewrite en firebase.json

      const response = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({prompt}),
      });

      if (!response.ok) {
        let message = `Error al llamar al asistente (código ${response.status}).`;
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            message += ` ${errData.error}`;
          }
        } catch (_e) {
          // ignorar errores de parseo de JSON
        }
        statusEl.textContent = message;
        return;
      }

      const data = await response.json();
      const text = (data && data.text) || "No he podido generar una respuesta útil.";

      statusEl.textContent = "";
      answerContainer.hidden = false;
      answerTextEl.textContent = text;
    } catch (err) {
      console.error("Error llamando al asistente del Re(s)etario:", err);
      statusEl.textContent =
        "Hubo un problema de conexión con el asistente. Revisa tu conexión o inténtalo de nuevo.";
    }
  });
});


