import type { UserProfile, ResponseRecord, Script, ScriptStep } from '../types';
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

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

export function generateSystemCsv(profiles: UserProfile[], responses: ResponseRecord[]): string {
  const headers = [
    'username',
    'script_id',
    'script_title',
    'step_id',
    'step_index',
    'step_type',
    'prompt',
    'requirement',
    'transcript',
    'is_answered',
    'word_count',
    'char_count',
    'module_total_steps',
    'module_answered_steps',
    'module_completed',
    'module_completion_pct',
    'updated_at',
    'sun_sign',
    'moon_sign',
    'venus_sign',
    'casa_cuatro_sign',
    'descendente_sign',
    'nodo_lunar_sign',
    'casa_solar',
    'casa_karma',
  ];

  const responseUsernames = Array.from(new Set(responses.map(r => r.userId)));

  const allUsernames = Array.from(
    new Set([...profiles.map(p => p.username), ...responseUsernames])
  );

  const rows: string[] = [];
  rows.push(headers.map(escapeCsvField).join(','));

  allUsernames.forEach(username => {
    const profile = profiles.find(p => p.username === username) || {
      username,
      sunSign: '',
      moonSign: '',
      venusSign: '',
    };

    MODULE_SEQUENCE.forEach(scriptId => {
      const script = SCRIPTS[scriptId];
      if (!script) return;

      const steps = flattenSteps(script);
      const userRecord = responses.find(r => r.userId === username && r.scriptId === scriptId);

      const totalSteps = steps.length;
      const answeredCount = steps.filter(step => {
        const ans = userRecord?.history.find(h => h.stepId === step.id);
        return ans && ans.transcript && ans.transcript.trim().length > 0;
      }).length;

      const moduleCompleted = (totalSteps > 0 && answeredCount >= totalSteps) ? 1 : 0;
      const moduleCompletionPct = totalSteps > 0 ? ((answeredCount / totalSteps) * 100).toFixed(2) : '0.00';
      const updatedAt = userRecord?.updatedAt ? new Date(userRecord.updatedAt).toISOString() : '';

      steps.forEach((step, idx) => {
        const answer = userRecord?.history.find(h => h.stepId === step.id);
        const transcript = answer?.transcript || '';
        const isAnswered = transcript.trim().length > 0 ? 1 : 0;
        const wordCount = isAnswered ? transcript.trim().split(/\s+/).length : 0;
        const charCount = transcript.length;

        const rowData = [
          profile.username,
          scriptId,
          SCRIPT_LABELS[scriptId] || scriptId,
          step.id,
          idx + 1,
          step.type || 'default',
          step.prompt,
          step.requirement || '',
          transcript,
          isAnswered,
          wordCount,
          charCount,
          totalSteps,
          answeredCount,
          moduleCompleted,
          moduleCompletionPct,
          updatedAt,
          profile.sunSign || '',
          profile.moonSign || '',
          profile.venusSign || '',
          profile.casaCuatroSign || '',
          profile.descendenteSign || '',
          profile.nodoLunarSign || '',
          profile.casaSolar || '',
          profile.casaKarma || '',
        ];

        rows.push(rowData.map(escapeCsvField).join(','));
      });
    });
  });

  return rows.join('\n');
}

export function downloadSystemCsv(profiles: UserProfile[], responses: ResponseRecord[]): void {
  const csvContent = generateSystemCsv(profiles, responses);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `casa_siete_course_data_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
