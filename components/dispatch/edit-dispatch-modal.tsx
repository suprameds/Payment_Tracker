'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DispatchForm } from '@/components/forms/dispatch-form';
import { Dispatch } from '@/lib/types/database';

interface EditDispatchModalProps {
  dispatch: Dispatch | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditDispatchModal({ dispatch, isOpen, onClose, onSuccess }: EditDispatchModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Dispatch</DialogTitle>
          <DialogDescription>
            Update the details for dispatch {dispatch?.tracking_id}.
          </DialogDescription>
        </DialogHeader>
        
        {dispatch && (
          <DispatchForm
            initialData={dispatch}
            onSuccess={() => {
              onSuccess();
              onClose();
            }}
            onCancel={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
