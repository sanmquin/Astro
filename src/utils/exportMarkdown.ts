import type { UserProfile, ResponseRecord, Script, ScriptStep } from '../types';
import { getLectureForScript } from '../data/lectures';
import astroIntroduccion from '../data/astro_introduccion.json';
import astroIdentidad from '../data/astro_identidad.json';
import astroEmociones from '../data/astro_emociones.json';
import astroVenus from '../data/astro_venus.json';
import astroInfancia from '../data/astro_infancia.json';
import astroDescendente from '../data/astro_descendente.json';
import astroNodoLunar from '../data/astro_nodo_lunar.json';
import astroCasaSolar from '../data/astro_casa_solar.json';
import astroCasaKarma from '../data/astro_casa_karma.json';
import astroValores from '../data/astro_valores.json';

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

export function generateStudentMarkdown(profile: UserProfile, responses: ResponseRecord[]): string {
  const lines: string[] = [];

  lines.push(`# Curso Casa Siete: ${profile.username}`);
  lines.push('');
  lines.push('## Perfil Astrológico');
  lines.push(`- **Signo Solar:** ${profile.sunSign || 'N/A'}`);
  lines.push(`- **Signo Lunar:** ${profile.moonSign || 'N/A'}`);
  lines.push(`- **Signo Venus:** ${profile.venusSign || 'N/A'}`);
  if (profile.casaCuatroSign) lines.push(`- **Casa Cuatro:** ${profile.casaCuatroSign}`);
  if (profile.descendenteSign) lines.push(`- **Descendente:** ${profile.descendenteSign}`);
  if (profile.nodoLunarSign) lines.push(`- **Nodo Lunar:** ${profile.nodoLunarSign}`);
  if (profile.casaSolar) lines.push(`- **Casa Solar:** ${profile.casaSolar}`);
  if (profile.casaKarma) lines.push(`- **Casa Karma:** ${profile.casaKarma}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  MODULE_SEQUENCE.forEach(scriptId => {
    const label = SCRIPT_LABELS[scriptId] || scriptId;
    const script = SCRIPTS[scriptId];
    if (!script) return;

    lines.push(`# Módulo: ${label}`);
    lines.push('');

    // Lecture content based on user's astrological profile
    const lectureResult = getLectureForScript(scriptId, profile);
    if (lectureResult) {
      if (Array.isArray(lectureResult)) {
        lectureResult.forEach(lec => {
          lines.push(`## Lectura: ${lec.title}`);
          lines.push('');
          lines.push(lec.content);
          lines.push('');
        });
      } else {
        lines.push(`## Lectura: ${lectureResult.title}`);
        lines.push('');
        lines.push(lectureResult.content);
        lines.push('');
      }
    }

    // Questions and Answers
    lines.push('## Preguntas y Respuestas');
    lines.push('');

    const steps = flattenSteps(script);
    const userRecord = responses.find(r => r.userId === profile.username && r.scriptId === scriptId);

    steps.forEach((step, idx) => {
      lines.push(`### ${idx + 1}. ${step.prompt}`);
      lines.push('');
      const answer = userRecord?.history.find(h => h.stepId === step.id);
      if (answer && answer.transcript) {
        lines.push(`**Respuesta:** ${answer.transcript}`);
      } else {
        lines.push('**Respuesta:** *Sin respuesta*');
      }
      lines.push('');
    });

    lines.push('---');
    lines.push('');
  });

  return lines.join('\n');
}

export function downloadStudentMarkdown(profile: UserProfile, responses: ResponseRecord[]): void {
  const content = generateStudentMarkdown(profile, responses);
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${profile.username}_curso_astrologia.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
