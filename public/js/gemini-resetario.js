// Cliente frontend para hablar con la Firebase Function `callGemini`
// sin exponer la API key de Gemini en el navegador.

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("resetario-ai-form");
  const statusEl = document.getElementById("resetario-ai-status");
  const answerSection = document.getElementById("resetario-ai-answer");
  const answerTextEl = document.getElementById("resetario-ai-answer-text");
  const answerTitleEl = document.getElementById("resetario-ai-answer-title");
  const themeToggle = document.getElementById("resetario-ai-theme-toggle");
  const resetarioSection = document.getElementById("resetario-ai");
  const ejeButtons = document.querySelectorAll(".tp7-eje-button");
  const glyphLayer = document.querySelector(".tp7-disk-glyph-layer");
  const submitButton = document.querySelector(".tp7-submit-button");
  const escButton = document.getElementById("resetario-ai-esc");
  let currentEjeKey = null;
  let currentGlyphIndex = null;
  // Hasta tres glyphs pueden estar seleccionados como tácticas a la vez
  let selectedGlyphCards = [];
  let cardsData = null; // Datos del resetario para recuperar número y glyph
  let colorMeanings = null; // Colores por eje desde glyph-dictionary.json

  const ejeLabels = {
    agua: "Agua",
    alimento: "Alimento",
    cobijo: "Cobijo",
    energia: "Energía",
    comunicacion: "Comunicación",
  };

  const ejeToColorKey = {
    agua: "blue",
    alimento: "green",
    cobijo: "yellow",
    energia: "red",
    comunicacion: "orange",
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

  // Cargar colores desde glyph-dictionary.json (una sola vez)
  async function loadGlyphDictionary() {
    if (colorMeanings) return colorMeanings;
    try {
      const resp = await fetch("data/glyph-dictionary.json");
      const json = await resp.json();
      colorMeanings = (json && json.colorMeanings) || null;
    } catch (e) {
      console.error("No se pudo cargar glyph-dictionary.json", e);
      colorMeanings = null;
    }
    return colorMeanings;
  }

  // Dibujar una tarjeta de información inicial bajo el dispositivo
  function renderInitialInfoCard() {
    if (!answerSection || !answerTextEl) return;

    answerSection.hidden = false;
    if (answerTitleEl) {
      answerTitleEl.hidden = true;
    }
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
              <p>Seleccione un eje de color y oprime <strong>Re(s)et</strong>. Luego aparecerá una tarjeta de táctica con una propuesta para ese eje.</p>
              <p>Puede cambiar de eje en cualquier momento y volver a pulsar <strong>Re(s)et</strong> para explorar nuevas tácticas.</p>
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

  // Renderizar en el área de tarjetas las tácticas seleccionadas (glyphs)
  function renderSelectedGlyphCards() {
    if (!answerSection || !answerTextEl) return;

    answerSection.hidden = false;
    if (answerTitleEl) {
      answerTitleEl.hidden = false;
    }

    if (!selectedGlyphCards.length) {
      answerTextEl.innerHTML = "";
      return;
    }

    const cardsHtml = selectedGlyphCards
      .slice(0, 3)
      .map((card) => {
        const glyphSrc =
          card.glyph ||
          `img/glyph/glyph_${card.id.toString().padStart(2, "0")}.png`;
        const glyphNumber = card.number || "—";
        const cardColor = card.color || "standard";
        return `
        <div class="reset-card combination-card card-${cardColor} active" aria-label="Táctica seleccionada" tabindex="0">
          <div class="card-inner">
            <div class="card-front">
              <div class="card-top">
                <img src="${glyphSrc}" alt="APICCA Glyph ${glyphNumber}" class="card-glyph">
              </div>
              <div class="card-bottom">
                <span class="card-number">${glyphNumber}</span>
              </div>
            </div>
            <div class="card-back">
              <div class="card-back-content">
                <h3>${card.title}</h3>
                <p>${card.description}</p>
              </div>
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    answerTextEl.innerHTML = cardsHtml;

    // Activar flip independiente para cada tarjeta
    const cardEls = answerTextEl.querySelectorAll(".reset-card");
    cardEls.forEach((cardEl) => {
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
    });
  }

  if (!form) return;

  // Toggle de modo claro/oscuro del aparato
  if (themeToggle && resetarioSection) {
    themeToggle.addEventListener("change", () => {
      if (themeToggle.checked) {
        resetarioSection.classList.add("resetario-ai-light");
      } else {
        resetarioSection.classList.remove("resetario-ai-light");
      }
    });
  }

  // Desactivar envío hasta que se seleccione un eje de color
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.classList.add("tp7-submit-disabled");
  }

  // Mostrar tarjeta de información al cargar la página
  renderInitialInfoCard();

  // Botón Esc: limpiar selecciones y volver al estado inicial
  if (escButton) {
    escButton.addEventListener("click", () => {
      // Limpiar glyphs del disco
      if (glyphLayer) {
        while (glyphLayer.firstChild) {
          glyphLayer.removeChild(glyphLayer.firstChild);
        }
      }

      // Resetear estado de selección
      selectedGlyphCards = [];
      currentGlyphIndex = null;
      currentEjeKey = null;

      // Desactivar botones de eje visualmente
      if (ejeButtons && ejeButtons.length > 0) {
        ejeButtons.forEach((b) => b.classList.remove("active"));
      }

      // Desactivar botón Re(s)et hasta nueva selección
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.classList.add("tp7-submit-disabled");
      }

      // Limpiar dimensiones seleccionadas
      if (form) {
        const dimensionCheckboxes =
          form.querySelectorAll('input[name="dimension"]');
        dimensionCheckboxes.forEach((cb) => {
          cb.checked = false;
        });
      }

      // Limpiar mensajes y tarjetas y volver a la tarjeta de ayuda inicial
      if (statusEl) {
        statusEl.textContent = "";
      }
      renderInitialInfoCard();
    });
  }

  // Botones de ejes de color (agua, alimento, cobijo, etc.)
  if (ejeButtons && ejeButtons.length > 0) {
    ejeButtons.forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ejeKey = btn.dataset.eje;

        // Cambiar estado visual activo
        ejeButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        // Guardar el eje seleccionado (sin mostrarlo en el textarea)
        currentEjeKey = ejeKey;
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.classList.remove("tp7-submit-disabled");
        }

        // Si ya hay tres glyphs seleccionados, no añadir más
        if (selectedGlyphCards.length >= 3) {
          if (statusEl) {
            statusEl.textContent =
              "Ya seleccionaste tres tácticas. Puedes hacer Re(s)et o recargar para elegir de nuevo.";
          }
          return;
        }

        // Dibujar un glyph aleatorio dentro del círculo, pero solo del color del eje.
        // Cada glyph representa una táctica potencial que el modelo usará como contexto.
        if (glyphLayer) {
          const allCards = await loadCardsData();
          const colorKey = ejeToColorKey[ejeKey];
          const usedIds = new Set(selectedGlyphCards.map((c) => c.id));
          let candidates = Array.isArray(allCards)
            ? allCards.filter(
                (c) => c.color === colorKey && !usedIds.has(c.id),
              )
            : [];

          // Si ya usamos todos los glyphs de ese color, permitir repetir
          if (!candidates.length && Array.isArray(allCards)) {
            candidates = allCards.filter((c) => c.color === colorKey);
          }

          if (!candidates.length) {
            return;
          }

          const chosen =
            candidates[Math.floor(Math.random() * candidates.length)];

          // Registrar la táctica seleccionada
          selectedGlyphCards.push(chosen);

          const wrapper = document.createElement("div");
          wrapper.className = `tp7-disk-glyph tp7-disk-glyph-${ejeKey}`;

          const img = document.createElement("img");
          currentGlyphIndex = chosen.id;
          const padded = chosen.id.toString().padStart(2, "0");
          img.src = chosen.glyph || `img/glyph/glyph_${padded}.png`;
          img.alt = `Glyph ${padded}`;

          // Posición aleatoria dentro de la capa (en porcentaje)
          const top = 15 + Math.random() * 70;
          const left = 15 + Math.random() * 70;
          wrapper.style.top = `${top}%`;
          wrapper.style.left = `${left}%`;

          wrapper.appendChild(img);
          glyphLayer.appendChild(wrapper);
        }

        // Actualizar las tarjetas de tácticas visibles bajo el dispositivo
        renderSelectedGlyphCards();
      });
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Construir texto de usuario a partir de las dimensiones seleccionadas
    const dimensionCheckboxes = form.querySelectorAll('input[name="dimension"]');
    const selectedDimensions = Array.from(dimensionCheckboxes)
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);

    if (selectedDimensions.length === 0) {
      statusEl.textContent = "Selecciona al menos una dimensión: Tiempo, Espacio o Conocimiento.";
      return;
    }

    const userText = `Dimensiones seleccionadas: ${selectedDimensions.join(", ")}.`;

    // Construir texto de tácticas a partir de los glyphs seleccionados
    // Cada glyph se interpreta como una táctica: Tactica: <title> | <description>
    const tacticsText =
      selectedGlyphCards && selectedGlyphCards.length
        ? selectedGlyphCards
            .slice(0, 3)
            .map(
              (card) =>
                `Tactica: ${card.title} | ${card.description}`,
            )
            .join("\n")
        : "";

    const ejeLabel =
      currentEjeKey && ejeLabels[currentEjeKey]
        ? `[${ejeLabels[currentEjeKey]}] `
        : "";
    const prompt = tacticsText
      ? `${ejeLabel}${userText}\n${tacticsText}`
      : `${ejeLabel}${userText}`;

    // Mostrar cuadro de diálogo con el prompt que se va a enviar
    window.alert(`Prompt enviado al asistente:\n\n${prompt}`);

    statusEl.textContent = "Consultando...";
    if (answerSection) {
      answerSection.hidden = false;
    }
    if (answerTitleEl) {
      answerTitleEl.hidden = false;
    }
    // Mostrar spinner mientras llega la respuesta
    answerTextEl.innerHTML = `
      <div class="resetario-ai-loading">
        <div class="loading-spinner"></div>
      </div>
    `;

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

      let cardInfo = null;

      // Si no hay glyph seleccionado aún, elegir uno aleatorio PERO solo
      // entre los glyph del color correspondiente al eje actual
      if (currentGlyphIndex === null) {
        if (currentEjeKey) {
          const ejeToColor = {
            agua: "blue",
            alimento: "green",
            cobijo: "yellow",
            energia: "red",
            comunicacion: "orange",
          };
          const desiredColor = ejeToColor[currentEjeKey];
          const candidates = Array.isArray(cardsData)
            ? cardsData.filter((c) => c.color === desiredColor)
            : [];

          if (candidates.length) {
            cardInfo =
              candidates[Math.floor(Math.random() * candidates.length)];
            currentGlyphIndex = cardInfo.id;
          }
        }

        // Si todavía no tenemos glyph (por ejemplo, sin eje activo), usar cualquiera
        if (currentGlyphIndex === null && Array.isArray(cardsData) && cardsData.length) {
          const any = cardsData[Math.floor(Math.random() * cardsData.length)];
          cardInfo = any;
          currentGlyphIndex = any.id;
        }
      } else {
        // Ya había glyph seleccionado: tomar su carta por índice/id
        cardInfo =
          Array.isArray(cardsData) && cardsData.length > currentGlyphIndex
            ? cardsData[currentGlyphIndex]
            : null;
      }

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


