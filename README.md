# AR Viewer — Copper Giant

Visor de Realidad Aumentada para presentaciones de Copper Giant Resources.
Herramienta del Hub **The Giant Forge**.

## Stack

- HTML5 + CSS3 + JavaScript (ES Modules)
- Three.js 0.160 para geometría 3D procedural
- `<model-viewer>` 4.0 de Google para 3D y AR nativo
- nginx 1.27 Alpine como servidor estático

## AR

| Plataforma | Tecnología |
|---|---|
| iOS / Safari | AR Quick Look (USDZ) |
| Android / Chrome | Scene Viewer + WebXR |
| Sin descarga | Todo desde el navegador |

## Deployment — EasyPanel

1. Crear nueva aplicación en EasyPanel → **App**
2. Source: **GitHub** (conectar este repo) o **Docker Image**
3. Dockerfile: `./Dockerfile`  
4. Port: `80`
5. Domain: asignar dominio y activar **HTTPS** (obligatorio para AR / WebXR)
6. Health check: `GET /health`

## Reemplazar el modelo placeholder

Cuando tengas el `.glb` real de la mina:

```html
<!-- index.html, línea del primary-viewer -->
src="./models/mina-copper-giant.glb"
```

Colocar el archivo en `models/mina-copper-giant.glb`.

## Desarrollo local

```bash
# Con npx (sin instalar nada)
npx serve .

# O con Python
python -m http.server 3000
```
