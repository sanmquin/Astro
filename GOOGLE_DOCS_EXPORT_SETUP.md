# Configuración y Permisos para Exportación a Google Docs

Este documento detalla la configuración, los permisos, las funciones requeridas y los secretos necesarios para habilitar y depurar la función de exportación de datos del curso de astrología Casa Siete directamente a **Google Docs**.

---

## 1. Visión General del Proceso

La exportación genera un nuevo documento de Google Docs para el estudiante seleccionado mediante la API oficial de Google Docs y Google Drive (`googleapis`). El backend serverless (`netlify/functions/export-gdoc.ts`) autentica la solicitud con una **Cuenta de Servicio (Service Account)** de Google Cloud, crea el documento con el título igual al nombre de usuario del estudiante, aplica los estilos de formato solicitados y configura los permisos para compartir el enlace.

---

## 2. Configuración en Google Cloud Platform (GCP)

Para habilitar la integración con Google Docs, siga estos pasos en la consola de Google Cloud ([https://console.cloud.google.com](https://console.cloud.google.com)):

### Paso 1: Crear o Seleccionar un Proyecto
1. Acceda a Google Cloud Console.
2. Cree un nuevo proyecto o seleccione uno existente (ejemplo: `Casa-Siete-Export`).

### Paso 2: Habilitar las APIs Requeridas
En la sección **APIs y Servicios > Biblioteca**:
1. Busque **Google Docs API** y haga clic en **Habilitar**.
2. Busque **Google Drive API** y haga clic en **Habilitar**.

---

## 3. Roles, Permisos y Cuenta de Servicio

### Roles y Permisos IAM Requeridos
La cuenta de servicio necesita los siguientes permisos para crear y modificar documentos:

* **Rol IAM Recomendado:** `Editor` o `Creador de documentos / Editor de Drive` en el proyecto GCP.
* **Permisos específicos:**
  * `documents.create`
  * `documents.get`
  * `documents.update`
  * `drive.files.create`
  * `drive.permissions.create`

### Scopes de OAuth 2.0 Requeridos
El backend serverless solicita los siguientes alcances (scopes):
* `https://www.googleapis.com/auth/documents` (Lectura y escritura en Google Docs)
* `https://www.googleapis.com/auth/drive` (Creación y gestión de permisos en Google Drive)
* `https://www.googleapis.com/auth/drive.file` (Acceso a archivos creados por la aplicación)

### Crear la Cuenta de Servicio y Generar Claves
1. Vaya a **IAM y administración > Cuentas de servicio**.
2. Haga clic en **Crear cuenta de servicio**.
3. Asigne un nombre (ej. `exportador-casa-siete`).
4. Asigne el rol `Editor` (o permisos de Google Drive/Docs).
5. En la pestaña **Claves (Keys)**, haga clic en **Agregar clave > Crear clave nueva**.
6. Seleccione formato **JSON** y descargue el archivo.

---

## 4. Variables de Entorno y Secretos Requeridos

En el entorno de ejecución (Netlify / `.env`), debe configurar las siguientes variables de entorno utilizando los valores del archivo JSON descargado:

| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `GOOGLE_CLIENT_EMAIL` | Correo electrónico de la Cuenta de Servicio | `exportador-casa-siete@project.iam.gserviceaccount.com` |
| `GOOGLE_PRIVATE_KEY` | Clave privada RSA en formato PEM | `"-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBg...=\n-----END PRIVATE KEY-----\n"` |
| `GOOGLE_DRIVE_FOLDER_ID` | *(Opcional)* ID de la carpeta de Drive destino | `1A2b3C4d5E6f7G8h9I0J` |

> **Nota sobre `GOOGLE_PRIVATE_KEY`:** La clave privada contiene saltos de línea (`\n`). Asegúrese de incluir comillas o de que las secuencias `\n` sean procesadas correctamente por la función serverless mediante `.replace(/\\n/g, '\n')`.

---

## 5. Arquitectura de Logs para Depuración y Verificación

Para facilitar la configuración y depuración de errores de permisos o credenciales, se implementaron logs detallados tanto en la función de API como en la interfaz de usuario (UI).

### Server-Side Logs (`netlify/functions/export-gdoc.ts`)
La función API registra y retorna una lista cronológica de pasos en la propiedad `logs` de la respuesta JSON:

1. `[INFO] Inicio del proceso de exportación a Google Doc para usuario: <username>`
2. `[INFO] Verificando variables de entorno (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY)...`
3. `[INFO] Conectando a la base de datos MongoDB...`
4. `[INFO] Obteniendo perfil y respuestas del estudiante...`
5. `[INFO] Autenticando con Google APIs (JWT)...`
6. `[INFO] Creando documento en Google Docs con título: "<username>"`
7. `[SUCCESS] Documento creado con ID: <documentId>`
8. `[INFO] Generando bloques de contenido y reglas de formato...`
9. `[INFO] Aplicando estilos batchUpdate en Google Docs...`
10. `[SUCCESS] Formato aplicado correctamente.`
11. `[INFO] Configurando permisos de lectura pública mediante enlace...`
12. `[SUCCESS] Permisos actualizados. URL: https://docs.google.com/document/d/<documentId>/edit`

### Client-Side UI (`src/components/AdminInterface.tsx`)
En el Panel de Administración:
* Al hacer clic en **Exportar a Google Doc**, se abre una ventana modal de estado.
* La modal muestra los logs en tiempo real o el flujo completo de la API.
* Si el proceso es exitoso, proporciona un botón directo para abrir el documento en Google Docs.
* Si ocurre un error (por ejemplo, credenciales faltantes o falla de autenticación), la modal muestra la lista detallada de errores con instrucciones claras para solucionar la configuración.

---

## 6. Formato del Documento Generado

El documento generado cumple estrictamente con las siguientes reglas de formato:

1. **Título del Documento:** Formato `TITLE` con el nombre de usuario del estudiante (ej. `JuanPerez`).
2. **Perfil Astrológico:** Encabezado con formato `HEADING_2`, seguido de las líneas del perfil sin viñetas (*no bullet points*).
3. **Módulos:** Títulos de módulo en formato `HEADING_2`.
4. **Subtítulo:** Texto `"Preguntas y Respuestas"` con formato `SUBTITLE`.
5. **Preguntas y Respuestas:** Texto de las preguntas sin formato de encabezado (*no heading format*), en negrita (**bold**), con espacio simple hacia la respuesta en la línea siguiente.
6. **Sin Divisiones:** Sin líneas horizontales ni divisores entre módulos.

---

## 7. Solución de Problemas Comunes

| Error en Logs | Causa Probable | Solución |
| :--- | :--- | :--- |
| `Missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY` | Las variables de entorno no están configuradas en Netlify. | Añadir las variables en Netlify Dashboard > Site settings > Environment variables. |
| `invalid_grant` / `PEM routines:get_name:no start line` | Formato incorrecto en `GOOGLE_PRIVATE_KEY`. | Verificar que la clave conserve los encabezados `-----BEGIN PRIVATE KEY-----` y los `\n`. |
| `403 Forbidden` / `Google Docs API has not been used in project...` | La API de Google Docs o Google Drive no está habilitada. | Habilitar la API en GCP Console > APIs y Servicios > Biblioteca. |
| `404 Not Found` al abrir la URL | El enlace se generó pero los permisos de lectura fallaron. | Verificar que la API de Google Drive tenga permisos para ejecutar `drive.permissions.create`. |
