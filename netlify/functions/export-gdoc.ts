import { google, docs_v1 } from 'googleapis';
import { connectToDatabase } from './utils/mongodb';
import type { UserProfile, ResponseRecord, Script, ScriptStep } from '../../src/types';
import { getLectureForScript } from '../../src/data/lectures';
import astroIntroduccion from '../../src/data/astro_introduccion.json';
import astroIdentidad from '../../src/data/astro_identidad.json';
import astroEmociones from '../../src/data/astro_emociones.json';
import astroVenus from '../../src/data/astro_venus.json';
import astroInfancia from '../../src/data/astro_infancia.json';
import astroDescendente from '../../src/data/astro_descendente.json';
import astroNodoLunar from '../../src/data/astro_nodo_lunar.json';
import astroCasaSolar from '../../src/data/astro_casa_solar.json';
import astroCasaKarma from '../../src/data/astro_casa_karma.json';
import astroValores from '../../src/data/astro_valores.json';

const SCRIPTS: Record<string, Script> = {
  introduccion: astroIntroduccion as Script,
  identidad: astroIdentidad as Script,
  emociones: astroEmociones as Script,
  venus: astroVenus as Script,
  infancia: astroInfancia as Script,
  descendente: astroDescendente as Script,
  nodo_lunar: astroNodoLunar as Script,
  casa_solar: astroCasaSolar as Script,
  casa_karma: astroCasaKarma as Script,
  valores: astroValores as Script,
};

const SCRIPT_LABELS: Record<string, string> = {
  introduccion: 'Introducción',
  identidad: 'Identidad',
  emociones: 'Emociones',
  venus: 'Venus',
  infancia: 'Infancia',
  descendente: 'Descendente',
  nodo_lunar: 'Nodo Lunar',
  casa_solar: 'Casa Solar',
  casa_karma: 'Casa Karma',
  valores: 'Valores',
};

const MODULE_SEQUENCE = [
  'introduccion',
  'identidad',
  'emociones',
  'venus',
  'infancia',
  'descendente',
  'nodo_lunar',
  'casa_solar',
  'casa_karma',
  'valores',
];

function flattenSteps(script: Script): ScriptStep[] {
  const steps: ScriptStep[] = [];
  const addSteps = (s: ScriptStep[]) => {
    s.forEach(step => {
      steps.push(step);
      if (step.branches) {
        step.branches.forEach(branch => addSteps(branch.steps));
      }
    });
  };
  addSteps(script.steps);
  return steps;
}

interface Block {
  text: string;
  paragraphStyle?: 'TITLE' | 'HEADING_2' | 'SUBTITLE' | 'NORMAL_TEXT';
  bold?: boolean;
}

export const handler = async (event: { httpMethod: string; body?: string; queryStringParameters?: Record<string, string> | null }) => {
  const logs: string[] = [];
  const log = (msg: string) => {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${msg}`;
    console.log(entry);
    logs.push(entry);
  };

  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed', logs }),
    };
  }

  try {
    let username = '';
    if (event.httpMethod === 'POST' && event.body) {
      try {
        const parsed = JSON.parse(event.body);
        username = parsed.username || '';
      } catch {
        // Fallback
      }
    }
    if (!username && event.queryStringParameters?.username) {
      username = event.queryStringParameters.username;
    }

    if (!username) {
      log('[ERROR] Missing required parameter: username');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'username parameter is required', logs }),
      };
    }

    log(`[INFO] Initiating Google Doc export process for username: ${username}`);

    // Fetch user profile and responses from MongoDB
    log('[INFO] Connecting to MongoDB database...');
    const { db } = await connectToDatabase();

    log(`[INFO] Querying user profile for: ${username}`);
    const userProfile = await db.collection<UserProfile>('users').findOne({ username });
    if (!userProfile) {
      log(`[ERROR] User profile not found in database for username: ${username}`);
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: `User profile for '${username}' not found`, logs }),
      };
    }
    log(`[SUCCESS] User profile retrieved for ${username}`);

    log(`[INFO] Querying responses for user: ${username}`);
    const userResponses = await db.collection<ResponseRecord>('responses').find({ userId: username }).toArray();
    log(`[SUCCESS] Retrieved ${userResponses.length} module response records.`);

    // Verify Google OAuth 2.0 credentials
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost';

    log('[INFO] Verifying Google OAuth 2.0 environment variables...');
    log(`[INFO] OAuth Check -> GOOGLE_CLIENT_ID: ${clientId ? 'Present' : 'MISSING'}`);
    log(`[INFO] OAuth Check -> GOOGLE_CLIENT_SECRET: ${clientSecret ? 'Present' : 'MISSING'}`);
    log(`[INFO] OAuth Check -> GOOGLE_REFRESH_TOKEN: ${refreshToken ? 'Present' : 'MISSING'}`);
    log(`[INFO] OAuth Check -> GOOGLE_REDIRECT_URI: ${redirectUri}`);

    if (!clientId || !clientSecret || !refreshToken) {
      if (!refreshToken) {
        log('[ERROR] Google OAuth authorization incomplete: GOOGLE_REFRESH_TOKEN environment variable is missing.');
        log('[INFO] Run one-time OAuth authorization flow (e.g. `npm run get-oauth-token`) to obtain a refresh token.');
      } else {
        log('[ERROR] Required OAuth 2.0 client credentials (GOOGLE_CLIENT_ID and/or GOOGLE_CLIENT_SECRET) are missing.');
      }
      log('[INFO] Refer to GOOGLE_DOCS_EXPORT_SETUP.md for step-by-step setup instructions.');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: !refreshToken
            ? 'One-time Google authorization has not been completed (missing GOOGLE_REFRESH_TOKEN).'
            : 'Google OAuth credentials not configured in environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN).',
          logs,
        }),
      };
    }

    log('[INFO] Authenticating with Google APIs via OAuth 2.0 user credentials...');
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const docsApi = google.docs({ version: 'v1', auth: oauth2Client });
    const driveApi = google.drive({ version: 'v3', auth: oauth2Client });

    // Verify OAuth token refresh and retrieve Google Account Identity safely
    log('[INFO] Refreshing OAuth 2.0 access token...');
    try {
      const tokenRes = await oauth2Client.getAccessToken();
      if (!tokenRes.token) {
        throw new Error('No access token returned from Google OAuth token refresh.');
      }
      log('[SUCCESS] OAuth 2.0 access token obtained successfully.');
    } catch (authError) {
      const authErrMsg = authError instanceof Error ? authError.message : String(authError);
      log(`[ERROR] OAuth 2.0 authentication failure during token refresh: ${authErrMsg}`);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: `OAuth 2.0 authentication failed: ${authErrMsg}. Check that GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN are valid and not revoked.`,
          logs,
        }),
      };
    }

    // Safely log authenticated user account details if available
    try {
      const aboutRes = await driveApi.about.get({ fields: 'user(displayName, emailAddress)' });
      const user = aboutRes.data.user;
      if (user?.emailAddress) {
        log(`[SUCCESS] Authenticated Google Account: ${user.emailAddress}${user.displayName ? ` (${user.displayName})` : ''}`);
      }
    } catch {
      log('[INFO] Authenticated with OAuth 2.0 (Account identity details unavailable via Drive API).');
    }

    // I. Create a new document with title as user name
    log(`[INFO] Creating Google Document with title: "${userProfile.username}"...`);
    let createRes;
    try {
      createRes = await docsApi.documents.create({
        requestBody: {
          title: userProfile.username,
        },
      });
    } catch (docCreateErr) {
      const createErrMsg = docCreateErr instanceof Error ? docCreateErr.message : String(docCreateErr);
      log(`[ERROR] Google Docs API document creation failed (documents.create): ${createErrMsg}`);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: `Google Docs API document creation error: ${createErrMsg}`,
          logs,
        }),
      };
    }

    const documentId = createRes.data.documentId;
    if (!documentId) {
      log('[ERROR] Failed to obtain documentId from Google Docs API response.');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Failed to create Google Document', logs }),
      };
    }

    log(`[SUCCESS] Google Document created successfully with ID: ${documentId}`);

    // If folder ID specified, move file to folder
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (folderId) {
      try {
        log(`[INFO] Moving document ${documentId} to folder ${folderId}...`);
        await driveApi.files.update({
          fileId: documentId,
          addParents: folderId,
          fields: 'id, parents',
        });
        log(`[SUCCESS] Document moved to folder ${folderId}`);
      } catch (folderErr) {
        log(`[WARNING] Could not move document to folder ${folderId}: ${folderErr instanceof Error ? folderErr.message : String(folderErr)}`);
      }
    }

    // III. Build Document Content Blocks according to exact required format
    log('[INFO] Constructing document content blocks and styles...');
    const blocks: Block[] = [];

    // 1. Document Title with title format (User name as title)
    blocks.push({ text: `${userProfile.username}\n`, paragraphStyle: 'TITLE' });

    // 2. "Perfil Astrologico" no bullet points, and heading two
    blocks.push({ text: 'Perfil Astrológico\n', paragraphStyle: 'HEADING_2' });
    blocks.push({ text: `Signo Solar: ${userProfile.sunSign || 'N/A'}\n`, paragraphStyle: 'NORMAL_TEXT' });
    blocks.push({ text: `Signo Lunar: ${userProfile.moonSign || 'N/A'}\n`, paragraphStyle: 'NORMAL_TEXT' });
    blocks.push({ text: `Signo Venus: ${userProfile.venusSign || 'N/A'}\n`, paragraphStyle: 'NORMAL_TEXT' });
    if (userProfile.casaCuatroSign) {
      blocks.push({ text: `Casa Cuatro: ${userProfile.casaCuatroSign}\n`, paragraphStyle: 'NORMAL_TEXT' });
    }
    if (userProfile.descendenteSign) {
      blocks.push({ text: `Descendente: ${userProfile.descendenteSign}\n`, paragraphStyle: 'NORMAL_TEXT' });
    }
    if (userProfile.nodoLunarSign) {
      blocks.push({ text: `Nodo Lunar: ${userProfile.nodoLunarSign}\n`, paragraphStyle: 'NORMAL_TEXT' });
    }
    if (userProfile.casaSolar) {
      blocks.push({ text: `Casa Solar: ${userProfile.casaSolar}\n`, paragraphStyle: 'NORMAL_TEXT' });
    }
    if (userProfile.casaKarma) {
      blocks.push({ text: `Casa Karma: ${userProfile.casaKarma}\n`, paragraphStyle: 'NORMAL_TEXT' });
    }
    blocks.push({ text: '\n', paragraphStyle: 'NORMAL_TEXT' });

    // 3. Module titles with heading 2 format
    MODULE_SEQUENCE.forEach(scriptId => {
      const label = SCRIPT_LABELS[scriptId] || scriptId;
      const script = SCRIPTS[scriptId];
      if (!script) return;

      // Module Title with heading 2 format
      blocks.push({ text: `${label}\n`, paragraphStyle: 'HEADING_2' });

      // Lecture content if available
      const lectureResult = getLectureForScript(scriptId, userProfile);
      if (lectureResult) {
        if (Array.isArray(lectureResult)) {
          lectureResult.forEach(lec => {
            blocks.push({ text: `${lec.title}\n`, bold: true, paragraphStyle: 'NORMAL_TEXT' });
            blocks.push({ text: `${lec.content}\n\n`, paragraphStyle: 'NORMAL_TEXT' });
          });
        } else {
          blocks.push({ text: `${lectureResult.title}\n`, bold: true, paragraphStyle: 'NORMAL_TEXT' });
          blocks.push({ text: `${lectureResult.content}\n\n`, paragraphStyle: 'NORMAL_TEXT' });
        }
      }

      // 4. "Preguntas y Respuestas" with subtitle format
      blocks.push({ text: 'Preguntas y Respuestas\n', paragraphStyle: 'SUBTITLE' });

      // 5. Questions no heading format. Instead bold format. Single space to the answer.
      const steps = flattenSteps(script);
      const userRecord = userResponses.find(r => r.scriptId === scriptId);

      steps.forEach((step, idx) => {
        // Question bold normal text (no heading format)
        blocks.push({
          text: `${idx + 1}. ${step.prompt}\n`,
          paragraphStyle: 'NORMAL_TEXT',
          bold: true,
        });

        // Answer text single space below
        const answer = userRecord?.history.find(h => h.stepId === step.id);
        const transcriptText = answer?.transcript ? answer.transcript : 'Sin respuesta';
        blocks.push({
          text: `Respuesta: ${transcriptText}\n\n`,
          paragraphStyle: 'NORMAL_TEXT',
        });
      });

      // 6. No division (horizontal line) between modules.
    });

    // Build batchUpdate requests using exact index arithmetic (starting index = 1)
    log(`[INFO] Generated ${blocks.length} content blocks. Calculating Google Docs API request ranges...`);
    const requests: docs_v1.Schema$Request[] = [];
    let currentIndex = 1;

    for (const block of blocks) {
      const textLength = block.text.length;
      if (textLength === 0) continue;

      const startIndex = currentIndex;
      const endIndex = currentIndex + textLength;

      // 1) Insert text
      requests.push({
        insertText: {
          location: { index: startIndex },
          text: block.text,
        },
      });

      // 2) Apply paragraph style
      if (block.paragraphStyle) {
        requests.push({
          updateParagraphStyle: {
            range: { startIndex, endIndex },
            paragraphStyle: { namedStyleType: block.paragraphStyle },
            fields: 'namedStyleType',
          },
        });
      }

      // 3) Apply bold text style if requested
      if (block.bold) {
        requests.push({
          updateTextStyle: {
            range: { startIndex, endIndex: endIndex - 1 },
            textStyle: { bold: true },
            fields: 'bold',
          },
        });
      }

      currentIndex = endIndex;
    }

    log(`[INFO] Sending ${requests.length} batchUpdate requests to Google Docs API...`);
    await docsApi.documents.batchUpdate({
      documentId,
      requestBody: {
        requests,
      },
    });
    log('[SUCCESS] Document text content and styles applied successfully.');

    // Grant reader permission to anyone with link so the document can be viewed
    log('[INFO] Granting public view access to the Google Document...');
    try {
      await driveApi.permissions.create({
        fileId: documentId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
      log('[SUCCESS] Document sharing permissions set to anyone with link.');
    } catch (permErr) {
      log(`[WARNING] Could not set public view permissions: ${permErr instanceof Error ? permErr.message : String(permErr)}`);
    }

    const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;
    log(`[SUCCESS] Google Document export completed successfully! URL: ${documentUrl}`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        documentId,
        documentUrl,
        title: userProfile.username,
        logs,
      }),
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    log(`[ERROR] Unhandled exception in Google Docs export handler: ${errMessage}`);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: errMessage,
        logs,
      }),
    };
  }
};
