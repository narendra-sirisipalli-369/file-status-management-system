"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="card" style={{ textAlign: 'center', borderTop: '4px solid var(--error)' }}>
        <h2 style={{ color: 'var(--error)', marginBottom: '1rem' }}>Something went wrong!</h2>
        <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
          An unexpected error occurred in the File Status Management System.
        </p>
        <button className="btn" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </div>
  );
}
