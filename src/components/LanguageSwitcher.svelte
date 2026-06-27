<script>
  import { onMount, onDestroy } from 'svelte';
  import {
    i18n,
    RTL_LOCALES,
    LOCALE_NAMES,
    customLocales,
    getAllLocales,
    getLocaleName,
    registerCustomLocale,
    discoverLanguagePacks,
  } from '../lib/i18n/loader.js';
  import { setLanguage } from '../lib/api/settings.js';
  import { userLanguage } from '../lib/stores.js';

  let open = $state(false);
  let persisting = $state(false);
  // Force reactivity over the non-reactive customLocales Map
  let localeRevision = $state(0);

  // ISO 639-1 → Flag emoji
  const FLAGS = {
    de: '🇩🇪', en: '🇬🇧', fr: '🇫🇷', es: '🇪🇸', it: '🇮🇹',
    pt: '🇧🇷', ru: '🇷🇺', zh: '🇨🇳', ja: '🇯🇵', ko: '🇰🇷',
    sv: '🇸🇪', el: '🇬🇷', ar: '🇸🇦', he: '🇮🇱',
    bg: '🇧🇬', bn: '🇧🇩', bo: '🇧🇴', br: '🇧🇷', cs: '🇨🇿',
    da: '🇩🇰', eo: '🇪🇺', et: '🇪🇪', fa: '🇮🇷', fi: '🇫🇮',
    ga: '🇮🇪', hi: '🇮🇳', hr: '🇭🇷', hu: '🇭🇺', hy: '🇦🇲',
    id: '🇮🇩', is: '🇮🇸', ka: '🇬🇪', ku: '🇰🇼', la: '🇻🇦',
    lt: '🇱🇹', lv: '🇱🇻', mi: '🇳🇿', mk: '🇲🇰', mr: '🇮🇳',
    ms: '🇲🇾', nb: '🇳🇴', nl: '🇳🇱', nn: '🇳🇴', pl: '🇵🇱',
    ro: '🇷🇴', sa: '🇮🇳', sk: '🇸🇰', sl: '🇸🇮', sq: '🇦🇱',
    sr: '🇷🇸', ta: '🇮🇳', te: '🇮🇳', th: '🇹🇭', tl: '🇵🇭',
    tr: '🇹🇷', ur: '🇵🇰', vi: '🇻🇳', yi: '🇩🇪',
  };

  let currentLocale = $derived(i18n.getLocale());
  let currentFlag = $derived(FLAGS[currentLocale] || '🌐');
  let allLocales = $derived.by(() => {
    void localeRevision;
    return getAllLocales();
  });

  onMount(async () => {
    // Discover installed language packs and register them
    await discoverLanguagePacks();
    localeRevision += 1;

    // Probe backend for additional locales
    try {
      const res = await fetch('/api/v1/i18n/locales');
      if (res.ok) {
        const data = await res.json();
        let registered = false;
        for (const info of data.locales || []) {
          if (!info || !info.code) continue;
          if (LOCALE_NAMES[info.code] && !customLocales.has(info.code)) continue;
          registerCustomLocale({
            locale: info.code,
            name: info.name,
            is_rtl: !!info.is_rtl,
          });
          registered = true;
        }
        if (registered) localeRevision += 1;
      }
    } catch { /* Backend unreachable — fall back to discoverLanguagePacks() result */ }

    document.addEventListener('click', handleDocClick);
    document.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleDocClick);
    document.removeEventListener('keydown', handleKeydown);
  });

  function handleDocClick(e) {
    if (!e.target.closest('[data-language-switcher]')) {
      open = false;
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') open = false;
  }

  async function switchLanguage(lang) {
    await i18n.setLocale(lang);
    userLanguage.set(lang);
    persisting = true;
    try { await setLanguage(lang); } catch {}
    finally { persisting = false; }
    open = false;
  }
</script>

<div data-language-switcher class="relative inline-block text-left">
  <button
    onclick={() => open = !open}
    class="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg
           bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600
           border border-gray-300 dark:border-gray-600
           transition-colors"
    aria-label="Change language"
    aria-expanded={open}
  >
    <span class="text-lg leading-none">{currentFlag}</span>
    <span class="hidden sm:inline">{currentLocale.toUpperCase()}</span>
    <svg class="w-3 h-3 ml-1 transition-transform {open ? 'rotate-180' : ''}"
         xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
         stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
    </svg>
    {#if persisting}
      <span class="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin ml-1"></span>
    {/if}
  </button>

  {#if open}
    <div class="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg
                border border-gray-200 dark:border-gray-700 z-50
                ring-1 ring-black ring-opacity-5
                max-h-80 overflow-y-auto">
      <div class="py-1" role="menu">
        {#each allLocales as lang (lang)}
          {@const isRTL = RTL_LOCALES.has(lang)}
          {@const dir = isRTL ? 'rtl' : 'ltr'}
          {@const name = getLocaleName(lang)}
          {@const isCustom = customLocales.has(lang)}
          <button
            onclick={() => switchLanguage(lang)}
            class="w-full text-left px-4 py-2 text-sm flex items-center gap-2
                   hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors
                   {currentLocale === lang
                     ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                     : 'text-gray-700 dark:text-gray-300'}"
          >
            <span class="text-lg leading-none">{FLAGS[lang] || '🌐'}</span>
            <span dir={dir}>{name}</span>
            {#if isCustom}
              <span class="ml-auto text-xs text-gray-400 dark:text-gray-500">installed</span>
            {/if}
            {#if isRTL && !isCustom}
              <span class="ml-auto text-xs text-gray-400 dark:text-gray-500" dir="ltr">RTL</span>
            {/if}
            {#if lang === currentLocale}
              <svg class="ml-auto w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
