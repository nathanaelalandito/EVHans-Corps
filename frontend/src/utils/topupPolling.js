export const MAX_TOPUP_POLL_FAILURES = 3;

export function shouldShowTopupPollRetry(consecutiveFailures) {
  return consecutiveFailures >= MAX_TOPUP_POLL_FAILURES;
}
