'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card mx-auto mt-10 flex max-w-md flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="text-5xl">⚠️</div>
      <h1 className="text-xl font-bold text-ink">Something went wrong</h1>
      <p className="text-sm text-muted">An unexpected error occurred while loading this page.</p>
      <button onClick={reset} className="btn btn-primary mt-2">
        Try again
      </button>
    </div>
  );
}
