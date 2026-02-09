'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useKeyboard } from '@/hooks/use-keyboard';

export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);

  useKeyboard('?', () => setIsOpen(true), { shift: true });
  useKeyboard('/', () => setIsOpen(true), { meta: true }); // Cmd+/ or Ctrl+/ works too usually

  const shortcuts = [
    { key: 'Ctrl + K', description: 'Focus Dashboard Search (Quick Action)' },
    { key: 'Ctrl + F', description: 'Search List (Reconciliation, Manifest)' },
    { key: 'Ctrl + N', description: 'New Dispatch (Entry Page)' },
    { key: 'Ctrl + P', description: 'Generate PDF (Manifest)' },
    { key: 'Esc', description: 'Close Modals / Clear Search' },
    { key: '?', description: 'Show this Help Modal' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Boost your productivity with these shortcuts
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{shortcut.description}</span>
              <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
