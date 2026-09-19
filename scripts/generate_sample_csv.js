import fs from 'fs';
import path from 'path';

function loadJson(file) {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), 'utf8'));
}

const astroIntroduccion = loadJson('src/data/astro_introduccion.json');
const astroIdentidad = loadJson('src/data/astro_identidad.json');
const astroEmociones = loadJson('src/data/astro_emociones.json');
const astroVenus = loadJson('src/data/astro_venus.json');
const astroInfancia = loadJson('src/data/astro_infancia.json');
const astroDescendente = loadJson('src/data/astro_descendente.json');
const astroNodoLunar = loadJson('src/data/astro_nodo_lunar.json');
const astroCasaSolar = loadJson('src/data/astro_casa_solar.json');
const astroCasaKarma = loadJson('src/data/astro_casa_karma.json');
const astroValores = loadJson('src/data/astro_valores.json');

const SCRIPTS = {
  introduccion: astroIntroduccion,
  identidad: astroIdentidad,
  emociones: astroEmociones,
  venus: astroVenus,
  infancia: astroInfancia,
  descendente: astroDescendente,
  nodo_lunar: astroNodoLunar,
  casa_solar: astroCasaSolar,
  casa_karma: astroCasaKarma,
  valores: astroValores,
};

const SCRIPT_LABELS = {
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

function flattenSteps(script) {
  const steps = [];
  const addSteps = (s) => {
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

function escapeCsvField(value) {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

const profiles = [
  { username: 'Sofia_Astro', sunSign: 'Aries', moonSign: 'Leo', venusSign: 'Tauro', casaCuatroSign: 'Cáncer', descendenteSign: 'Libra', nodoLunarSign: 'Acuario', casaSolar: 'Casa I', casaKarma: 'Casa VIII' },
  { username: 'Mateo_R', sunSign: 'Géminis', moonSign: 'Cáncer', venusSign: 'Libra', casaCuatroSign: 'Virgo', descendenteSign: 'Sagitario', nodoLunarSign: 'Piscis', casaSolar: 'Casa III', casaKarma: 'Casa XII' },
  { username: 'Elena_V', sunSign: 'Virgo', moonSign: 'Escorpio', venusSign: 'Piscis', casaCuatroSign: 'Sagitario', descendenteSign: 'Piscis', nodoLunarSign: 'Virgo', casaSolar: 'Casa VI', casaKarma: 'Casa IV' },
  { username: 'Carlos_M', sunSign: 'Capricornio', moonSign: 'Sagitario', venusSign: 'Acuario', casaCuatroSign: 'Aries', descendenteSign: 'Cáncer', nodoLunarSign: 'Tauro', casaSolar: 'Casa X', casaKarma: 'Casa II' },
  { username: 'Lucia_B', sunSign: 'Tauro', moonSign: 'Aries', venusSign: 'Leo', casaCuatroSign: 'Leo', descendenteSign: 'Escorpio', nodoLunarSign: 'Escorpio', casaSolar: 'Casa II', casaKarma: 'Casa VI' },
];

const sampleAnswers = {
  introduccion: {
    '1': 'Explorar mi carta natal y entender mis patrones emocionales profundos',
    '2': 'Sí, el sonido se escucha fuerte y claro',
    '3': 'Comprendido, el micrófono está funcionando perfectamente',
  },
  identidad: {
    '[1] Intro': 'Siento una gran energía de liderazgo e iniciativa en mi vida cotidiana. A menudo me motiva empezar nuevos proyectos con entusiasmo y pasión.',
    '[2] Cualidades': 'Mis mejores cualidades son mi valentía ante los retos, mi sinceridad directa y la autenticidad con la que me expreso ante los demás.',
    '[3] Sombras': 'A veces me cuesta tener paciencia cuando las cosas no salen rápido o cuando los demás llevan un ritmo diferente al mío.',
    '[4] Integracion': 'Puedo integrar mi energía aprendiendo a pausar, escuchar a los demás antes de actuar y encausar mi impulso con estrategia consciente.',
  },
  emociones: {
    '[1] Intro': 'Siento mis emociones de forma muy intensa e intuitiva, a veces necesito tiempo a solas para procesar lo que siento internamente.',
    '[2] Necesidad': 'Mi necesidad de seguridad emocional radica en sentirme comprendida, protegida y rodeada de afecto sincero sin juzgamientos.',
    '[3] Reaccion': 'Ante situaciones de estrés o conflicto tiendo a replegarme en mi espacio personal hasta sentirme en calma para dialogar.',
    '[4] Nutricion': 'Me nutre profundamente compartir momentos tranquilos con personas queridas, estar en la naturaleza y expresar lo que siento con creatividad.',
  },
  venus: {
    '[1] Intro': 'En mis relaciones busco armonía, lealtad y una conexión estética y espiritual genuina donde ambos podamos crecer.',
    '[2] Deseo': 'Valoro la estabilidad afectiva, los pequeños detalles cotidianos y la belleza en la convivencia amorosa.',
    '[3] Atraccion': 'Me atraen las personas sinceras, apasionadas con sus proyectos, respetuosas de la libertad ajena y con sentido del humor.',
  },
  infancia: {
    '[1] Casa Cuatro': 'Mi hogar de la infancia era un espacio lleno de actividad y emociones diversas donde aprendí la importancia del cuidado mutuo.',
    '[2] Padre': 'De la figura paterna aprendí el valor del trabajo constante, la disciplina y el sentido de responsabilidad.',
    '[3] Madre': 'De la figura materna aprendí la empatía, el abrazo contenedor y la intuición para cuidar de los míos.',
  },
  descendente: {
    '[1] Proyeccion': 'En mis vínculos de pareja tiendo a buscar la serenidad y la diplomacia que a veces me cuesta encontrar sola.',
    '[2] Pareja': 'Busco un compañero o compañera reflexivo, con capacidad de escucha activa y compromiso a largo plazo.',
  },
  nodo_lunar: {
    '[1] Zona Confort': 'Mi zona de confort ha sido buscar la aprobación externa y evitar el conflicto a costa de mi propia voz.',
    '[2] Proposito': 'Mi propósito evolutivo es confiar en mi propia fortaleza individual y tomar decisiones audaces sin miedo al juicio.',
  },
  casa_solar: {
    '[1] Propósito Vital': 'Mi brillo personal se manifiesta cuando comparto mi conocimiento con los demás e inspiro transformaciones.',
    '[2] Desarrollo': 'Desarrollo mi propósito creando comunidad y ofreciendo orientación a quienes buscan claridad.',
  },
  casa_karma: {
    '[1] Aprendizaje': 'Mi gran aprendizaje kármico implica soltar el control excesivo y confiar en el flujo natural de las situaciones.',
    '[2] Liberacion': 'Siento liberación cuando me permito ser vulnerable y pido ayuda a mi entorno.',
  },
  valores: {
    '[1] Escala Valores': 'Mis valores fundamentales son la honestidad impecable, la libertad de pensamiento y la compasión hacia todo ser vivo.',
    '[2] Compromiso': 'Me comprometo a vivir alineada con estos principios en mis decisiones profesionales y relaciones personales.',
  }
};

const userCompletionProfile = {
  'Sofia_Astro': ['introduccion', 'identidad', 'emociones', 'venus', 'infancia', 'descendente', 'nodo_lunar', 'casa_solar', 'casa_karma', 'valores'],
  'Mateo_R': ['introduccion', 'identidad', 'emociones', 'venus', 'infancia', 'descendente'],
  'Elena_V': ['introduccion', 'identidad', 'emociones', 'venus'],
  'Carlos_M': ['introduccion', 'identidad'],
  'Lucia_B': ['introduccion'],
};

const headers = [
  'username', 'script_id', 'script_title', 'step_id', 'step_index', 'step_type',
  'prompt', 'requirement', 'transcript', 'is_answered', 'word_count', 'char_count',
  'module_total_steps', 'module_answered_steps', 'module_completed',
  'module_completion_pct', 'updated_at', 'sun_sign', 'moon_sign', 'venus_sign',
  'casa_cuatro_sign', 'descendente_sign', 'nodo_lunar_sign', 'casa_solar', 'casa_karma'
];

const rows = [headers.map(escapeCsvField).join(',')];

profiles.forEach(profile => {
  const completedModules = userCompletionProfile[profile.username] || [];

  MODULE_SEQUENCE.forEach(scriptId => {
    const script = SCRIPTS[scriptId];
    if (!script) return;

    const steps = flattenSteps(script);
    const isModuleAttempted = completedModules.includes(scriptId);
    const answersMap = isModuleAttempted ? (sampleAnswers[scriptId] || {}) : {};

    const totalSteps = steps.length;
    const answeredCount = isModuleAttempted ? steps.length : 0;
    const moduleCompleted = isModuleAttempted ? 1 : 0;
    const moduleCompletionPct = isModuleAttempted ? '100.00' : '0.00';
    const updatedAt = isModuleAttempted ? '2025-02-28T18:00:00.000Z' : '';

    steps.forEach((step, idx) => {
      const defaultAnswer = answersMap[step.id] || answersMap[idx + 1] || (isModuleAttempted ? `Respuesta detallada de ${profile.username} para la pregunta ${step.prompt}` : '');
      const transcript = defaultAnswer;
      const isAnswered = transcript.trim().length > 0 ? 1 : 0;
      const wordCount = isAnswered ? transcript.trim().split(/\s+/).length : 0;
      const charCount = transcript.length;

      const rowData = [
        profile.username, scriptId, SCRIPT_LABELS[scriptId] || scriptId,
        step.id, idx + 1, step.type || 'default', step.prompt, step.requirement || '',
        transcript, isAnswered, wordCount, charCount, totalSteps, answeredCount,
        moduleCompleted, moduleCompletionPct, updatedAt, profile.sunSign, profile.moonSign,
        profile.venusSign, profile.casaCuatroSign, profile.descendenteSign,
        profile.nodoLunarSign, profile.casaSolar, profile.casaKarma
      ];

      rows.push(rowData.map(escapeCsvField).join(','));
    });
  });
});

const outputDir = path.resolve(process.cwd(), 'notebooks');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(path.join(outputDir, 'course_data_export.csv'), rows.join('\n'), 'utf8');
console.log('Successfully generated notebooks/course_data_export.csv');
