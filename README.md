# Revisión Casitas

Aplicación web para la gestión de revisiones de casitas.

## Estado del Proyecto

✅ Despliegue exitoso en Netlify
✅ Variables de entorno configuradas correctamente
✅ Funcionalidades principales operativas

## Características

- Gestión de revisiones de casitas
- Sistema de autenticación
- Gestión de usuarios
- Carga y visualización de evidencias
- Notas y comentarios
- Historial de ediciones

## Tecnologías

- Next.js 14
- Supabase
- Tailwind CSS
- TypeScript
- Netlify

## Configuración

El proyecto requiere las siguientes variables de entorno:

### Cliente (NEXT_PUBLIC_)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

### Servidor
- SUPABASE_URL
- SUPABASE_ANON_KEY

## Instalación

1. Clona el repositorio
2. Instala las dependencias:
```bash
npm install
```
3. Inicia el servidor de desarrollo:
```bash
npm run dev
```

## Uso

1. Abre el navegador en `http://localhost:3000`
2. Utiliza el formulario superior para agregar nuevas revisiones
3. La tabla mostrará automáticamente todas las revisiones agregadas

## Estructura de Datos

Cada revisión incluye los siguientes campos:
- Fecha de creación
- Casita
- Responsable de la revisión
- Estado de la caja fuerte
- Estado de puertas y ventanas
- Equipamiento (Chromecast, binoculares, etc.)
- Evidencias fotográficas
- Y más... 

## Última Actualización

- Actualización de configuración para optimizar el despliegue en Netlify
- Mejoras en la gestión de dependencias
- Optimización del rendimiento general 