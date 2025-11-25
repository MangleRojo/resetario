console.log('resetario.js loaded!');

let cardsData = [];
let uniqueColors = [];
let currentColor = null;
let glyphSequence = []; // Array para almacenar la secuencia de glyphs
let awaitingColorSelection = false; // Se activa al presionar Alt
let pendingGlyphColor = null; // Color que se aplicará al siguiente glyph
let glyphDictionary = null; // Diccionario de combinaciones

// Cargar datos del JSON
async function loadCardsData() {
    try {
        const response = await fetch('data/resetario-cards.json');
        const data = await response.json();
        cardsData = data.cards;
        console.log('Cards data loaded:', cardsData.length);

        // Cargar diccionario de combinaciones
        try {
            const dictResponse = await fetch('data/glyph-dictionary.json');
            glyphDictionary = await dictResponse.json();
            console.log('Glyph dictionary loaded');
        } catch (dictError) {
            console.error('Error loading glyph dictionary:', dictError);
        }

        // Obtener colores únicos
        uniqueColors = [...new Set(cardsData.map(card => card.color))];
        console.log('Unique colors:', uniqueColors);

        renderColorGraph();
        renderKeyboard(); // Renderizar el teclado
        renderDisplay(); // Renderizar display inicial
        setupEventListeners();
        setupKeyboardListeners(); // Listeners para el teclado
        showInstructions(); // Mostrar instrucciones al cargar
    } catch (error) {
        console.error('Error loading cards data:', error);
    }
}

// Renderizar solo un grafo por color único
function renderColorGraph() {
    const colorGraph = document.getElementById('colorGraph');
    colorGraph.innerHTML = '';

    // Orden específico: Azul, Verde, Amarillo, Rojo, Naranja
    const colorOrder = ['blue', 'green', 'yellow', 'red', 'orange'];
    const orderedColors = colorOrder.filter(color => uniqueColors.includes(color));

    orderedColors.forEach(color => {
        const nodeHTML = `<div class="color-node color-${color}"></div>`;
        colorGraph.innerHTML += nodeHTML;
    });
}

// Renderizar teclado de 45 teclas (estilo Teenage Engineering)
function renderKeyboard() {
    const leftSector = document.getElementById('keyboard-left');
    const topSector = document.getElementById('keyboard-top');
    const rightSector = document.getElementById('keyboard-right');
    const centerSector = document.getElementById('keyboard-center');
    const bottomSector = document.getElementById('keyboard-bottom');

    // Limpiar sectores
    leftSector.innerHTML = '';
    topSector.innerHTML = '';
    rightSector.innerHTML = '';
    centerSector.innerHTML = '';
    bottomSector.innerHTML = '';

    const colorMap = {
        'red': 'key-red',
        'blue': 'key-blue',
        'green': 'key-green',
        'yellow': 'key-yellow',
        'orange': 'key-orange'
    };

    // S1: ESC y ALT (izquierda vertical)
    leftSector.innerHTML = `
        <button class="key key-special key-esc" data-type="esc">
            <span class="key-label">Esc</span>
        </button>
        <button class="key key-special key-alt" data-type="alt">
            <span class="key-label">Alt</span>
        </button>
    `;

    // S2: Teclas de colores (arriba centro)
    // Orden específico: Azul, Verde, Amarillo, Rojo, Naranja
    const colorOrder = ['blue', 'green', 'yellow', 'red', 'orange'];
    const orderedColors = colorOrder.filter(color => uniqueColors.includes(color));

    orderedColors.forEach(color => {
        const colorClass = colorMap[color] || '';
        const keyHTML = `
            <button class="key key-color ${colorClass}" data-color="${color}" data-type="color"></button>
        `;
        topSector.innerHTML += keyHTML;
    });

    // S3: 32 teclas con glyphs (centro grande)
    cardsData.forEach(card => {
        const keyHTML = `
            <button class="key key-glyph" data-id="${card.id}" data-type="glyph" data-glyph="${card.glyph}" data-number="${card.number}" data-color="${card.color}">
                <img src="${card.glyph}" alt="Glyph ${card.number}">
            </button>
        `;
        centerSector.innerHTML += keyHTML;
    });

    // S5: Tecla RE(S)ET (derecha vertical)
    rightSector.innerHTML = `
        <button class="key key-special key-enter key-enter-large" data-type="enter">
            <span class="key-label">Re(s)et</span>
        </button>
        <span class="keyboard-version">v.0.1</span>
    `;

    // S4: Barra espaciadora (abajo centro)
    bottomSector.innerHTML = `
        <button class="key key-empty key-spacebar" data-type="spacebar">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
        </button>
    `;

    console.log('Keyboard rendered: 41 keys in 5 sectors (S1:ESC+ALT, S2:colors, S3:glyphs, S4:spacebar, S5:ENTER)');
}

// Renderizar el display con la secuencia actual
function renderDisplay() {
    const displayScreen = document.getElementById('displayScreen');
    displayScreen.innerHTML = '';

    glyphSequence.forEach(glyph => {
        const colorClass = glyph.displayColor ? `display-color-${glyph.displayColor}` : '';
        const glyphHTML = `
            <div class="display-glyph ${colorClass}">
                <img src="${glyph.image}" alt="Glyph ${glyph.number}">
            </div>
        `;
        displayScreen.innerHTML += glyphHTML;
    });

    console.log('Display rendered:', glyphSequence.length, 'glyphs');
}

// Agregar un glyph a la secuencia (máximo 3)
function addGlyphToSequence(glyphData) {
    const glyphToAdd = {
        ...glyphData,
        displayColor: pendingGlyphColor || null // Solo color si se presionó Alt + color
    };

    // Si ya hay 3 glyphs, eliminar el más antiguo (FIFO)
    if (glyphSequence.length >= 3) {
        glyphSequence.shift(); // Eliminar el primer elemento
    }

    glyphSequence.push(glyphToAdd);
    pendingGlyphColor = null;
    renderDisplay();
    console.log('Glyph added:', glyphToAdd.number, '| Sequence length:', glyphSequence.length, '| Color:', glyphToAdd.displayColor || 'none');
}

// Limpiar el display
function clearDisplay() {
    glyphSequence = [];
    pendingGlyphColor = null;
    awaitingColorSelection = false;

    // Remove visual feedback states
    const altKey = document.querySelector('.key-alt');
    if (altKey) altKey.classList.remove('active');

    // Remove pressed state from color keys
    document.querySelectorAll('.key-color').forEach(key => {
        key.classList.remove('selected');
    });

    const displayElement = document.getElementById('glyphDisplay');
    if (displayElement) {
        displayElement.className = 'glyph-display'; // Remove all pending-color classes
    }

    renderDisplay();
    announceToScreenReader('Display limpiado');
    console.log('Display cleared');
}

// Manejar presión de tecla de color
function handleColorKeyPress(color) {
    if (awaitingColorSelection) {
        // Remove 'selected' from all color keys before adding to new one
        document.querySelectorAll('.key-color').forEach(key => {
            key.classList.remove('selected');
        });

        pendingGlyphColor = color;
        // NO desactivar awaitingColorSelection - permitir cambiar de color sin volver a presionar Alt

        // Visual feedback: keep color key pressed
        const colorKey = document.querySelector(`.key-color[data-color="${color}"]`);
        if (colorKey) {
            colorKey.classList.add('selected');
        }

        // Visual feedback: update display border
        updateDisplayColorIndicator(color);

        // Announce to screen reader
        announceToScreenReader(`Color ${getColorName(color)} seleccionado para el siguiente glyph`);

        console.log('Pending glyph color set to:', color);
        return;
    }

    // Si no se presionó Alt primero, no hacer nada
    console.log('Color key pressed without Alt - no action');
}

// Manejar submit de la secuencia
function handleResetSubmit() {
    if (glyphSequence.length === 0) {
        return;
    }

    if (!glyphDictionary) {
        console.error('Error: Diccionario de combinaciones no cargado.');
        return;
    }

    // Crear objeto estructurado con ID y color de cada glyph
    const sequenceData = glyphSequence.map(g => ({
        id: parseInt(g.id),
        glyphId: g.id,
        number: g.number,
        color: g.displayColor || 'standard', // Color asignado o 'standard' si no tiene color
        originalColor: g.color, // Color original del glyph
        image: g.image
    }));

    // Log estructurado para debugging
    console.log('Sequence submitted:', sequenceData);
    console.log('Sequence JSON:', JSON.stringify(sequenceData, null, 2));

    // Renderizar las cartas de combinaciones
    renderCombinations(sequenceData);
}

// Renderizar cartas de combinaciones
function renderCombinations(sequenceData) {
    const combinationsSection = document.getElementById('combinationsSection');
    const combinationsGrid = document.getElementById('combinationsGrid');

    if (!combinationsSection || !combinationsGrid) {
        console.error('Combinations section not found');
        return;
    }

    // Mostrar la sección
    combinationsSection.style.display = 'block';

    // Limpiar grid anterior
    combinationsGrid.innerHTML = '';

    // Crear una carta para cada combinación
    sequenceData.forEach((glyphData, index) => {
        const glyphKey = glyphData.glyphId.toString().padStart(2, '0');
        const glyphInfo = glyphDictionary.glyphs[glyphKey];

        if (!glyphInfo) {
            console.warn(`Glyph ${glyphKey} not found in dictionary`);
            return;
        }

        // Obtener la combinación según el color
        const colorKey = glyphData.color;
        const combination = glyphInfo.combinations[colorKey];

        if (!combination) {
            console.warn(`Combination ${colorKey} not found for glyph ${glyphKey}`);
            return;
        }

        // Obtener información del color
        let colorInfo;
        if (colorKey === 'standard') {
            colorInfo = {
                name: 'Standard',
                meaning: 'Base'
            };
        } else {
            colorInfo = glyphDictionary.colorMeanings[colorKey] || {
                name: colorKey,
                meaning: combination.meaning
            };
        }

        // Determinar clase de color para la tarjeta
        const cardColorClass = colorKey !== 'standard' ? `card-${colorKey}` : 'card-standard';

        // Crear la carta usando el mismo diseño que reset-card
        const cardHTML = `
            <div class="reset-card combination-card ${cardColorClass} active">
                <div class="card-inner">
                    <div class="card-front">
                        <div class="card-top">
                            <img src="${glyphData.image}" alt="Glyph ${glyphData.number}" class="card-glyph">
                        </div>
                        <div class="card-bottom">
                            <span class="card-number">${glyphData.number}</span>
                        </div>
                    </div>
                    <div class="card-back">
                        <div class="card-back-content">
                            <h3>${combination.meaning}</h3>
                            ${combination.description ? `<p>${combination.description}</p>` : `<p>Glyph ${glyphData.number} - ${colorInfo.name || colorKey}</p>`}
                            <div class="loading-spinner"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        combinationsGrid.innerHTML += cardHTML;
    });

    // Restaurar el título de la sección
    const titleElement = combinationsSection.querySelector('.combinations-title');
    if (titleElement) {
        titleElement.textContent = 'Tácticas';
    }

    // Agregar listeners para voltear las cartas
    const combinationCards = combinationsGrid.querySelectorAll('.combination-card');
    combinationCards.forEach(card => {
        card.addEventListener('click', function () {
            this.classList.toggle('flipped');
        });
    });

    // Scroll suave hacia las combinaciones
    combinationsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    console.log('Combinations rendered:', sequenceData.length);
}

// Renderizar tarjeta de información
function renderInfoCard() {
    const combinationsSection = document.getElementById('combinationsSection');
    const combinationsGrid = document.getElementById('combinationsGrid');

    if (!combinationsSection || !combinationsGrid) {
        console.error('Combinations section not found');
        return;
    }

    // Mostrar la sección
    combinationsSection.style.display = 'block';

    // Limpiar grid anterior
    combinationsGrid.innerHTML = '';

    // Obtener información de los colores del diccionario
    let colorsInfo = '';
    if (glyphDictionary && glyphDictionary.colorMeanings) {
        const colorOrder = ['blue', 'green', 'yellow', 'red', 'orange'];
        colorOrder.forEach(colorKey => {
            const colorInfo = glyphDictionary.colorMeanings[colorKey];
            if (colorInfo) {
                colorsInfo += `
                    <div class="info-color-item">
                        <div class="info-color-circle" style="background: ${colorInfo.hex}"></div>
                        <div class="info-color-text">
                            <strong>${colorInfo.name}</strong>: ${colorInfo.meaning}
                        </div>
                    </div>
                `;
            }
        });
    }

    // Crear la tarjeta de información
    const cardHTML = `
        <div class="reset-card combination-card card-info active" style="max-width: 600px; margin: 0 auto;">
            <div class="card-inner">
                <div class="card-front">
                    <div class="card-top" style="background: linear-gradient(135deg, #535353 0%, #3a3a3a 100%); display: flex; align-items: center; justify-content: center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.9;">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                    </div>
                    <div class="card-bottom">
                        <span class="card-number">Info</span>
                    </div>
                </div>
                <div class="card-back">
                    <div class="card-back-content">
                        <div class="info-content">
                            <p><strong>Instrucciones:</strong></p>
                            <ul class="info-list">
                                <li>Presione <strong>Alt</strong> y luego un <strong>color</strong> para seleccionar un color</li>
                                <li>Presione un <strong>glyph</strong> para agregarlo al display (máximo 3)</li>
                                <li>Presione <strong>Re(s)et</strong> para ver las opciones de combinación</li>
                                <li>Presione <strong>Esc</strong> para limpiar el display</li>
                            </ul>
                            <p style="margin-top: 0.75rem;"><strong>Colores y significados:</strong></p>
                            <div class="info-colors">
                                ${colorsInfo}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    combinationsGrid.innerHTML = cardHTML;

    // Cambiar el título de la sección
    const titleElement = combinationsSection.querySelector('.combinations-title');
    if (titleElement) {
        titleElement.textContent = 'Información';
    }

    // Agregar listener para voltear la carta
    const infoCard = combinationsGrid.querySelector('.combination-card');
    if (infoCard) {
        infoCard.addEventListener('click', function () {
            this.classList.toggle('flipped');
        });
    }

    // Scroll suave hacia la información
    combinationsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    console.log('Info card rendered');
}

// Configurar listeners del teclado
function setupKeyboardListeners() {
    // Listener para teclas Glyph
    document.querySelectorAll('.key-glyph').forEach(key => {
        key.addEventListener('click', function () {
            const glyphData = {
                id: this.dataset.id,
                number: this.dataset.number,
                image: this.dataset.glyph,
                color: this.dataset.color
            };
            addGlyphToSequence(glyphData);
        });
    });

    // Listener para teclas de Color
    document.querySelectorAll('.key-color').forEach(key => {
        key.addEventListener('click', function () {
            const color = this.dataset.color;
            handleColorKeyPress(color);
        });
    });

    // Listener para tecla Esc (limpiar display)
    document.querySelector('.key-esc').addEventListener('click', function () {
        clearDisplay();
        awaitingColorSelection = false;
        pendingGlyphColor = null;
    });

    // Listener para tecla Alt (activar modo selección de color)
    document.querySelector('.key-alt').addEventListener('click', function () {
        awaitingColorSelection = true;
        pendingGlyphColor = null;
        this.classList.add('active');
        announceToScreenReader('Modo selección de color activado');
        console.log('Color selection mode activated');
    });

    // Listener para tecla Re(s)et (submit)
    document.querySelector('.key-enter').addEventListener('click', function () {
        handleResetSubmit();
    });

    // Listener para tecla Info (spacebar)
    document.querySelector('.key-spacebar').addEventListener('click', function () {
        renderInfoCard();
    });

    console.log('Keyboard listeners configured');
}

/* ==========================================================================
   HELPER FUNCTIONS - Visual Feedback & Accessibility
   ========================================================================== */

// Update display to show pending color indicator
function updateDisplayColorIndicator(color) {
    const displayElement = document.getElementById('glyphDisplay');
    if (!displayElement) return;

    // Remove all pending-color classes
    displayElement.className = 'glyph-display';

    // Add new pending color class
    if (color) {
        displayElement.classList.add('pending-color', `pending-color-${color}`);
    }
}

// Get color name in Spanish
function getColorName(color) {
    const colorNames = {
        'red': 'Rojo',
        'blue': 'Azul',
        'green': 'Verde',
        'yellow': 'Amarillo',
        'orange': 'Naranja'
    };
    return colorNames[color] || color;
}

// Announce message to screen reader
function announceToScreenReader(message) {
    let announcer = document.getElementById('sr-announcements');
    if (!announcer) {
        // Create announcer if it doesn't exist
        const div = document.createElement('div');
        div.id = 'sr-announcements';
        div.className = 'sr-only';
        div.setAttribute('aria-live', 'polite');
        div.setAttribute('aria-atomic', 'true');
        document.body.appendChild(div);
        announcer = div;
    }

    announcer.textContent = message;

    // Clear after announcement
    setTimeout(() => {
        announcer.textContent = '';
    }, 1000);
}

// Add ARIA labels to keyboard keys
function addAriaLabels() {
    // Glyph keys
    document.querySelectorAll('.key-glyph').forEach(key => {
        const number = key.dataset.number;
        key.setAttribute('aria-label', `Glyph ${number}`);
        key.setAttribute('role', 'button');
        key.setAttribute('tabindex', '0');
    });

    // Color keys
    const colorLabels = {
        'blue': 'Azul - Agua',
        'green': 'Verde - Alimento',
        'yellow': 'Amarillo - Cobijo',
        'red': 'Rojo - Energía',
        'orange': 'Naranja - Comunicación'
    };

    document.querySelectorAll('.key-color').forEach(key => {
        const color = key.dataset.color;
        key.setAttribute('aria-label', colorLabels[color] || color);
        key.setAttribute('role', 'button');
        key.setAttribute('tabindex', '0');
    });

    // Special keys
    const escKey = document.querySelector('.key-esc');
    if (escKey) {
        escKey.setAttribute('aria-label', 'Escape - Limpiar display');
        escKey.setAttribute('tabindex', '0');
    }

    const altKey = document.querySelector('.key-alt');
    if (altKey) {
        altKey.setAttribute('aria-label', 'Alt - Activar selección de color');
        altKey.setAttribute('aria-pressed', 'false');
        altKey.setAttribute('tabindex', '0');
    }

    const enterKey = document.querySelector('.key-enter');
    if (enterKey) {
        enterKey.setAttribute('aria-label', 'Re(s)et - Generar tácticas');
        enterKey.setAttribute('tabindex', '0');
    }

    const spaceKey = document.querySelector('.key-spacebar');
    if (spaceKey) {
        spaceKey.setAttribute('aria-label', 'Información - Mostrar ayuda');
        spaceKey.setAttribute('tabindex', '0');
    }

    console.log('ARIA labels added to all keys');
}

/* ==========================================================================
   PHYSICAL KEYBOARD SUPPORT
   ========================================================================== */

// Map physical keys to actions
function setupPhysicalKeyboardListeners() {
    let isKeyboardMode = false;

    // Detect keyboard usage
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            if (!isKeyboardMode) {
                document.body.classList.add('keyboard-mode');
                isKeyboardMode = true;
            }
        }
    });

    // Remove keyboard mode on mouse use
    document.addEventListener('mousedown', () => {
        if (isKeyboardMode) {
            document.body.classList.remove('keyboard-mode');
            isKeyboardMode = false;
        }
    });

    // Main keyboard event handler
    document.addEventListener('keydown', (e) => {
        // Don't interfere with browser shortcuts
        if (e.ctrlKey || e.metaKey) return;

        // Escape - Clear display
        if (e.key === 'Escape') {
            e.preventDefault();
            clearDisplay();
            const escKey = document.querySelector('.key-esc');
            if (escKey) {
                escKey.classList.add('pressed');
                setTimeout(() => escKey.classList.remove('pressed'), 150);
            }
            return;
        }

        // Enter - Submit sequence
        if (e.key === 'Enter') {
            e.preventDefault();
            handleResetSubmit();
            const enterKey = document.querySelector('.key-enter');
            if (enterKey) {
                enterKey.classList.add('pressed');
                setTimeout(() => enterKey.classList.remove('pressed'), 150);
            }
            return;
        }

        // Alt - Activate color selection mode
        if (e.key === 'Alt') {
            e.preventDefault();
            awaitingColorSelection = true;
            pendingGlyphColor = null;
            const altKey = document.querySelector('.key-alt');
            if (altKey) {
                altKey.classList.add('active');
                altKey.setAttribute('aria-pressed', 'true');
            }
            announceToScreenReader('Modo selección de color activado');
            console.log('Color selection mode activated (keyboard)');
            return;
        }

        // Space - Show info
        if (e.key === ' ') {
            e.preventDefault();
            renderInfoCard();
            const spaceKey = document.querySelector('.key-spacebar');
            if (spaceKey) {
                spaceKey.classList.add('pressed');
                setTimeout(() => spaceKey.classList.remove('pressed'), 150);
            }
            return;
        }

        // Color keys (B, G, Y, R, O)
        const colorKeyMap = {
            'b': 'blue',
            'g': 'green',
            'y': 'yellow',
            'r': 'red',
            'o': 'orange'
        };

        const key = e.key.toLowerCase();
        if (colorKeyMap[key]) {
            e.preventDefault();
            const color = colorKeyMap[key];
            handleColorKeyPress(color);

            // Visual feedback
            const colorKey = document.querySelector(`.key-color[data-color="${color}"]`);
            if (colorKey) {
                colorKey.classList.add('pressed');
                setTimeout(() => colorKey.classList.remove('pressed'), 150);
            }
            return;
        }

        // Number keys (0-9) for glyphs
        if (/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            const glyphNumber = e.key;
            selectGlyphByNumber(glyphNumber);
            return;
        }
    });

    // Handle Alt key release
    document.addEventListener('keyup', (e) => {
        if (e.key === 'Alt') {
            const altKey = document.querySelector('.key-alt');
            if (altKey && !pendingGlyphColor) {
                // Only deactivate if no color was selected
                altKey.classList.remove('active');
                altKey.setAttribute('aria-pressed', 'false');
            }
        }
    });

    console.log('Physical keyboard listeners configured');
}

// Select glyph by number (0-9)
function selectGlyphByNumber(number) {
    const glyphKey = document.querySelector(`.key-glyph[data-number="${number}"]`);

    if (glyphKey) {
        const glyphData = {
            id: glyphKey.dataset.id,
            number: glyphKey.dataset.number,
            image: glyphKey.dataset.glyph,
            color: glyphKey.dataset.color
        };

        addGlyphToSequence(glyphData);

        // Visual feedback
        glyphKey.classList.add('pressed');
        setTimeout(() => glyphKey.classList.remove('pressed'), 150);

        console.log('Glyph selected by keyboard:', number);
    } else {
        console.log('Glyph number not found:', number);
    }
}

// Enhanced addGlyphToSequence with announcements
const originalAddGlyph = addGlyphToSequence;
addGlyphToSequence = function (glyphData) {
    originalAddGlyph.call(this, glyphData);

    // Remove pending color indicator
    updateDisplayColorIndicator(null);

    // Remove Alt active state and deactivate color selection mode
    awaitingColorSelection = false;
    const altKey = document.querySelector('.key-alt');
    if (altKey) {
        altKey.classList.remove('active');
        altKey.setAttribute('aria-pressed', 'false');
    }

    // Remove pressed state from color keys
    document.querySelectorAll('.key-color').forEach(key => {
        key.classList.remove('selected');
    });

    // Announce to screen reader
    const colorPart = glyphData.displayColor ? ` con color ${getColorName(glyphData.displayColor)}` : '';
    announceToScreenReader(`Glyph ${glyphData.number}${colorPart} agregado. ${glyphSequence.length} de 3 glyphs en secuencia`);
};

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */

// Ejecutar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM loaded!');
    loadCardsData().then(() => {
        // Setup accessibility after keyboard is rendered
        addAriaLabels();
        setupPhysicalKeyboardListeners();
    });
});

// Mostrar tarjeta de instrucciones
function showInstructions() {
    const cardsGrid = document.getElementById('cardsGrid');

    const instructionsHTML = `
        <div class="reset-card card-instructions active">
            <div class="card-inner">
                <div class="card-front">
                    <div class="card-top-instructions">
                        <div class="instructions-circle"></div>
                    </div>
                    <div class="card-bottom-instructions">
                        <p>Haz clic en cualquiera de los colores para explorar cada Re(s)et.</p>
                    </div>
                </div>
                <div class="card-back">
                    <div class="card-back-content">
                        <h3>Re(s)etario</h3>
                        <p>Economías Recíprocas. Laboratorios de Co-Creación de Objetos Digitales Expandidos.</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    cardsGrid.innerHTML = instructionsHTML;

    // Agregar listener para voltear la tarjeta de instrucciones
    const instructionsCard = cardsGrid.querySelector('.reset-card');
    instructionsCard.addEventListener('click', function () {
        this.classList.toggle('flipped');
    });
}

// Crear todas las tarjetas de un color específico
function createCardsByColor(color) {
    const cardsGrid = document.getElementById('cardsGrid');

    // Filtrar tarjetas por color
    const cardsOfColor = cardsData.filter(card => card.color === color);

    if (cardsOfColor.length === 0) return;

    // Limpiar el grid
    cardsGrid.innerHTML = '';

    // Crear HTML para cada tarjeta
    cardsOfColor.forEach((card, index) => {
        const cardHTML = `
            <div class="reset-card card-${card.color} active">
                <div class="card-inner">
                    <div class="card-front">
                        <div class="card-top">
                            <img src="${card.glyph}" alt="APICCA Glyph ${card.id.toString().padStart(2, '0')}" class="card-glyph">
                        </div>
                        <div class="card-bottom">
                            <span class="card-number">${card.number}</span>
                        </div>
                    </div>
                    <div class="card-back">
                        <div class="card-back-content">
                            <h3>${card.title}</h3>
                            ${card.description.includes('loading') ? '<div class="loading-spinner"></div>' : `<p>${card.description}</p>`}
                        </div>
                    </div>
                </div>
            </div>
        `;
        cardsGrid.innerHTML += cardHTML;
    });

    // Agregar listeners para voltear todas las tarjetas
    const newCards = cardsGrid.querySelectorAll('.reset-card');
    newCards.forEach(card => {
        card.addEventListener('click', function () {
            this.classList.toggle('flipped');
        });
    });

    currentColor = color;
}

// Configurar listeners del grafo de colores
function setupEventListeners() {
    const colorNodes = document.querySelectorAll('.color-node');

    console.log('Color nodes found:', colorNodes.length);

    colorNodes.forEach((node, index) => {
        node.addEventListener('click', function (e) {
            e.preventDefault();
            const color = uniqueColors[index];
            console.log('Clicked color node:', color);

            // Remover clase active de todos los nodos
            colorNodes.forEach(n => n.classList.remove('active'));

            // Agregar clase active al nodo clickeado
            this.classList.add('active');

            // Crear todas las tarjetas del color seleccionado
            createCardsByColor(color);
        })
            ;
    });
}
