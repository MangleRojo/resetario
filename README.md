# APICCA COMÚN

Sitio web para APICCA COMÚN - Arte, Pedagogía e Innovación Común.

## Descripción

APICCA COMÚN es una iniciativa abierta, colaborativa y transicional basada en el apoyo mutuo. Este sitio web presenta el Re(s)etario de Economías Recíprocas, una colección de glyphs y resets que pueden combinarse para crear nuevas formas de organización y colaboración.

## Estructura del Proyecto

```
APICCA/
├── public/                 # Archivos públicos del sitio
│   ├── css/               # Estilos CSS
│   ├── js/                # Scripts JavaScript
│   ├── img/               # Imágenes y assets
│   ├── data/              # Datos JSON (glyphs, cards)
│   ├── resetario/         # Páginas del resetario
│   └── *.html             # Páginas principales
├── firebase.json          # Configuración de Firebase Hosting
└── package.json           # Dependencias del proyecto
```

## Tecnologías

- HTML5
- CSS3
- JavaScript (ES6+)
- Firebase Hosting

## Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/tu-usuario/apicca.git
cd apicca
```

2. Instala las dependencias (si es necesario):
```bash
npm install
```

## Desarrollo Local

Para probar el sitio localmente, puedes usar cualquier servidor HTTP estático. Por ejemplo:

```bash
# Con Python 3
python3 -m http.server 8000

# Con Node.js (http-server)
npx http-server public -p 8000
```

Luego abre `http://localhost:8000` en tu navegador.

## Despliegue

Este sitio está configurado para desplegarse en Firebase Hosting.

### Requisitos

- Node.js instalado
- Cuenta de Firebase
- Firebase CLI instalado (`npm install -g firebase-tools`)

### Pasos para desplegar

1. Inicia sesión en Firebase:
```bash
firebase login
```

2. Inicializa el proyecto (si es la primera vez):
```bash
firebase init hosting
```

3. Despliega:
```bash
firebase deploy --only hosting
```

## Páginas

- **Inicio** (`/`): Página principal con la matriz visual
- **Re(s)etario** (`/resetario`): Colección interactiva de glyphs y resets
- **Documentación** (`/resetario/documentacion`): Documentación del proyecto
- **Contacto** (`/contacto`): Información de contacto

## Características

- Diseño responsivo
- Navegación jerárquica
- Matriz dinámica con animaciones
- Teclado interactivo estilo Teenage Engineering
- Sistema de combinaciones de glyphs
- Meta tags para compartir en redes sociales

## Licencia

[Especificar licencia si aplica]

## Contacto

- Email: correo@manglerojo.org
- Telegram: [https://t.me/APICCA](https://t.me/APICCA)

## Impulsado por

- [MangleRojo ORG](https://manglerojo.org)
- [LaBosquescuela UBA](https://labosquescuela.org)

## Agradecimientos

Gracias a la Beca para la Realización de Laboratorios de Co-Creación de Objetos Digitales Expandidos 2025:
- PDE
- Aquí Sí Pasa
- Bogotá

