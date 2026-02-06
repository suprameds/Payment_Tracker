'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DispatchForm } from '@/components/forms/dispatch-form';
import { useState } from 'react';

export default function EntryPage() {
  const [successCount, setSuccessCount] = useState(0);

  const handleSuccess = () => {
    setSuccessCount(prev => prev + 1);
    // Show success message briefly
    setTimeout(() => {
      const successEl = document.getElementById('success-message');
      if (successEl) {
        successEl.classList.remove('hidden');
        setTimeout(() => successEl.classList.add('hidden'), 3000);
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">New Dispatch Entry</h1>
          <p className="mt-2 text-gray-600">
            Enter dispatch details quickly and easily. All fields marked with * are required.
          </p>
        </div>

        <div id="success-message" className="hidden mb-6 rounded-lg bg-green-50 border border-green-200 p-4">
          <p className="text-sm text-green-800 font-medium">
            ✓ Dispatch added successfully! {successCount > 1 && `(${successCount} total)`}
          </p>
        </div>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Dispatch Information</CardTitle>
            <CardDescription>
              Fill in the details for the new dispatch. The form will reset after successful submission.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DispatchForm onSuccess={handleSuccess} />
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Tip: Use Tab key to navigate between fields quickly</p>
        </div>
      </div>
    </div>
  );
}
