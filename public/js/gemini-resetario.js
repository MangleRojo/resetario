// Cliente frontend para hablar con la Firebase Function `callGemini`
// sin exponer la API key de Gemini en el navegador.

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("resetario-ai-form");
  const questionEl = document.getElementById("resetario-ai-question");
  const statusEl = document.getElementById("resetario-ai-status");
  const answerSection = document.getElementById("resetario-ai-answer");
  const answerTextEl = document.getElementById("resetario-ai-answer-text");
  const ejeButtons = document.querySelectorAll(".tp7-eje-button");
  const glyphLayer = document.querySelector(".tp7-disk-glyph-layer");
  let currentEjeKey = null;
  let currentGlyphIndex = null;
  let cardsData = null; // Datos del resetario para recuperar número y glyph

  const ejeLabels = {
    agua: "Agua",
    alimento: "Alimento",
    cobijo: "Cobijo",
    energia: "Energía",
    comunicacion: "Comunicación",
  };

  // Cargar datos de las cartas del Re(s)etario (una sola vez)
  async function loadCardsData() {
    if (cardsData) return cardsData;
    try {
      const resp = await fetch("data/resetario-cards.json");
      const json = await resp.json();
      cardsData = json.cards || [];
    } catch (e) {
      console.error("No se pudieron cargar los datos de resetario-cards.json", e);
      cardsData = [];
    }
    return cardsData;
  }

  // Dibujar una tarjeta de información inicial bajo el dispositivo
  function renderInitialInfoCard() {
    if (!answerSection || !answerTextEl) return;

    answerSection.hidden = false;
    answerTextEl.innerHTML = `
      <div class="reset-card resetario-ai-info-card active" aria-label="Información sobre el Re(s)etario" tabindex="0">
        <div class="card-inner">
          <div class="card-front">
            <div class="resetario-ai-info-front">
              <div class="resetario-ai-info-icon">
                <span>i</span>
              </div>
              <div class="resetario-ai-info-label">Info</div>
            </div>
          </div>
          <div class="card-back">
            <div class="card-back-content">
              <h4>Instrucciones</h4>
              <p>Selecciona un eje de color y oprime <strong>Re(s)et</strong>. El Re(s)etario generará una tarjeta de táctica con una propuesta concreta para ese eje.</p>
              <p>Puedes cambiar de eje en cualquier momento y volver a pulsar <strong>Re(s)et</strong> para explorar nuevas tácticas.</p>
            </div>
          </div>
        </div>
      </div>
    `;

    const infoCard = answerTextEl.querySelector(".resetario-ai-info-card");
    if (infoCard) {
      const toggleFlip = () => {
        infoCard.classList.toggle("flipped");
      };
      infoCard.addEventListener("click", toggleFlip);
      infoCard.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          toggleFlip();
        }
      });
    }
  }

  if (!form || !questionEl) return;

  // Mostrar tarjeta de información al cargar la página
  renderInitialInfoCard();

  // Botones de ejes de color (agua, alimento, cobijo, etc.)
  if (ejeButtons && ejeButtons.length > 0) {
    ejeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const ejeKey = btn.dataset.eje;
        const label = ejeLabels[ejeKey] || ejeKey || "";

        // Cambiar estado visual activo
        ejeButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        // Guardar el eje seleccionado (sin mostrarlo en el textarea)
        currentEjeKey = ejeKey;
        if (label) {
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
          currentGlyphIndex = index;
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

    const userText = questionEl.value.trim();
    if (!userText) return;

    const ejeLabel =
      currentEjeKey && ejeLabels[currentEjeKey]
        ? `[${ejeLabels[currentEjeKey]}] `
        : "";
    const prompt = `${ejeLabel}${userText}`;

    // Limpiar el textarea justo después de construir el prompt
    questionEl.value = "";

    statusEl.textContent = "Consultando...";
    if (answerSection) {
      answerSection.hidden = true;
    }
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

      // Asegurar datos de cartas cargados para recuperar número / glyph
      await loadCardsData();

      // Si no hay glyph seleccionado aún, elegir uno aleatorio para esta respuesta
      if (currentGlyphIndex === null) {
        currentGlyphIndex = Math.floor(Math.random() * 32);
      }

      const cardInfo =
        Array.isArray(cardsData) && cardsData.length > currentGlyphIndex
          ? cardsData[currentGlyphIndex]
          : null;

      // Mapear eje -> color de tarjeta
      const ejeToColor = {
        agua: "blue",
        alimento: "green",
        cobijo: "yellow",
        energia: "red",
        comunicacion: "orange",
      };

      const cardColor =
        (currentEjeKey && ejeToColor[currentEjeKey]) ||
        (cardInfo && cardInfo.color) ||
        "standard";

      const glyphSrc =
        (cardInfo && cardInfo.glyph) ||
        (currentGlyphIndex !== null
          ? `img/glyph/glyph_${currentGlyphIndex.toString().padStart(2, "0")}.png`
          : "");

      const glyphNumber = (cardInfo && cardInfo.number) || "—";

      // Texto del reverso según el botón de color/eje seleccionado
      const backTitle =
        (currentEjeKey && ejeLabels[currentEjeKey]) || "Respuesta";

      // Construir tarjeta tipo reset-card con frente/reverso
      const cardHTML = `
        <div class="reset-card combination-card card-${cardColor} active" aria-label="Respuesta generada" tabindex="0">
          <div class="card-inner">
            <div class="card-front">
              <div class="card-top">
                ${
                  glyphSrc
                    ? `<img src="${glyphSrc}" alt="APICCA Glyph ${glyphNumber}" class="card-glyph">`
                    : ""
                }
              </div>
              <div class="card-bottom">
                <span class="card-number">${glyphNumber}</span>
              </div>
            </div>
              <div class="card-back">
                <div class="card-back-content">
                  <h3>${backTitle}</h3>
                  <p>Selecciona un eje de color y oprime <strong>Re(s)et</strong>. Luego aparecerá una tarjeta de táctica como esta, con una propuesta para ese eje.</p>
                  <p>${text}</p>
                </div>
              </div>
          </div>
        </div>
      `;

      answerTextEl.innerHTML = cardHTML;

      // Activar flip al hacer clic / Enter
      const cardEl = answerTextEl.querySelector(".reset-card");
      if (cardEl) {
        const toggleFlip = () => {
          cardEl.classList.toggle("flipped");
        };
        cardEl.addEventListener("click", toggleFlip);
        cardEl.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            toggleFlip();
          }
        });
      }

      if (answerSection) {
        answerSection.hidden = false;
        answerSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (err) {
      console.error("Error llamando al asistente del Re(s)etario:", err);
      statusEl.textContent =
        "Hubo un problema de conexión con el asistente. Revisa tu conexión o inténtalo de nuevo.";
    }
  });
});


