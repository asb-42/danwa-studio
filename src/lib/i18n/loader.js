// i18n Loader for Danwa Studio
// English is the SSOT (Single Source of Truth)
// ~50 UI translations are modules in danwa-modules (loaded dynamically via fetch)
// 14 Core languages are deprecated

let currentLocale = 'en';
let translations = { en: {} };
let listeners = [];

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
  'nav.dashboard': 'Dashboard',
  'nav.blueprints': 'Blueprints',
  'nav.workflow_templates': 'Workflow Templates',
  'nav.agents': 'Agents',
  'nav.prompts': 'Prompts',
  'nav.roles': 'Roles',
  'nav.tones': 'Tone Profiles',
  'nav.llm': 'LLM Profiles',
  'nav.modules': 'Modules',
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
  'common.noData': 'No data found.',
  'common.confirmDelete': 'Are you sure you want to delete this item?',
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
  // Sprint 7: LLM Catalog
  'nav.catalog': 'LLM Catalog',
  'catalog.title': 'LLM Catalog',
  'catalog.sources': 'Sources',
  'catalog.preview': 'Preview',
  'catalog.diff': 'Import diff',
  'catalog.stale': 'Stale',
  'catalog.fetch': 'Fetch',
  'catalog.fetchAll': 'Fetch all',
  'catalog.apply': 'Apply',
  'catalog.refresh': 'Refresh',
};

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

export const i18n = {
  init: async () => {
    // Get locale from localStorage or browser
    const saved = localStorage.getItem('locale');
    const browser = navigator.language.split('-')[0];
    currentLocale = saved || browser || 'en';
    await loadLocale(currentLocale);
    i18n.notify();
  },

  getLocale: () => currentLocale,

  setLocale: async (locale) => {
    currentLocale = locale;
    localStorage.setItem('locale', locale);
    await loadLocale(locale);
    i18n.notify();
  },

  t: (key, params = {}) => {
    const localeTranslations = translations[currentLocale] || translations.en || enFallback;
    let text = localeTranslations[key] || translations.en?.[key] || enFallback[key] || key;

    // Simple param interpolation
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
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
    listeners.forEach(cb => cb(currentLocale, translations[currentLocale]));
  },

  getTranslations: () => translations[currentLocale] || {},
};