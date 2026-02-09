import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';


interface BatchAction {
  label: string;
  onClick: () => void;
  // Align with ButtonProps variants
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'gradient';
  disabled?: boolean;
}

interface BatchActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  actions: BatchAction[];
  className?: string;
}

export function BatchActionBar({
  selectedCount,
  onClearSelection,
  actions,
  className,
}: BatchActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className={cn("fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-in slide-in-from-bottom-5 fade-in duration-300", className)}>
      <Card className="flex items-center justify-between p-2 shadow-xl border-blue-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="flex items-center gap-4 pl-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-blue-600 tabular-nums">
              {selectedCount}
            </span>
            <span className="text-sm text-gray-600 font-medium">
              selected
            </span>
          </div>
          <div className="h-4 w-px bg-gray-200" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-gray-500 hover:text-gray-900 h-8 px-2 text-xs uppercase tracking-wide font-medium"
          >
            Clear
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'primary'}
              size="sm"
              onClick={action.onClick}
              disabled={action.disabled}
              className="h-8 shadow-sm transition-all active:scale-95"
            >
              {action.label}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}
