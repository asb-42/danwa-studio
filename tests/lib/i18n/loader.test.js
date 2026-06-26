/**
 * Tests for src/lib/i18n/loader.js — i18n loader with English fallback.
 *
 * The loader reads/writes `localStorage` and uses module-level state
 * (translations, currentLocale, listeners).  We stub localStorage at the
 * top of the file so the loader sees a stable, isolated store.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// localStorage stub — provide a stable in-memory store *before* importing
// the loader, because the loader's setLocale() writes to it immediately.
// ---------------------------------------------------------------------------

const _ls = new Map();
const _localStorage = {
  getItem: (k) => (_ls.has(k) ? _ls.get(k) : null),
  setItem: (k, v) => _ls.set(k, String(v)),
  removeItem: (k) => _ls.delete(k),
  clear: () => _ls.clear(),
  key: (i) => Array.from(_ls.keys())[i] ?? null,
  get length() {
    return _ls.size;
  },
};
globalThis.localStorage = _localStorage;

const { i18n } = await import('../../../src/lib/i18n/loader.js');

let fetchMock;

beforeEach(async () => {
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock;
  _ls.clear();
  // Reset to English (clears any locale switching from prior tests)
  await i18n.setLocale('en');
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// getLocale
// ---------------------------------------------------------------------------

describe('i18n.getLocale', () => {
  it('starts at en after setLocale("en")', () => {
    expect(i18n.getLocale()).toBe('en');
  });
});

// ---------------------------------------------------------------------------
// t() — English fallback
// ---------------------------------------------------------------------------

describe('i18n.t — English fallback', () => {
  it('returns the value for a known key', () => {
    expect(i18n.t('common.save')).toBe('Save');
    expect(i18n.t('nav.dashboard')).toBe('Dashboard');
  });

  it('returns the key itself when no translation is found', () => {
    expect(i18n.t('not.a.real.key')).toBe('not.a.real.key');
  });

  it('returns a string for a known LLM-profile key', () => {
    const txt = i18n.t('llm_profiles.title');
    expect(typeof txt).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// t() — interpolation
// ---------------------------------------------------------------------------

describe('i18n.t — interpolation', () => {
  it('replaces simple {name} placeholders', () => {
    const original = i18n.getTranslations();
    original['test.greet'] = 'Hello, {name}!';
    expect(i18n.t('test.greet', { name: 'Alice' })).toBe('Hello, Alice!');
  });

  it('replaces multiple placeholders', () => {
    const original = i18n.getTranslations();
    original['test.full'] = '{a} + {b} = {a}';
    expect(i18n.t('test.full', { a: '1', b: '2' })).toBe('1 + 2 = 1');
  });

  it('replaces repeated placeholders globally', () => {
    const original = i18n.getTranslations();
    original['test.repeat'] = '{x}-{x}';
    expect(i18n.t('test.repeat', { x: 'Y' })).toBe('Y-Y');
  });
});

// ---------------------------------------------------------------------------
// setLocale — switches translations
// ---------------------------------------------------------------------------

describe('i18n.setLocale', () => {
  it('switches to a registered custom locale and uses its translations', async () => {
    // Register fr as a custom locale so setLocale doesn't probe backend
    i18n.registerCustomLocale({ locale: 'fr', name: 'French', is_rtl: false });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 'common.save': 'Sauvegarder' }),
    });
    await i18n.setLocale('fr');
    expect(i18n.getLocale()).toBe('fr');
    expect(i18n.t('common.save')).toBe('Sauvegarder');
    // Keys not in fr fall back to en fallback
    expect(i18n.t('nav.dashboard')).toBe('Dashboard');
  });

  it('falls back to en on fetch error (e.g. 404) for unregistered locale', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await i18n.setLocale('xx');
    // Unregistered locale with failed probe falls back to en
    expect(i18n.getLocale()).toBe('en');
    expect(i18n.t('common.save')).toBe('Save');
    consoleSpy.mockRestore();
  });

  it('falls back to en when fetch throws', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await i18n.setLocale('zz');
    expect(i18n.t('common.save')).toBe('Save');
    consoleSpy.mockRestore();
  });

  it('en locale does NOT call fetch', async () => {
    await i18n.setLocale('en');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('persists the chosen locale to localStorage', async () => {
    // Register de so it doesn't get probed
    i18n.registerCustomLocale({ locale: 'de', name: 'German', is_rtl: false });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 'common.save': 'Speichern' }),
    });
    await i18n.setLocale('de');
    expect(_ls.get('locale')).toBe('de');
  });

  it('sets html lang and dir attributes on setLocale', async () => {
    i18n.registerCustomLocale({ locale: 'ar', name: 'Arabic', is_rtl: true });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 'common.save': 'حفظ' }),
    });
    await i18n.setLocale('ar');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    // Reset to en
    await i18n.setLocale('en');
    expect(document.documentElement.dir).toBe('ltr');
  });
});

// ---------------------------------------------------------------------------
// notify / subscribe
// ---------------------------------------------------------------------------

describe('i18n.subscribe / notify', () => {
  it('notifies subscribers when locale changes', async () => {
    const cb = vi.fn();
    const unsub = i18n.subscribe(cb);
    const before = cb.mock.calls.length;
    await i18n.setLocale('en');
    expect(cb.mock.calls.length).toBeGreaterThan(before);
    unsub();
  });

  it('unsubscribe stops further notifications', async () => {
    const cb = vi.fn();
    const unsub = i18n.subscribe(cb);
    const baseline = cb.mock.calls.length;
    unsub();
    await i18n.setLocale('en');
    expect(cb.mock.calls.length).toBe(baseline);
  });
});

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------

describe('i18n.init', () => {
  it('reads locale from localStorage when present', async () => {
    _ls.set('locale', 'de');
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await i18n.init();
    expect(i18n.getLocale()).toBe('de');
    consoleSpy.mockRestore();
  });

  it('falls back to navigator.language when no localStorage value', async () => {
    _ls.clear();
    Object.defineProperty(navigator, 'language', { value: 'es-ES', configurable: true });
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await i18n.init();
    expect(i18n.getLocale()).toBe('es');
    consoleSpy.mockRestore();
  });
});
