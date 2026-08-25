export function EligibilityBadge({ eligible, reasons }: { eligible: boolean; reasons: string[] }) {
  if (eligible) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-100">
        Eligible
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-100"
      title={reasons.join("; ")}
    >
      Not eligible
    </span>
  );
}
