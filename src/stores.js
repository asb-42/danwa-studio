import { writable } from 'svelte/store';

export const page = writable('/');

export const user = writable(null);

export const notifications = writable([]);

export function addNotification(message, type = 'info', timeout = 5000) {
  const id = Date.now() + Math.random();
  notifications.update(n => [...n, { id, message, type }]);
  if (timeout > 0) {
    setTimeout(() => {
      notifications.update(n => n.filter(item => item.id !== id));
    }, timeout);
  }
}