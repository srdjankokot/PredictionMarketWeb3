/** Default categories — seeded at startup, cannot be deleted (spec). */
export const DEFAULT_CATEGORIES: ReadonlyArray<{ name: string; slug: string; icon: string }> = [
  { name: 'Crypto', slug: 'crypto', icon: '🪙' },
  { name: 'Politics', slug: 'politics', icon: '🏛️' },
  { name: 'Sports', slug: 'sports', icon: '🏈' },
  { name: 'Science', slug: 'science', icon: '🔬' },
  { name: 'Entertainment', slug: 'entertainment', icon: '🎬' },
  { name: 'Finance', slug: 'finance', icon: '📈' },
  { name: 'World Events', slug: 'world-events', icon: '🌍' },
  { name: 'Other', slug: 'other', icon: '🎲' },
];

/** slugify a free-text category name for the admin add form. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
