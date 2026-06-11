'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { maxUint256 } from 'viem';
import { usePublicClient, useWriteContract } from 'wagmi';
import type { Category, Market } from '@predictx/shared';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { MarketCard } from '@/components/market/MarketCard';
import { useToast } from '@/components/shared/Toast';
import { ERC20ABI, PredictionMarketABI } from '@/lib/abi';
import { CONTRACT_ADDRESS, USDC_ADDRESS } from '@/lib/constants';
import { parseContractError } from '@/lib/errors';
import { formatDateTimeWithUtc, formatUsd, toUsdcUnits } from '@/lib/format';
import { useWalletStore } from '@/store/walletStore';

type Status = 'idle' | 'approving' | 'creating' | 'saving';

export function CreateMarketForm({ adminAddress }: { adminAddress: string }) {
  const router = useRouter();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { push } = useToast();
  const balance = useWalletStore((s) => s.usdcBalance);
  const allowance = useWalletStore((s) => s.usdcAllowance);
  const refetchBalances = useWalletStore((s) => s.refetch);

  const [categories, setCategories] = useState<Category[]>([]);
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('12:00');
  const [seedStr, setSeedStr] = useState('100');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [yesImageUrl, setYesImageUrl] = useState<string | null>(null);
  const [noImageUrl, setNoImageUrl] = useState<string | null>(null);
  const [yesLabel, setYesLabel] = useState('');
  const [noLabel, setNoLabel] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/admin/categories');
      if (res.ok) {
        const data = (await res.json()) as { categories: Category[] };
        setCategories(data.categories);
        if (data.categories[0]) setCategoryId((prev) => prev || data.categories[0].id);
      }
    })();
  }, []);

  const seed = Number(seedStr) || 0;
  const endMs = endDate && endTime ? new Date(`${endDate}T${endTime}`).getTime() : NaN;
  const endISO = Number.isFinite(endMs) ? new Date(endMs).toISOString() : '';
  const selectedCategory = categories.find((c) => c.id === categoryId);

  const preview: Market = useMemo(
    () => ({
      id: 'preview',
      contractId: 0,
      question: question || 'Your question will appear here…',
      description,
      category: selectedCategory ?? { id: '', name: 'Category', slug: '', icon: '🎲' },
      endDate: endISO || new Date(Date.now() + 86400000).toISOString(),
      resolved: false,
      outcome: null,
      status: 'ACTIVE',
      imageUrl,
      yesLabel: yesLabel || 'YES',
      noLabel: noLabel || 'NO',
      yesImageUrl,
      noImageUrl,
      yesPool: seed / 2,
      noPool: seed / 2,
      yesPrice: 0.5,
      noPrice: 0.5,
      volume: 0,
      createdAt: new Date().toISOString(),
    }),
    [question, description, selectedCategory, endISO, imageUrl, yesImageUrl, noImageUrl, yesLabel, noLabel, seed],
  );

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (question.trim().length < 10 || question.trim().length > 140) e.question = 'Must be 10–140 characters';
    if (description.trim().length < 20 || description.trim().length > 1000) e.description = 'Must be 20–1000 characters';
    if (!categoryId) e.category = 'Pick a category';
    if (!Number.isFinite(endMs)) e.end = 'Pick a date and time';
    else if (endMs < Date.now() + 3600_000) e.end = 'Must be at least 1 hour in the future';
    if (!(seed >= 10 && seed <= 10000)) e.seed = 'Seed must be 10–10,000 USDC';
    else if (seed > balance) e.seed = `Exceeds balance (${formatUsd(balance)})`;
    const oneLabel = Boolean(yesLabel.trim()) !== Boolean(noLabel.trim());
    if (oneLabel) e.labels = 'Set both labels or leave both blank';
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0 || !publicClient) return;

    try {
      const seedRaw = toUsdcUnits(seed);
      if (allowance < seedRaw) {
        setStatus('approving');
        const aHash = await writeContractAsync({
          address: USDC_ADDRESS,
          abi: ERC20ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESS, maxUint256],
        });
        await publicClient.waitForTransactionReceipt({ hash: aHash });
      }

      setStatus('creating');
      const endSec = BigInt(Math.floor(endMs / 1000));
      const cHash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: PredictionMarketABI,
        functionName: 'createMarket',
        args: [question.trim(), endSec, seedRaw],
      });
      await publicClient.waitForTransactionReceipt({ hash: cHash });

      const contractId = Number(
        await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: PredictionMarketABI,
          functionName: 'marketCount',
        }),
      );

      setStatus('saving');
      const res = await fetch('/api/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-wallet-address': adminAddress },
        body: JSON.stringify({
          contractId,
          question: question.trim(),
          description: description.trim(),
          categoryId,
          endDate: endISO,
          imageUrl,
          yesLabel: yesLabel.trim() || undefined,
          noLabel: noLabel.trim() || undefined,
          yesImageUrl,
          noImageUrl,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed to save market metadata');
      }

      refetchBalances();
      push('success', 'Market created');
      router.push(`/market/${contractId}`);
    } catch (err) {
      push('error', parseContractError(err));
      setStatus('idle');
    }
  }

  const busy = status !== 'idle';
  const needsApproval = seed > 0 && allowance < toUsdcUnits(seed);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Form */}
      <div className="space-y-5">
        <Section title="Market info">
          <Field label={`Question (${question.length}/140)`} error={errors.question}>
            <input className="input" value={question} maxLength={140} onChange={(e) => setQuestion(e.target.value)} placeholder="Will X happen by Y?" />
          </Field>
          <Field label={`Description (${description.length}/1000)`} error={errors.description}>
            <textarea className="input min-h-24" value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} placeholder="Resolution criteria and context…" />
          </Field>
          <Field label="Category" error={errors.category}>
            <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </Field>
        </Section>

        <Section title="Timing">
          <div className="grid grid-cols-2 gap-3">
            <Field label="End date" error={errors.end}>
              <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </Field>
            <Field label="End time">
              <input type="time" className="input" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </Field>
          </div>
          {endISO && <p className="text-xs text-muted">Ends {formatDateTimeWithUtc(endISO)}</p>}
        </Section>

        <Section title="Liquidity">
          <Field label="Seed amount (USDC)" error={errors.seed}>
            <input inputMode="decimal" className="input" value={seedStr} onChange={(e) => setSeedStr(e.target.value.replace(/[^0-9.]/g, ''))} />
          </Field>
          <p className="text-xs text-muted">
            Balance: {formatUsd(balance)} · Initial price — YES 50% / NO 50%
          </p>
        </Section>

        <Section title="Appearance">
          <Field label="Image (optional)">
            <ImageUpload
              value={imageUrl}
              fallback={selectedCategory?.icon ?? '🎲'}
              adminAddress={adminAddress}
              onChange={setImageUrl}
              onError={(m) => push('error', m)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="YES label">
              <input className="input" value={yesLabel} maxLength={20} onChange={(e) => setYesLabel(e.target.value)} placeholder="YES" />
            </Field>
            <Field label="NO label">
              <input className="input" value={noLabel} maxLength={20} onChange={(e) => setNoLabel(e.target.value)} placeholder="NO" />
            </Field>
          </div>
          {errors.labels && <p className="text-xs text-no">{errors.labels}</p>}

          <div className="grid grid-cols-2 gap-3">
            <Field label="YES image (optional)">
              <ImageUpload
                value={yesImageUrl}
                fallback={yesLabel.trim()[0]?.toUpperCase() ?? '✓'}
                adminAddress={adminAddress}
                onChange={setYesImageUrl}
                onError={(m) => push('error', m)}
              />
            </Field>
            <Field label="NO image (optional)">
              <ImageUpload
                value={noImageUrl}
                fallback={noLabel.trim()[0]?.toUpperCase() ?? '✕'}
                adminAddress={adminAddress}
                onChange={setNoImageUrl}
                onError={(m) => push('error', m)}
              />
            </Field>
          </div>
        </Section>

        {needsApproval && !busy && (
          <p className="text-center text-xs text-muted">1. Approve USDC → 2. Create Market</p>
        )}
        <button onClick={handleSubmit} disabled={busy} className="btn btn-primary w-full">
          {status === 'approving'
            ? 'Approving USDC…'
            : status === 'creating'
              ? 'Creating market…'
              : status === 'saving'
                ? 'Saving…'
                : 'Create market'}
        </button>
      </div>

      {/* Live preview */}
      <div>
        <p className="label">Live preview</p>
        <div className="pointer-events-none max-w-sm">
          <MarketCard market={preview} />
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-3 p-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-no">{error}</p>}
    </div>
  );
}
