'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category, Market } from '@predictx/shared';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { useToast } from '@/components/shared/Toast';

export function EditMarketForm({ market, adminAddress }: { market: Market; adminAddress: string }) {
  const router = useRouter();
  const { push } = useToast();

  // Trading started -> criteria/labels are locked (integrity). Question is never editable.
  const locked = market.volume > 0;

  const [categories, setCategories] = useState<Category[]>([]);
  const [description, setDescription] = useState(market.description);
  const [categoryId, setCategoryId] = useState(market.category.id);
  const [imageUrl, setImageUrl] = useState<string | null>(market.imageUrl);
  const [yesLabel, setYesLabel] = useState(market.yesLabel);
  const [noLabel, setNoLabel] = useState(market.noLabel);
  const [yesImageUrl, setYesImageUrl] = useState<string | null>(market.yesImageUrl ?? null);
  const [noImageUrl, setNoImageUrl] = useState<string | null>(market.noImageUrl ?? null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/admin/categories');
      if (res.ok) setCategories(((await res.json()) as { categories: Category[] }).categories);
    })();
  }, []);

  const selected = categories.find((c) => c.id === categoryId);

  async function save() {
    if (!locked && (description.trim().length < 20 || description.trim().length > 1000)) {
      push('error', 'Description must be 20–1000 characters');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/markets/${market.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-wallet-address': adminAddress },
        body: JSON.stringify({
          description: description.trim(),
          categoryId,
          imageUrl,
          yesLabel: yesLabel.trim() || 'YES',
          noLabel: noLabel.trim() || 'NO',
          yesImageUrl,
          noImageUrl,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed to save');
      }
      push('success', 'Market updated');
      router.push(`/market/${market.id}`);
      router.refresh();
    } catch (err) {
      push('error', (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      {locked && (
        <p className="rounded-lg badge-expired px-3 py-2 text-xs">
          🔒 Trading has started — the description and labels are locked to protect traders. You can
          still update the category and images.
        </p>
      )}

      <div className="card space-y-3 p-4">
        <Field label="Question (locked — committed on-chain at creation)">
          <div className="input cursor-not-allowed text-muted opacity-80">{market.question}</div>
        </Field>
        <Field label={`Description (${description.length}/1000)`}>
          <textarea
            className="input min-h-24 disabled:cursor-not-allowed disabled:opacity-60"
            value={description}
            maxLength={1000}
            disabled={locked}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <Field label="Category">
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="card space-y-3 p-4">
        <Field label="Market image">
          <ImageUpload
            value={imageUrl}
            fallback={selected?.icon ?? '🎲'}
            adminAddress={adminAddress}
            onChange={setImageUrl}
            onError={(m) => push('error', m)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="YES label">
            <input
              className="input disabled:cursor-not-allowed disabled:opacity-60"
              value={yesLabel}
              maxLength={20}
              disabled={locked}
              onChange={(e) => setYesLabel(e.target.value)}
            />
          </Field>
          <Field label="NO label">
            <input
              className="input disabled:cursor-not-allowed disabled:opacity-60"
              value={noLabel}
              maxLength={20}
              disabled={locked}
              onChange={(e) => setNoLabel(e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="YES image">
            <ImageUpload
              value={yesImageUrl}
              fallback={yesLabel.trim()[0]?.toUpperCase() ?? '✓'}
              adminAddress={adminAddress}
              onChange={setYesImageUrl}
              onError={(m) => push('error', m)}
            />
          </Field>
          <Field label="NO image">
            <ImageUpload
              value={noImageUrl}
              fallback={noLabel.trim()[0]?.toUpperCase() ?? '✕'}
              adminAddress={adminAddress}
              onChange={setNoImageUrl}
              onError={(m) => push('error', m)}
            />
          </Field>
        </div>
      </div>

      <p className="text-xs text-muted">
        End date can’t be changed — it’s enforced on-chain. Pools, status and outcome are
        chain-derived and not editable here.
      </p>

      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="btn btn-primary">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button onClick={() => router.push(`/market/${market.id}`)} className="btn btn-ghost">
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
