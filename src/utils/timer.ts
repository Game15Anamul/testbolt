export const calculateTimeRemaining = (endsAt: string | null): number => {
  if (!endsAt) return 0;
  const now = new Date().getTime();
  const end = new Date(endsAt).getTime();
  const remaining = Math.max(0, Math.floor((end - now) / 1000));
  return remaining;
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const shouldResetTimer = (timeRemaining: number): boolean => {
  return timeRemaining <= 5 && timeRemaining > 0;
};
