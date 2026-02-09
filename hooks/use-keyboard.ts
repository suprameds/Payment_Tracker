import { useEffect } from 'react';

interface KeyboardShortcutOptions {
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  preventDefault?: boolean;
}

/**
 * Hook to register keyboard shortcuts
 * @param key - The key to listen for (e.g., 'n', 'f', 'Escape')
 * @param callback - Function to call when shortcut is triggered
 * @param options - Modifier keys and options
 */
export function useKeyboard(
  key: string,
  callback: () => void,
  options: KeyboardShortcutOptions = {}
) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Check if key matches
      if (!event.key || !key) {
        return;
      }
      
      if (event.key.toLowerCase() !== key.toLowerCase()) {
        return;
      }

      // Check modifier keys
      const ctrlOrMeta = options.ctrl || options.meta;
      if (ctrlOrMeta && !(event.ctrlKey || event.metaKey)) {
        return;
      }

      if (options.shift && !event.shiftKey) {
        return;
      }

      if (options.alt && !event.altKey) {
        return;
      }

      // Prevent default if requested
      if (options.preventDefault !== false) {
        event.preventDefault();
      }

      // Don't trigger if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape key even in inputs
        if (key.toLowerCase() !== 'escape') {
          return;
        }
      }

      callback();
    };

    window.addEventListener('keydown', handler);

    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [key, callback, options]);
}

/**
 * Hook to register multiple keyboard shortcuts at once
 */
export function useKeyboardShortcuts(shortcuts: Array<{
  key: string;
  callback: () => void;
  options?: KeyboardShortcutOptions;
}>) {
  shortcuts.forEach(({ key, callback, options }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKeyboard(key, callback, options);
  });
}
