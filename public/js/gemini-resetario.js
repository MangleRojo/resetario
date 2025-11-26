// Cliente frontend para hablar con la Firebase Function `callGemini`
// sin exponer la API key de Gemini en el navegador.

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("resetario-ai-form");
  const statusEl = document.getElementById("resetario-ai-status");
  const answerSection = document.getElementById("resetario-ai-answer");
  const answerTextEl = document.getElementById("resetario-ai-answer-text");
  const responseTextEl = document.getElementById("resetario-ai-response-text");
  const answerTitleEl = document.getElementById("resetario-ai-answer-title");
  const tacticsPrevBtn = document.getElementById("resetario-ai-tactics-prev");
  const tacticsNextBtn = document.getElementById("resetario-ai-tactics-next");
  const tacticsCounterEl = document.getElementById(
    "resetario-ai-tactics-counter",
  );
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
  let currentTacticIndex = 0;
  let currentDimensions = [];
  let cardsData = null; // Datos del resetario para recuperar número y glyph
  let colorMeanings = null; // Colores por eje desde glyph-dictionary.json

  // ========== Sistema de Audio (Web Audio API) ==========
  let audioContext = null;

  // Inicializar AudioContext (lazy loading para evitar warnings del navegador)
  function getAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
  }

  // Generar un tono sintético estilo TP-7
  function playTone(frequency, duration = 0.08, type = 'sine') {
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = type;
      oscillator.frequency.value = frequency;

      // Envelope ADSR simple
      const now = ctx.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01); // Attack
      gainNode.gain.linearRampToValueAtTime(0.1, now + 0.03); // Decay
      gainNode.gain.setValueAtTime(0.1, now + duration - 0.02); // Sustain
      gainNode.gain.linearRampToValueAtTime(0, now + duration); // Release

      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (e) {
      // Silenciar errores de audio (navegadores sin soporte)
      console.warn('Audio no disponible:', e);
    }
  }

  // Frecuencias para cada eje (escala pentatónica menor)
  const ejeFrequencies = {
    agua: 440,      // A4 - Azul
    alimento: 523,  // C5 - Verde
    cobijo: 587,    // D5 - Amarillo
    energia: 659,   // E5 - Rojo
    comunicacion: 784, // G5 - Naranja
  };

  // Sonidos para dimensiones (octava más alta)
  const dimensionFrequencies = {
    Tiempo: 880,      // A5
    Espacio: 1047,    // C6
    Información: 1175, // D6
  };

  function playEjeSound(ejeKey) {
    const freq = ejeFrequencies[ejeKey] || 440;
    playTone(freq, 0.1, 'triangle');
  }

  function playDimensionSound(dimension) {
    const freq = dimensionFrequencies[dimension] || 880;
    playTone(freq, 0.06, 'sine');
  }

  function playSubmitSound() {
    // Acorde ascendente para submit
    playTone(523, 0.08, 'square');
    setTimeout(() => playTone(659, 0.08, 'square'), 50);
    setTimeout(() => playTone(784, 0.12, 'square'), 100);
  }

  function playEscSound() {
    // Tono descendente para reset
    playTone(784, 0.06, 'sawtooth');
    setTimeout(() => playTone(523, 0.08, 'sawtooth'), 40);
  }

  function generateHash(length = 16) {
    const chars = "abcdef0123456789";
    let out = "";
    for (let i = 0; i < length; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }

  function colorClassFor(colorKey) {
    switch (colorKey) {
      case "red":
        return "resetario-bar-red";
      case "blue":
        return "resetario-bar-blue";
      case "green":
        return "resetario-bar-green";
      case "yellow":
        return "resetario-bar-yellow";
      case "orange":
        return "resetario-bar-orange";
      default:
        return "resetario-bar-neutral";
    }
  }

  function getBarCardsForOutput(cardInfo) {
    if (selectedGlyphCards.length > 0) {
      return selectedGlyphCards.slice(0, 3);
    }
    if (cardInfo) {
      return [
        {
          color: cardInfo.color || "standard",
          ejeKey: currentEjeKey || null,
          proximity: 0.5,
        },
      ];
    }
    return [];
  }

  function renderResetarioOutput({ text, cardInfo, loading }) {
    if (!responseTextEl) return;

    const barCards = getBarCardsForOutput(cardInfo);

    const barsHtml = barCards
      .map((c) => {
        const prox =
          typeof c.proximity === "number" && !Number.isNaN(c.proximity)
            ? c.proximity
            : 0.5;
        // Altura entre 24px y 80px según la proximidad al centro
        const height = 24 + Math.round(prox * 56);
        const barClass = colorClassFor(c.color);
        return `<div class="resetario-bar ${barClass}" style="height:${height}px"></div>`;
      })
      .join("");

    const hash = !loading ? generateHash(16) : "";

    const dimsText = currentDimensions.length
      ? currentDimensions.join(", ")
      : "—";

    const tacticsLines = selectedGlyphCards.slice(0, 3).map((card) => {
      const colorKey =
        card.color || (card.ejeKey && ejeToColorKey[card.ejeKey]) || "neutral";
      const badgeClasses = `resetario-tactic-badge resetario-tactic-badge-${colorKey}`;
      return `<span class="${badgeClasses}">${card.title}</span>`;
    });

    const tacticsHtml =
      tacticsLines.length > 0 ?
        tacticsLines.join("") :
        '<p class="resetario-section-empty">Selecciona uno o más glyphs para ver tácticas.</p>';

    const resetHtml = loading
      ? `<div class="resetario-section-content resetario-output-text-loading">
            <div class="resetario-ai-loading">
              <div class="loading-spinner"></div>
            </div>
         </div>`
      : `<div class="resetario-section-content">
            <p class="resetario-output-text">${text}</p>
         </div>`;

    const bodyHtml = `
      <div class="resetario-sections">
        <div class="resetario-section">
          <div class="resetario-section-content resetario-tactics-row">
            ${tacticsHtml}
          </div>
        </div>
        <div class="resetario-section">
          <div class="resetario-section-label">Re(s)et</div>
          ${resetHtml}
        </div>
        <div class="resetario-section">
          <div class="resetario-section-label">Dimensiones</div>
          <div class="resetario-section-content">
            <p>${dimsText}</p>
          </div>
        </div>
      </div>
    `;

    const footerHtml = `<div class="resetario-output-footer">
        ${hash ? `<span class="resetario-output-hash">${hash}</span>` : ""}
      </div>`;

    const responseHtml = `
      <div class="resetario-output" aria-label="Respuesta del Re(s)etario">
        <div class="resetario-output-header">
          <div class="resetario-output-title">
            <div class="resetario-output-title-main">Re(s)etario</div>
            <div class="resetario-output-title-sub">v.0.2</div>
          </div>
          <div class="resetario-output-bars">
            ${barsHtml}
          </div>
        </div>
        <div class="resetario-output-body">
          ${bodyHtml}
        </div>
        ${footerHtml}
      </div>
    `;

    responseTextEl.innerHTML = responseHtml;

    // Desplazar suavemente hasta la tarjeta de respuesta
    responseTextEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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
    // Volver al modo información (sin carrusel)
    answerTextEl.classList.add("info-mode");
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

  function updateTacticNavButtons() {
    if (!tacticsPrevBtn || !tacticsNextBtn || !tacticsCounterEl) return;
    const total = selectedGlyphCards.length;
    if (!total) {
      tacticsPrevBtn.disabled = true;
      tacticsNextBtn.disabled = true;
      tacticsCounterEl.textContent = "0 / 0";
      return;
    }
    tacticsPrevBtn.disabled = currentTacticIndex <= 0;
    tacticsNextBtn.disabled = currentTacticIndex >= total - 1;
    tacticsCounterEl.textContent = `${currentTacticIndex + 1} / ${total}`;
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
      // Si no hay tácticas, podemos volver a modo información cuando toque
      currentTacticIndex = 0;
      updateTacticNavButtons();
      return;
    }

    // Al mostrar tácticas, quitar el modo información
    answerTextEl.classList.remove("info-mode");

    // Asegurar que el índice actual está dentro de rango
    if (currentTacticIndex >= selectedGlyphCards.length) {
      currentTacticIndex = selectedGlyphCards.length - 1;
    }

    const card = selectedGlyphCards[currentTacticIndex];
    const glyphSrc =
      card.glyph ||
      `img/glyph/glyph_${card.id.toString().padStart(2, "0")}.png`;
    const glyphNumber = card.number || "—";
    const cardColor = card.color || "standard";

    const cardHtml = `
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

    answerTextEl.innerHTML = cardHtml;

    // Activar flip para la tarjeta actual
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

    updateTacticNavButtons();
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
      currentTacticIndex = 0;
      currentDimensions = [];
      updateTacticNavButtons();

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
      if (responseTextEl) {
        responseTextEl.innerHTML = "";
      }
      renderInitialInfoCard();
    });
  }

  // Botones de ejes de color (agua, alimento, cobijo, etc.)
  if (ejeButtons && ejeButtons.length > 0) {
    ejeButtons.forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ejeKey = btn.dataset.eje;

        playEjeSound(ejeKey);

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

          // Posición aleatoria dentro del círculo (en porcentaje)
          const top = 15 + Math.random() * 70;
          const left = 15 + Math.random() * 70;

          // Proximidad al centro del círculo (1 = muy cerca del centro, 0 = borde)
          const dx = left - 50;
          const dy = top - 50;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = Math.sqrt(35 * 35 + 35 * 35);
          const proximity = 1 - Math.min(dist / maxDist, 1);

          // Registrar la táctica seleccionada junto con el eje que la generó
          selectedGlyphCards.push({
            ...chosen,
            ejeKey,
            proximity,
          });
          currentTacticIndex = selectedGlyphCards.length - 1;

          const wrapper = document.createElement("div");
          wrapper.className = `tp7-disk-glyph tp7-disk-glyph-${ejeKey}`;

          const img = document.createElement("img");
          currentGlyphIndex = chosen.id;
          const padded = chosen.id.toString().padStart(2, "0");
          img.src = chosen.glyph || `img/glyph/glyph_${padded}.png`;
          img.alt = `Glyph ${padded}`;

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

  // Navegación de tácticas estilo mazo (una tarjeta visible a la vez)
  if (tacticsPrevBtn) {
    tacticsPrevBtn.addEventListener("click", () => {
      if (currentTacticIndex > 0) {
        currentTacticIndex -= 1;
        renderSelectedGlyphCards();
      }
    });
  }

  if (tacticsNextBtn) {
    tacticsNextBtn.addEventListener("click", () => {
      if (currentTacticIndex < selectedGlyphCards.length - 1) {
        currentTacticIndex += 1;
        renderSelectedGlyphCards();
      }
    });
  }

  // (sin navegación por flechas: el usuario desplaza el carrusel con scroll horizontal)

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

    currentDimensions = selectedDimensions;
    const userText = `Dimensiones seleccionadas: ${selectedDimensions.join(
      ", ",
    )}.`;

    // Construir texto de tácticas a partir de los glyphs seleccionados
    // Formato:
    // Dimensiones seleccionadas: ...
    //
    // Tacticas:
    //
    // [Agua] Flujo | El movimiento y circulación de recursos
    const tacticsText =
      selectedGlyphCards && selectedGlyphCards.length
        ? selectedGlyphCards
          .slice(0, 3)
          .map(
            (card) => {
              const ejeLabelForCard =
                card.ejeKey && ejeLabels[card.ejeKey]
                  ? `[${ejeLabels[card.ejeKey]}] `
                  : "";
              return `${ejeLabelForCard}${card.title} | ${card.description}`;
            },
          )
          .join("\n")
        : "";

    const prompt = tacticsText
      ? `${userText}\n\nTacticas:\n\n${tacticsText}`
      : `${userText}`;

    statusEl.textContent = "Consultando...";
    if (answerSection) {
      answerSection.hidden = false;
    }
    if (answerTitleEl) {
      answerTitleEl.hidden = false;
    }
    // Dibujar la tarjeta de Resetario inmediatamente con spinner
    renderResetarioOutput({ text: "", cardInfo: null, loading: true });

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
        body: JSON.stringify({ prompt }),
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

      // Dibujar el Resetario con el contenido final
      renderResetarioOutput({ text, cardInfo, loading: false });

      if (answerSection) {
        answerSection.hidden = false;
      }
    } catch (err) {
      console.error("Error llamando al asistente del Re(s)etario:", err);
      statusEl.textContent =
        "Hubo un problema de conexión con el asistente. Revisa tu conexión o inténtalo de nuevo.";
    }
  });

  // ========== Navegación por teclado ==========
  // Mapeo de teclas a ejes:
  // 1 → Agua (azul)
  // 2 → Alimento (verde)
  // 3 → Cobijo (amarillo)
  // 4 → Energía (rojo)
  // 5 → Comunicación (naranja)
  // T → Tiempo (dimensión)
  // E → Espacio (dimensión)
  // I → Información (dimensión)
  // Enter → Re(s)et (submit)
  // Escape → Esc (reset)

  const keyToEje = {
    "1": "agua",
    "2": "alimento",
    "3": "cobijo",
    "4": "energia",
    "5": "comunicacion",
  };

  const keyToDimension = {
    "t": "Tiempo",
    "T": "Tiempo",
    "e": "Espacio",
    "E": "Espacio",
    "i": "Información",
    "I": "Información",
  };

  document.addEventListener("keydown", (event) => {
    // Ignorar si estamos escribiendo en un input/textarea
    const activeElement = document.activeElement;
    if (
      activeElement &&
      (activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.isContentEditable)
    ) {
      return;
    }

    // Tecla Escape → disparar botón Esc
    if (event.key === "Escape" && escButton) {
      event.preventDefault();
      escButton.click();
      return;
    }

    // Tecla Enter → disparar botón Re(s)et (si está habilitado)
    if (event.key === "Enter" && submitButton && !submitButton.disabled) {
      event.preventDefault();
      submitButton.click();
      return;
    }

    // Teclas 1-5 → disparar botones de ejes
    if (keyToEje[event.key] && ejeButtons && ejeButtons.length > 0) {
      event.preventDefault();
      const targetEje = keyToEje[event.key];

      // Buscar el botón correspondiente al eje
      const targetButton = Array.from(ejeButtons).find(
        (btn) => btn.dataset.eje === targetEje
      );

      if (targetButton) {
        playEjeSound(targetEje);
        targetButton.click();
      }
      return;
    }

    // Teclas T, E, I → togglear checkboxes de dimensiones
    if (keyToDimension[event.key]) {
      event.preventDefault();
      const dimensionValue = keyToDimension[event.key];

      // Buscar el checkbox correspondiente a la dimensión
      const dimensionCheckboxes = form.querySelectorAll('input[name="dimension"]');
      const targetCheckbox = Array.from(dimensionCheckboxes).find(
        (cb) => cb.value === dimensionValue
      );

      if (targetCheckbox) {
        playDimensionSound(dimensionValue);
        targetCheckbox.checked = !targetCheckbox.checked;
        // Disparar evento change para que cualquier listener lo detecte
        targetCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });
});


