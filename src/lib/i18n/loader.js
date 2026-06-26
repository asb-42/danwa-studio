// i18n Loader for Danwa Studio
// English is the SSOT (Single Source of Truth)
// ~50 UI translations are modules in danwa-modules (loaded dynamically via fetch)

// ── Locale Configuration ────────────────────────────────────────────────────

export const SUPPORTED_LOCALES = ['en'];
export const DEFAULT_LOCALE = 'en';

/**
 * Display names for all known locales.
 * Starts with 'en' (the only bundled language). All other entries are
 * added dynamically at runtime by registerCustomLocale().
 */
export const LOCALE_NAMES = { en: 'English' };

export const RTL_LOCALES = new Set(['ar', 'he', 'fa']);

/** Runtime-registered custom locales. Populated by discoverLanguagePacks() on mount. */
export const customLocales = new Map();

/**
 * Register a custom locale discovered from the backend or a language-pack module.
 *
 * @param {{ locale: string, name: string, is_rtl: boolean }} info
 */
export function registerCustomLocale(info) {
  customLocales.set(info.locale, { name: info.name, isRtl: info.is_rtl });
  if (!LOCALE_NAMES[info.locale]) LOCALE_NAMES[info.locale] = info.name;
  if (info.is_rtl) RTL_LOCALES.add(info.locale);
}

/** Get the display name for any locale (bundled or custom). */
export function getLocaleName(code) {
  return customLocales.get(code)?.name || LOCALE_NAMES[code] || code;
}

/**
 * Get the combined list of all available locales (bundled + custom),
 * sorted alphabetically by display name with 'en' first.
 */
export function getAllLocales() {
  const bundled = SUPPORTED_LOCALES.filter(l => !customLocales.has(l));
  const custom = [...customLocales.keys()];
  return [...bundled, ...custom].sort((a, b) => {
    if (a === 'en') return -1;
    if (b === 'en') return 1;
    const nameA = (customLocales.get(a)?.name || LOCALE_NAMES[a] || a).toLowerCase();
    const nameB = (customLocales.get(b)?.name || LOCALE_NAMES[b] || b).toLowerCase();
    return nameA.localeCompare(nameB);
  });
}

// ── Internal State ──────────────────────────────────────────────────────────

let currentLocale = 'en';
let translations = { en: {} };
let listeners = [];
let _toastCallback = null;

/**
 * Set a callback for toast notifications (called by App.svelte on mount).
 */
export function setToastCallback(cb) {
  _toastCallback = cb;
}

// English SSOT - minimal fallback keys
const enFallback = {
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.create': 'Create',
  'common.search': 'Search',
  'common.filter': 'Filter',
  'common.refresh': 'Refresh',
  'common.settings': 'Settings',
  'common.profile': 'Profile',
  'common.logout': 'Logout',
  'common.login': 'Login',
  'common.noData': 'No data found.',
  'common.confirmDelete': 'Are you sure you want to delete this item?',
  'auth.login.failed': 'Login failed. Please check your credentials.',
  'auth.login.backendDown': 'Backend connection lost. Please start danwa-core first.',
  'nav.dashboard': 'Dashboard',
  'nav.blueprints': 'Blueprints',
  'nav.workflow_templates': 'Workflow Templates',
  'nav.agents': 'Agents',
  'nav.prompts': 'Prompts',
  'nav.roles': 'Roles',
  'nav.tones': 'Tone Profiles',
  'nav.llm': 'LLM Profiles',
  'nav.modules': 'Modules',
  'nav.input_composer': 'Input Composer',
  'nav.output_composer': 'Output Composer',
  'nav.exec': 'Workflow Exec',
  'nav.diff': 'Diff View',
  'nav.replay': 'Replay View',
  'nav.proposals': 'Proposals',
  'nav.translations': 'Translations',
  'nav.tenants': 'Tenants',
  'nav.users': 'Users',
  'nav.health': 'Server Health',
  'nav.system': 'System Management',
  'nav.profile': 'My Profile',
  'nav.my_keys': 'My API Keys',
  'nav.section.build': 'BUILD',
  'nav.section.configure': 'CONFIGURE',
  'nav.section.execute': 'EXECUTE',
  'nav.section.evolve': 'EVOLVE',
  'nav.section.administration': 'ADMINISTRATION',
  'nav.section.account': 'ACCOUNT',
  'nav.catalog': 'LLM Catalog',
  'config.name': 'Name',
  'config.category': 'Category',
  'config.description': 'Description',
  'config.actions': 'Actions',
  'config.instantiate': 'Instantiate',
  'config.provider': 'Provider',
  'config.model': 'Model',
  'config.profileType': 'Profile Type',
  'config.apiBase': 'API Base URL',
  'config.apiKeyEnv': 'API Key Env Var',
  'config.accountIdEnv': 'Account ID Env Var',
  'config.temperature': 'Temperature',
  'config.maxTokens': 'Max Tokens',
  'config.contextWindow': 'Context Window',
  'config.timeout': 'Timeout (s)',
  'config.protocol': 'Protocol',
  'config.a2aEndpoint': 'A2A Endpoint',
  'config.fallbackProfile': 'Fallback Profile',
  'config.role': 'Role',
  'config.variant': 'Variant',
  'config.prompt': 'Prompt',
  'config.template': 'Template',
  'config.translate': 'Translate',
  'config.translatePrompt': 'Translate Prompt',
  'config.translatePromptHint': 'Translate all roles of this prompt variant to the target language using LLM.',
  'llm_profiles.title': 'LLM Profiles',
  'llm_profiles.create': 'Create LLM Profile',
  'llm_profiles.edit': 'Edit LLM Profile',
  'llm_profiles.delete': 'Delete LLM Profile',
  'llm_profiles.confirmDelete': 'Are you sure you want to delete this LLM profile?',
  'agents.title': 'Agent Blueprints',
  'agents.create': 'Create Agent Blueprint',
  'agents.edit': 'Edit Agent Blueprint',
  'agents.delete': 'Delete Agent Blueprint',
  'agents.confirmDelete': 'Are you sure you want to delete this agent blueprint?',
  'prompts.title': 'Prompt Templates',
  'prompts.create': 'Create Prompt Template',
  'prompts.edit': 'Edit Prompt Template',
  'prompts.delete': 'Delete Prompt Template',
  'prompts.confirmDelete': 'Are you sure you want to delete this prompt template?',
  'prompts.role': 'Role',
  'prompts.variant': 'Variant',
  'prompts.content': 'Content',
  'catalog.title': 'LLM Catalog',
  'catalog.sources': 'Sources',
  'catalog.preview': 'Preview',
  'catalog.diff': 'Import diff',
  'catalog.stale': 'Stale',
  'catalog.fetch': 'Fetch',
  'catalog.fetchAll': 'Fetch all',
  'catalog.apply': 'Apply',
  'catalog.refresh': 'Refresh',

  // ── Debate ─────────────────────────────────────────────────────────
  'debate.title': 'Debate',
  'debate.newDebate': 'New Debate',
  'debate.caseLabel': 'Case Description',
  'debate.casePlaceholder': 'Describe the case to be debated...',
  'debate.maxRounds': 'Max rounds',
  'debate.consensusThreshold': 'Consensus Threshold',
  'debate.createButton': 'Create Debate',
  'debate.creating': 'Creating...',
  'debate.currentDebate': 'Current Debate',
  'debate.sseConnected': 'SSE Connected',
  'debate.id': 'ID:',
  'debate.status': 'Status:',
  'debate.round': 'Round',
  'debate.consensus': 'Consensus:',
  'debate.startButton': 'Start Debate',
  'debate.starting': 'Starting...',
  'debate.refreshStatus': 'Refresh Status',
  'debate.timelineTitle': 'Debate Timeline',
  'debate.timelinePlaceholder': 'Debate timeline — coming in Sprint 4',
  'debate.enterCase': 'Please enter a case description',
  'debate.backToOverview': 'Back to overview',
  'debate.archiveTitle': 'Debate (Archive)',
  'debate.noRounds': 'No rounds recorded for this debate.',
  'debate.date': 'Date',
  'debate.model': 'Model',
  'debate.duration': 'Duration',
  'debate.anomalies': 'Anomalies',
  'debate.roundInfo': 'Round {current} of {max}',
  'debate.roundOverMax': 'Round {current} (exceeded {max} — consensus not reached)',
  'debate.llmFailureWarning': 'LLM failures occurred — consensus could not be reached',
  'debate.degradedConsensus': 'This debate had LLM failures. The displayed consensus score may not be meaningful.',
  'debate.cancelButton': 'Cancel Debate',
  'debate.cancelling': 'Cancelling...',
  'debate.titleGenerating': 'Generating title...',
  'debate.titlePlaceholder': 'Processing case description...',
  'debate.titleLabel': 'Title',
  'debate.language': 'Language',
  'debate.enableExtraRounds': 'Allow additional rounds',
  'debate.extensionRequested': 'Extension requested',
  'debate.extensionRequest': 'The debate has not reached consensus after {rounds} rounds (current: {current}%, threshold: {threshold}%). Should additional rounds be debated?',
  'debate.extensionCurrentConsensus': 'Current consensus',
  'debate.extensionThreshold': 'Threshold',
  'debate.extensionGrant': 'Grant extension',
  'debate.extensionDeny': 'Deny extension',
  'debate.searchMode': 'Web Search',
  'debate.searchOff': 'Disabled',
  'debate.searchOptional': 'Optional',
  'debate.searchRequired': 'Required',
  'debate.searchModeHint.off': 'No web search during the debate.',
  'debate.searchModeHint.optional': 'Agents can request web search if needed.',
  'debate.searchModeHint.required': 'Agents automatically receive web research before each analysis.',
  'debate.continueButton': 'Continue',
  'debate.forkButton': 'Fork',
  'debate.forkedFrom': 'Fork of',
  'debate.forks': 'Forks',
  'debate.workflowTemplate': 'Workflow Template',
  'debate.workflowTemplateHint': 'Select a saved workflow to use custom agent configurations and execution flow instead of the default 4-agent debate.',
  'debate.useDefaultWorkflow': 'Use default debate (4 agents)',
  'debate.workflowNodes': 'Nodes',
  'debate.runWorkflow': 'Run Workflow',
  'debate.runningWorkflow': 'Running workflow...',
  'debate.count.one': '{count} debate',
  'debate.count.other': '{count} debates',

  // ── Timeline ───────────────────────────────────────────────────────
  'timeline.title': 'Debate Timeline',
  'timeline.live': 'Live',
  'timeline.roundOf': 'Round {current} of {max}',
  'timeline.roundsCompleted': '{count} round completed',
  'timeline.roundsCompleted_plural': '{count} rounds completed',
  'timeline.failedAfterRound': 'Failed after round {round}',
  'timeline.waiting': 'Waiting',
  'timeline.consensus': 'Consensus',
  'timeline.noOutputs': 'No debate contributions yet.',
  'timeline.round': 'Round {num}',
  'timeline.roundConsensus': 'Consensus {percent}%',
  'timeline.thinking': 'thinking...',
  'timeline.collapse': 'Collapse',
  'timeline.expand': 'Show full response ({count} chars)',
  'timeline.finalConsensus': 'Final Consensus',
  'timeline.degraded': '(degraded)',
  'timeline.strongConsensus': 'Strong consensus reached.',
  'timeline.moderateConsensus': 'Moderate consensus — further rounds may help.',
  'timeline.lowConsensus': 'Low consensus — agents remain divided.',
  'timeline.concludedAfter': 'The debate concluded after {rounds} round{plural} with a consensus score of {percent}%.',

  // ── Workflow execution ─────────────────────────────────────────────
  'workflow.execution.title': 'Execute',
  'workflow.execution.close': 'Close',
  'workflow.execution.start': 'Start',
  'workflow.execution.pause': 'Pause',
  'workflow.execution.resume': 'Resume',
  'workflow.execution.cancel': 'Cancel',
  'workflow.execution.round': 'Round',
  'workflow.execution.consensus': 'Consensus',
  'workflow.execution.elapsed': 'Elapsed',
  'workflow.execution.currentNode': 'Current Node',
  'workflow.execution.interjection': 'Interjection',
  'workflow.execution.interjectionPlaceholder': 'Type your interjection...',
  'workflow.execution.submit': 'Submit',
  'workflow.execution.nodeOutputs': 'Node Outputs',
  'workflow.execution.status.idle': 'Idle',
  'workflow.execution.status.running': 'Running',
  'workflow.execution.status.paused': 'Paused',
  'workflow.execution.status.completed': 'Completed',
  'workflow.execution.status.failed': 'Failed',
  'workflow.execution.status.cancelled': 'Cancelled',
  'workflow.execution.status.unknown': 'Unknown',
  'workflow.execution.toast.started': 'Workflow execution started',
  'workflow.execution.toast.completed': 'Workflow completed successfully',
  'workflow.execution.toast.failed': 'Workflow execution failed',
  'workflow.execution.toast.paused': 'Workflow paused',
  'workflow.execution.toast.resumed': 'Workflow resumed',
  'workflow.execution.viewState': 'View State',
  'workflow.execution.currentState': 'Current Workflow State',

  // ── Blueprint workflow ─────────────────────────────────────────────
  'blueprint.workflow.runDebate': 'Run Debate',
  'blueprint.workflow.runDebateHint': 'Configure and start a debate on a topic or case.',
  'blueprint.workflow.topic': 'Topic / Case',
  'blueprint.workflow.topicPlaceholder': 'Enter the debate topic or case description...',
  'blueprint.workflow.topicRequired': 'Please enter a topic or case description.',
  'blueprint.workflow.language': 'Language',
  'blueprint.workflow.maxRounds': 'Max Rounds',
  'blueprint.workflow.consensusThreshold': 'Consensus Threshold',
  'blueprint.workflow.startDebate': 'Start Debate',
  'blueprint.workflow.saveAsWorkflow': 'Save as Workflow',
  'blueprint.workflow.saveAsWorkflowHint': 'Convert this canvas layout into an executable workflow definition. The workflow can then be compiled and run as a debate.',
  'blueprint.inspector.cancel': 'Cancel',

  // ── Documents / RAG ────────────────────────────────────────────────
  'documents.ragContext': 'RAG Context',
  'documents.ragAutoRetrieve': 'Auto-retrieve relevant documents',
  'documents.includeDebateResults': 'Include debate results as context',
  'documents.includeDocumentAnalysis': 'Include document analysis',

  // ── MVP Debate ─────────────────────────────────────────────────────
  'mvpDebate.confirm.subtitle': 'Please review all parameters before starting the debate.',
  'mvpDebate.form.noDocumentsHint': 'No documents available. Upload documents to the DMS first to include them as RAG context in the debate.',
};

/**
 * Resolve a localized string from a locale dict.
 * Module manifests store name/description/author as `{ "en": "..." }` dicts.
 * This extracts the English value (or first available) for display.
 *
 * @param {string|Record<string,string>|null|undefined} obj - Locale dict or plain string
 * @param {string} [fallback=''] - Fallback if nothing resolved
 * @returns {string}
 */
export function resolveLocale(obj, fallback = '') {
  if (obj == null) return fallback;
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'object') {
    return obj.en || Object.values(obj)[0] || fallback;
  }
  return String(obj);
}

// Base URL for language modules - can be configured via Vite env
const MODULES_BASE_URL = import.meta.env.VITE_MODULES_BASE_URL || '/modules';

async function loadLocale(locale) {
  if (locale === 'en') {
    translations.en = { ...enFallback, ...translations.en };
    return translations.en;
  }

  // Try to load from danwa-modules via fetch
  try {
    const response = await fetch(`${MODULES_BASE_URL}/i18n-${locale}/ui_strings.json`);
    if (response.ok) {
      const module = await response.json();
      translations[locale] = { ...enFallback, ...module };
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (e) {
    console.warn(`Language module i18n-${locale} not found at ${MODULES_BASE_URL}, falling back to English`);
    translations[locale] = { ...enFallback };
  }

  return translations[locale];
}

/** Backend availability flag — set to false if first probe fails. */
let backendAvailable = true;

/**
 * Fetch translations from the backend API.
 * @returns {Promise<Object|null>} translations dict or null if unavailable
 */
async function fetchTranslationsFromBackend(lang) {
  if (!backendAvailable) return null;
  try {
    const res = await fetch(`/api/v1/i18n/${lang}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.translations || {};
  } catch {
    backendAvailable = false;
    return null;
  }
}

/**
 * Discover installed language-pack modules and register them as custom locales.
 * Called once at app startup.
 */
export async function discoverLanguagePacks() {
  try {
    const res = await fetch('/api/v1/modules/?category=translations');
    if (!res.ok) return;
    const modules = await res.json();
    for (const mod of modules) {
      if (mod.type !== 'language-pack' || mod.enabled !== true) continue;
      const locale = mod.language || mod.module_id.replace(/^lang-/, '').replace(/-[^-]+$/, '');
      if (!locale || SUPPORTED_LOCALES.includes(locale)) continue;
      if (customLocales.has(locale)) continue;
      const name = resolveLocale(mod.name) || locale;
      registerCustomLocale({ locale, name, is_rtl: RTL_LOCALES.has(locale) });
      console.log(`[i18n] Registered language pack: ${locale} (${name})`);
    }
  } catch (e) {
    console.warn('[i18n] Failed to discover language packs:', e);
  }
}

export const i18n = {
  init: async () => {
    const saved = localStorage.getItem('locale');
    const browser = navigator.language.split('-')[0];
    currentLocale = saved || browser || 'en';
    await loadLocale(currentLocale);
    i18n.updateHtmlAttrs();
    i18n.notify();
  },

  getLocale: () => currentLocale,

  /**
   * Switch to a new locale.
   * Supports bundled locales and dynamically registered custom locales.
   */
  setLocale: async (lang) => {
    const isBundled = SUPPORTED_LOCALES.includes(lang);
    const isCustom = customLocales.has(lang);

    if (!isBundled && !isCustom) {
      // Probe backend — check if the language pack exists
      const probe = await fetchTranslationsFromBackend(lang);
      if (!probe) {
        console.warn(`[i18n] Locale '${lang}' not available, falling back to English`);
        if (_toastCallback) {
          const msg = `UI language "${getLocaleName(lang)}" is not installed. Install the "${lang}" language pack from Modules → Language Packs, or switch to English.`;
          // Defer toast to avoid state_unsafe_mutation in derived contexts
          queueMicrotask(() => _toastCallback({ message: msg, type: 'warning', timeout: 10000 }));
        }
        lang = DEFAULT_LOCALE;
      }
    }

    const dict = await loadLocale(lang);
    currentLocale = lang;
    localStorage.setItem('locale', lang);
    i18n.updateHtmlAttrs();
    i18n.notify();
  },

  /** Update HTML lang and dir attributes. */
  updateHtmlAttrs: () => {
    document.documentElement.lang = currentLocale;
    document.documentElement.dir = RTL_LOCALES.has(currentLocale) ? 'rtl' : 'ltr';
    // Expose for E2E tests
    window.__locale = currentLocale;
  },

  t: (key, params = {}) => {
    const localeTranslations = translations[currentLocale] || translations.en || enFallback;
    let text = localeTranslations[key] || translations.en?.[key] || enFallback[key] || key;

    // Simple param interpolation
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });

    return text;
  },

  subscribe: (callback) => {
    listeners.push(callback);
    return () => {
      listeners = listeners.filter(cb => cb !== callback);
    };
  },

  notify: () => {
    listeners.forEach(cb => cb(i18n));
  },

  getTranslations: () => translations[currentLocale] || {},

  resolveLocale,

  /** Check if current locale is RTL. */
  isRTL: () => RTL_LOCALES.has(currentLocale),

  getAllLocales,
  getLocaleName,
  registerCustomLocale,
};