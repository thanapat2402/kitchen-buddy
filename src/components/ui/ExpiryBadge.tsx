import { daysUntil, expiryLabelTh } from '../../lib/date';

interface ExpiryBadgeProps {
  expiryDate: string;
  className?: string;
}

/**
 * Color-coded expiry pill: red for ≤1 day (incl. expired), amber for ≤3 days,
 * neutral otherwise. Shared by "เมนูคืนนี้" warning strip and "ตู้ของฉัน".
 */
export function ExpiryBadge({ expiryDate, className = '' }: ExpiryBadgeProps) {
  const diff = daysUntil(expiryDate);
  const tone =
    diff <= 1
      ? 'bg-red-100 text-red-700'
      : diff <= 3
        ? 'bg-amber-100 text-amber-700'
        : 'bg-gray-100 text-gray-600';

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tone} ${className}`}>
      {expiryLabelTh(expiryDate)}
    </span>
  );
}
