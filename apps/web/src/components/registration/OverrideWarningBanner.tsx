export function OverrideWarningBanner({
  registrationClosesAt,
  isDeadlinePassed,
}: {
  registrationClosesAt: string | null | undefined;
  isDeadlinePassed?: boolean;
}) {
  if (!isDeadlinePassed) return null;
  const date = registrationClosesAt ? new Date(registrationClosesAt).toLocaleString() : "unknown date";
  return (
    <div className="rounded-md bg-amber-50 p-4 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
      <div className="flex">
        <div className="flex-shrink-0">
          <span className="text-amber-400">⚠</span>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">Admin override required</h3>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            Registration for this event closed on {date}. Proceeding will be logged as an admin override.
          </p>
        </div>
      </div>
    </div>
  );
}
