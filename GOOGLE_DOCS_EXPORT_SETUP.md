# Configuración y Permisos para Exportación a Google Docs (OAuth 2.0)

Este documento detalla la configuración, credenciales, flujo de autorización OAuth 2.0 y variables de entorno necesarias para habilitar la exportación de datos del curso de astrología Casa Siete directamente a **Google Docs** mediante una cuenta personal de Google.

---

## 1. Visión General del Proceso

La exportación genera un nuevo documento de Google Docs para el estudiante seleccionado utilizando la API oficial de Google Docs y Google Drive (`googleapis`).

**Importante:** La exportación utiliza **OAuth 2.0** con una cuenta personal de Google. No utiliza Cuentas de Servicio (Service Accounts), delegación a nivel de dominio ni funciones de Google Workspace. La cuenta personal autenticada vía OAuth 2.0 será la **propietaria directa** de los documentos creados en su Google Drive.

El backend serverless (`netlify/functions/export-gdoc.ts`) utiliza un **Refresh Token** de OAuth 2.0 para obtener automáticamente tokens de acceso válidos sin requerir intervención interactiva en cada exportación.

---

## 2. Configuración en Google Cloud Platform (GCP)

Siga estos pasos en la consola de Google Cloud ([https://console.cloud.google.com](https://console.cloud.google.com)):

### Paso 1: Crear o Seleccionar un Proyecto
1. Inicie sesión en Google Cloud Console.
2. Cree un nuevo proyecto o seleccione uno existente (ejemplo: `Casa-Siete-Export`).

### Paso 2: Habilitar las APIs Requeridas
En **APIs y Servicios > Biblioteca**:
1. Busque **Google Docs API** y haga clic en **Habilitar**.
2. Busque **Google Drive API** y haga clic en **Habilitar**.

### Paso 3: Configurar la Pantalla de Consentimiento de OAuth (OAuth Consent Screen)
1. Vaya a **APIs y Servicios > Pantalla de consentimiento de OAuth**.
2. Seleccione el tipo de usuario (**Externo** o **Interno** segun su tipo de cuenta).
3. Complete los datos básicos de la aplicación (Nombre: `Casa Siete Exportador`, Correo de soporte).
4. En **Permisos (Scopes)**, agregue los siguientes alcances necesarios:
   - `https://www.googleapis.com/auth/documents` (Crear y modificar documentos de Google Docs)
   - `https://www.googleapis.com/auth/drive` (Gestión de archivos y carpetas en Google Drive)
5. Si la aplicación está en estado "En prueba" (Testing), agregue su correo de Google en la sección **Usuarios de prueba (Test users)**.

### Paso 4: Crear Credenciales OAuth 2.0 (ID de Cliente Web)
1. Vaya a **APIs y Servicios > Credenciales**.
2. Haga clic en **Crear credenciales > ID de cliente de OAuth**.
3. En **Tipo de aplicación**, seleccione **Aplicación web**.
4. Nombre: `Casa Siete Web App`.
5. En **URIs de redireccionamiento autorizados**, agregue:
   - `http://localhost` (o la URL correspondiente de redirección).
6. Haga clic en **Crear** y guarde los valores generados:
   - **ID de cliente** (`GOOGLE_CLIENT_ID`)
   - **Secreto de cliente** (`GOOGLE_CLIENT_SECRET`)

---

## 3. Autorización Única de OAuth 2.0 (Obtener Refresh Token)

Para permitir que el backend serverless exporte documentos automáticamente en nombre de su cuenta de Google, ejecute por única vez el script de autorización incluido en el proyecto:

```bash
npm run get-oauth-token
```

### Flujo paso a paso del script:
1. Ingrese su `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.
2. Abra en su navegador el enlace web que genera el script.
3. Inicie sesión con la **cuenta personal de Google** que será propietaria de los documentos exportados.
4. Conceda los permisos solicitados.
5. Copie el valor del parámetro `code` de la URL final a la que lo redirige el navegador.
6. Pegue el código de autorización en la terminal.
7. El script generará su **`GOOGLE_REFRESH_TOKEN`**.

---

## 4. Variables de Entorno y Secretos Requeridos en Netlify

En el panel de Netlify (**Site settings > Environment variables** o archivo `.env` local), configure las siguientes variables:

| Variable | Descripción | Obligatorio | Ejemplo |
| :--- | :--- | :---: | :--- |
| `GOOGLE_CLIENT_ID` | ID de cliente OAuth 2.0 de GCP | Sí | `123456789-abc.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Secreto de cliente OAuth 2.0 | Sí | `GOCSPX-abc123xyz...` |
| `GOOGLE_REDIRECT_URI` | URI de redireccionamiento autorizado | No (Defecto: `http://localhost`) | `http://localhost` |
| `GOOGLE_REFRESH_TOKEN` | Token de actualización obtenido en el paso 3 | Sí | `1//04abc123def...` |
| `GOOGLE_DRIVE_FOLDER_ID` | ID de la carpeta destino en Google Drive | No | `1A2b3C4d5E6f7G8h9I0J` |

> **Seguridad:** Nunca exponga `GOOGLE_CLIENT_SECRET` ni `GOOGLE_REFRESH_TOKEN` en el código frontend cliente ni en repositorios públicos.

---

## 5. Arquitectura de Logs para Depuración y Verificación

La función serverless `netlify/functions/export-gdoc.ts` registra y retorna logs detallados en la respuesta JSON para facilitar el diagnóstico:

1. `[INFO] Initiating Google Doc export process for username: <username>`
2. `[INFO] Verifying Google OAuth 2.0 environment variables...`
3. `[INFO] OAuth Check -> GOOGLE_CLIENT_ID: Present`
4. `[INFO] OAuth Check -> GOOGLE_CLIENT_SECRET: Present`
5. `[INFO] OAuth Check -> GOOGLE_REFRESH_TOKEN: Present`
6. `[INFO] Authenticating with Google APIs via OAuth 2.0 user credentials...`
7. `[INFO] Refreshing OAuth 2.0 access token...`
8. `[SUCCESS] OAuth 2.0 access token obtained successfully.`
9. `[SUCCESS] Authenticated Google Account: usuario@gmail.com`
10. `[INFO] Creating Google Document with title: "<username>"...`
11. `[SUCCESS] Google Document created successfully with ID: <documentId>`
12. `[INFO] Constructing document content blocks and styles...`
13. `[INFO] Sending batchUpdate requests to Google Docs API...`
14. `[SUCCESS] Document text content and styles applied successfully.`
15. `[SUCCESS] Google Document export completed successfully! URL: https://docs.google.com/document/d/<documentId>/edit`

---

## 6. Formato del Documento Generado

El documento generado cumple estrictamente con el siguiente formato:

1. **Título del Documento:** Estilo `TITLE` con el nombre de usuario del estudiante (ej. `JuanPerez`).
2. **Perfil Astrológico:** Encabezado `HEADING_2`, seguido de las líneas de datos en texto plano sin viñetas.
3. **Módulos:** Título de módulo en estilo `HEADING_2`.
4. **Lectura:** Título en negrita y contenido en texto normal.
5. **Subtítulo:** Texto `"Preguntas y Respuestas"` en estilo `SUBTITLE`.
6. **Preguntas y Respuestas:** Texto de las preguntas en negrita en estilo texto normal (sin encabezado `HEADING`), con la respuesta en espacio simple en la línea siguiente.
7. **Sin Divisiones:** Sin líneas ni divisores horizontales entre módulos.

---

## 7. Solución de Problemas Comunes

| Error en Logs | Causa Probable | Solución |
| :--- | :--- | :--- |
| `One-time Google authorization has not been completed (missing GOOGLE_REFRESH_TOKEN)` | Falta la variable `GOOGLE_REFRESH_TOKEN` en el entorno. | Ejecute `npm run get-oauth-token` para obtener y configurar el refresh token. |
| `OAuth 2.0 authentication failed: invalid_grant` | El Refresh Token venció o fue revocado, o la pantalla OAuth está en Testing y expiró tras 7 días. | Vuelva a ejecutar `npm run get-oauth-token` o pase la app de Google Cloud a estado "In Production". |
| `Google Docs API document creation error` | La API de Google Docs no está habilitada en GCP o la cuenta no tiene permisos. | Habilite Google Docs API en GCP Console > APIs y Servicios. |
| `Could not move document to folder` | La carpeta `GOOGLE_DRIVE_FOLDER_ID` no existe o no pertenece/está compartida con la cuenta OAuth. | Verifique el ID de la carpeta en Google Drive y que la cuenta autorizada tenga acceso de edición a ella. |
| `The caller does not have permission` | Intentar usar una Service Account sin almacenamiento propio. | **Solución aplicada:** Migrar a autenticación OAuth 2.0 siguiendo esta guía. |
