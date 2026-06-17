/**
 * Tests for src/stores.js — Svelte stores: page, user, notifications.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { page, user, notifications, addNotification } from '../src/stores.js';

beforeEach(() => {
  // Reset stores between tests
  page.set('/');
  user.set(null);
  notifications.set([]);
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// page
// ---------------------------------------------------------------------------

describe('page store', () => {
  it('defaults to "/"', () => {
    expect(get(page)).toBe('/');
  });

  it('updates with set()', () => {
    page.set('/blueprints');
    expect(get(page)).toBe('/blueprints');
  });

  it('supports arbitrary route strings', () => {
    page.set('/cases/123?tab=overview');
    expect(get(page)).toBe('/cases/123?tab=overview');
  });
});

// ---------------------------------------------------------------------------
// user
// ---------------------------------------------------------------------------

describe('user store', () => {
  it('defaults to null', () => {
    expect(get(user)).toBeNull();
  });

  it('can be set to a user object', () => {
    const u = { id: 'u-1', email: '[email protected]', role: 'admin' };
    user.set(u);
    expect(get(user)).toEqual(u);
  });

  it('can be cleared back to null', () => {
    user.set({ id: 'u-1' });
    user.set(null);
    expect(get(user)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// notifications
// ---------------------------------------------------------------------------

describe('notifications store', () => {
  it('starts empty', () => {
    expect(get(notifications)).toEqual([]);
  });

  it('addNotification appends a notification with a unique id', () => {
    addNotification('hello');
    addNotification('world');
    const list = get(notifications);
    expect(list).toHaveLength(2);
    expect(list[0].message).toBe('hello');
    expect(list[1].message).toBe('world');
    expect(list[0].id).not.toBe(list[1].id);
  });

  it('addNotification defaults type=info', () => {
    addNotification('x');
    expect(get(notifications)[0].type).toBe('info');
  });

  it('addNotification accepts a custom type', () => {
    addNotification('oops', 'error');
    expect(get(notifications)[0].type).toBe('error');
  });

  it('addNotification auto-removes after the given timeout', () => {
    vi.useFakeTimers();
    addNotification('temp', 'info', 1000);
    expect(get(notifications)).toHaveLength(1);
    vi.advanceTimersByTime(1100);
    expect(get(notifications)).toHaveLength(0);
  });

  it('addNotification(timeout=0) keeps the notification forever', () => {
    vi.useFakeTimers();
    addNotification('sticky', 'info', 0);
    expect(get(notifications)).toHaveLength(1);
    vi.advanceTimersByTime(10_000);
    expect(get(notifications)).toHaveLength(1);
  });

  it('addNotification(timeout<0) does not auto-remove', () => {
    vi.useFakeTimers();
    addNotification('sticky', 'info', -1);
    vi.advanceTimersByTime(10_000);
    expect(get(notifications)).toHaveLength(1);
  });

  it('only the matching notification is removed on timeout', () => {
    vi.useFakeTimers();
    addNotification('short', 'info', 500);
    addNotification('long', 'info', 5000);
    vi.advanceTimersByTime(1000);
    const list = get(notifications);
    expect(list).toHaveLength(1);
    expect(list[0].message).toBe('long');
  });
});
