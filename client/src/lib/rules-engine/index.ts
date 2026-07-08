import type { Rule, Transaction } from '@/types';

type TxLike = Pick<Transaction, 'description' | 'amount' | 'accountId'>;

/**
 * Rule-matching engine. Pure functions, no UI and no direct DB access, so the
 * same logic runs against live bank syncs AND CSV imports (see lib/db/ingest.ts).
 *
 * PRECEDENCE — read this before editing:
 * A rule can combine up to three criteria: keyword text, amount range, and
 * source account. When several rules match one transaction:
 *   1. The MOST SPECIFIC rule wins — i.e. the one with the most criteria
 *      filled in. A rule matching "starbucks" AND amount $3–$10 (2 criteria)
 *      beats a rule matching just "starbucks" (1 criterion).
 *   2. If still tied, the MOST RECENTLY CREATED rule wins, on the theory
 *      that the newest rule best reflects the user's current intent.
 * A transaction matched by no rule stays Uncategorized (bucketId = null)
 * and is flagged in the transactions view.
 */
export function ruleMatches(rule: Rule, tx: TxLike): boolean {
  if (rule.keyword) {
    const haystack = tx.description.toLowerCase();
    const needle = rule.keyword.toLowerCase();
    const hit = rule.matchType === 'startsWith' ? haystack.startsWith(needle) : haystack.includes(needle);
    if (!hit) return false;
  }
  // Users think in positive dollar amounts, so bounds compare against the
  // absolute value (expenses are stored negative).
  const amount = Math.abs(tx.amount);
  if (rule.minAmount != null && amount < rule.minAmount) return false;
  if (rule.maxAmount != null && amount > rule.maxAmount) return false;
  if (rule.accountId != null && tx.accountId !== rule.accountId) return false;
  return true;
}

/** Number of criteria the rule actually uses (see precedence note above). */
export function ruleSpecificity(rule: Rule): number {
  let n = 0;
  if (rule.keyword) n++;
  if (rule.minAmount != null || rule.maxAmount != null) n++;
  if (rule.accountId != null) n++;
  return n;
}

/** Best-matching rule for a transaction, or null if none match. */
export function matchTransaction(tx: TxLike, rules: Rule[]): Rule | null {
  const matches = rules.filter((r) => ruleSpecificity(r) > 0 && ruleMatches(r, tx));
  if (matches.length === 0) return null;
  matches.sort(
    (a, b) => ruleSpecificity(b) - ruleSpecificity(a) || b.createdAt.localeCompare(a.createdAt)
  );
  return matches[0];
}

/** Bucket id the transaction should be filed into, or null (Uncategorized). */
export function categorize(tx: TxLike, rules: Rule[]): number | null {
  return matchTransaction(tx, rules)?.bucketId ?? null;
}
