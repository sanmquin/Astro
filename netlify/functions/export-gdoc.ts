import { google } from 'googleapis';
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
        body: JSON.stringify({ success: false, error: `User profile for '${username}' not found`, logs }),
      };
    }
    log(`[SUCCESS] User profile retrieved for ${username}`);

    log(`[INFO] Querying responses for user: ${username}`);
    const userResponses = await db.collection<ResponseRecord>('responses').find({ userId: username }).toArray();
    log(`[SUCCESS] Retrieved ${userResponses.length} module response records.`);

    // Verify Google API credentials
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
      log('[ERROR] Google Credentials missing in server environment variables.');
      log('[ERROR] Please ensure GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY are set.');
      log('[INFO] Refer to GOOGLE_DOCS_EXPORT_SETUP.md for step-by-step setup instructions.');
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Google API credentials not configured in environment variables (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY).',
          logs,
        }),
      };
    }

    log('[INFO] Authenticating with Google APIs (JWT auth)...');
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: formattedPrivateKey,
      scopes: [
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file',
      ],
    });

    const docsApi = google.docs({ version: 'v1', auth });
    const driveApi = google.drive({ version: 'v3', auth });

    // I. Create a new document with title as user name
    log(`[INFO] Creating Google Document with title: "${userProfile.username}"...`);
    const createRes = await docsApi.documents.create({
      requestBody: {
        title: userProfile.username,
      },
    });

    const documentId = createRes.data.documentId;
    if (!documentId) {
      log('[ERROR] Failed to obtain documentId from Google Docs API response.');
      return {
        statusCode: 500,
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
    const requests: any[] = [];
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
