import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="card mx-auto mt-10 flex max-w-md flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="text-5xl">🔍</div>
      <h1 className="text-xl font-bold text-ink">Not found</h1>
      <p className="text-sm text-muted">
        This market doesn’t exist, or it was never created on-chain.
      </p>
      <Link href="/" className="btn btn-primary mt-2">
        Back to markets
      </Link>
    </div>
  );
}
