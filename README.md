# Rol Semanal Litúrgico — Templo San Miguel Arcángel

Aplicación web para que los servidores litúrgicos se registren en el rol semanal de misas. Cualquier persona puede ofrecer su servicio sin necesidad de cuenta. Solo la acción de limpiar la tabla requiere un PIN de administrador.

## Requisitos

- Un **Droplet** de Digital Ocean (Ubuntu 22.04+ recomendado)
- Un **dominio** apuntando a la IP del droplet (opcional, funciona sin él)

## Estructura del proyecto

```
iglesia/
├── public/index.html          ← Frontend (HTML + CSS + JS)
├── server.js                  ← Backend (Node.js + Express + SQLite)
├── Dockerfile
├── docker-compose.yml         ← Desarrollo local
├── docker-compose.prod.yml    ← Producción (Linux + Caddy)
├── Caddyfile                  ← Reverse proxy con HTTPS automático
├── package.json
└── .gitignore
```

## Despliegue desde tu laptop al droplet

### 1. Preparar el droplet (solo la primera vez)

Conectarse por SSH e instalar Docker:

```bash
ssh root@TU_IP
```

```bash
# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Crear carpeta para la base de datos
mkdir -p /opt/iglesia/data

# Crear carpeta del proyecto
mkdir -p /app/iglesia
```

Salir del droplet:

```bash
exit
```

### 2. Subir el proyecto al droplet

Desde tu laptop, en la carpeta del proyecto:

```bash
rsync -avz --exclude node_modules --exclude '*.db' --exclude '*.db-wal' --exclude '*.db-journal' ./ root@TU_IP:/app/iglesia/
```

> Si no tienes `rsync`, puedes usar `scp`:
> ```bash
> scp -r $(ls -A | grep -v node_modules) root@TU_IP:/app/iglesia/
> ```

### 3. Construir y levantar la app

Conectarse al droplet y levantar:

```bash
ssh root@TU_IP "cd /app/iglesia && DOMAIN=tudominio.com ADMIN_PIN=tuclavesecreta docker compose -f docker-compose.prod.yml up -d --build"
```

Eso es todo. La app estará disponible en `https://tudominio.com`.

### Sin dominio (solo HTTP)

Si no tienes dominio, omite la variable `DOMAIN`:

```bash
ssh root@TU_IP "cd /app/iglesia && ADMIN_PIN=tuclavesecreta docker compose -f docker-compose.prod.yml up -d --build"
```

La app estará en `http://TU_IP`.

## Actualizar la app

Cada vez que hagas cambios, solo repite los pasos 2 y 3:

```bash
# Desde tu laptop, subir cambios
rsync -avz --exclude node_modules --exclude '*.db' --exclude '*.db-wal' --exclude '*.db-journal' ./ root@TU_IP:/app/iglesia/

# Reconstruir y reiniciar
ssh root@TU_IP "cd /app/iglesia && docker compose -f docker-compose.prod.yml up -d --build"
```

Los datos de la base de datos **no se pierden** al actualizar. Están guardados en `/opt/iglesia/data/` en el droplet.

## Variables de entorno

| Variable    | Descripción                     | Default              |
|-------------|---------------------------------|----------------------|
| `DOMAIN`    | Dominio para HTTPS automático   | `localhost`          |
| `ADMIN_PIN` | Clave para limpiar la tabla     | `otrasemanamiseñor`  |
| `PORT`      | Puerto interno de la app        | `3000`               |
| `DB_PATH`   | Ruta del archivo SQLite         | `/data/liturgia.db`  |

## Comandos útiles en el droplet

```bash
# Ver logs en tiempo real
ssh root@TU_IP "cd /app/iglesia && docker compose -f docker-compose.prod.yml logs -f"

# Reiniciar la app
ssh root@TU_IP "cd /app/iglesia && docker compose -f docker-compose.prod.yml restart"

# Detener la app
ssh root@TU_IP "cd /app/iglesia && docker compose -f docker-compose.prod.yml down"

# Ver estado de los contenedores
ssh root@TU_IP "cd /app/iglesia && docker compose -f docker-compose.prod.yml ps"
```

## Desarrollo local

### Sin Docker

```bash
npm install
npm start
```

### Con Docker

```bash
docker compose up -d --build
```

Abrir `http://localhost:3000`.

> **Nota:** El archivo `docker-compose.yml` está configurado para desarrollo local. Para producción en el servidor Linux, usa `docker-compose.prod.yml`:
> ```bash
> docker compose -f docker-compose.prod.yml up -d --build
> ```
