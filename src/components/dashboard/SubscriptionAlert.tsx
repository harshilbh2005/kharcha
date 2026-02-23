'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import Card from '@/components/ui/Card';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UpcomingSubscription {
  /** Subscription ID (for key / navigation) */
  id: string;
  /** Display name, e.g. "YouTube Premium" */
  name: string;
  /** Renewal amount in INR */
  amount: number;
  /** Days until renewal (0 = today, 1 = tomorrow, etc.) */
  daysUntilRenewal: number;
}

export interface SubscriptionAlertProps {
  /** Subscriptions renewing within the next 3 days */
  upcoming: UpcomingSubscription[];
  /** Stagger delay for card entrance animation */
  delay?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

function daysLabel(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} day${days > 1 ? 's' : ''}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
//
// Conditionally rendered card — only appears when a subscription renews
// within 3 days. Taps navigate to /subscriptions.
//
// Layout:
//   ┌────────────────────────────────────────────────────────────┐
//   │  ⚡ YouTube Premium renews in 2 days (₹149)               │
//   └────────────────────────────────────────────────────────────┘
//
// Multiple upcoming subscriptions show as stacked lines within one card.

export function SubscriptionAlert({
  upcoming,
  delay = 0,
}: SubscriptionAlertProps) {
  const router = useRouter();

  // Don't render anything if no upcoming subscriptions
  if (upcoming.length === 0) return null;

  return (
    <Card
      animated
      delay={delay}
      hoverable
      onClick={() => router.push('/subscriptions')}
      className="!py-3 !px-4"
    >
      <div
        className="absolute inset-0 rounded-card pointer-events-none"
        style={{
          backgroundColor: 'var(--color-warning-bg)',
          borderRadius: 'inherit',
        }}
      />

      <div className="relative flex flex-col gap-1.5">
        {upcoming.map((sub, index) => (
          <motion.div
            key={sub.id}
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: delay + 0.3 + index * 0.08,
              duration: 0.25,
            }}
          >
            <Zap
              size={14}
              style={{
                color: 'var(--color-warning)',
                flexShrink: 0,
                fill: 'var(--color-warning)',
              }}
            />
            <p
              className="font-body text-sm leading-snug"
              style={{ color: 'var(--text-primary)' }}
            >
              <span className="font-medium">{sub.name}</span>
              {' renews '}
              {daysLabel(sub.daysUntilRenewal)}
              {' '}
              <span
                className="font-mono text-xs"
                style={{ color: 'var(--text-secondary)' }}
              >
                (₹{formatINR(sub.amount)})
              </span>
            </p>
          </motion.div>
        ))}

        {/* "View all" hint — reinforces that the whole card is tappable */}
        <motion.p
          className="font-body text-xs mt-1.5"
          style={{ color: 'var(--color-accent)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.5 }}
        >
          View all subscriptions →
        </motion.p>
      </div>
    </Card>
  );
}

export default SubscriptionAlert;
