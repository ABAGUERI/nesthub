export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export const getPctInRange = (value: Date, start: Date, end: Date) => {
  const pct = (value.getTime() - start.getTime()) / (end.getTime() - start.getTime());
  return clamp01(pct);
};

export const stripChildPrefix = (title: string, childName: string) => {
  const trimmedTitle = (title || '').trim();
  const trimmedName = (childName || '').trim();

  const candidates = [
    `${trimmedName} - `,
    `${trimmedName}- `,
    `${trimmedName} — `,
    `${trimmedName} – `,
    `${trimmedName}: `,
    `${trimmedName} `,
  ];

  for (const prefix of candidates) {
    if (trimmedTitle.toLowerCase().startsWith(prefix.toLowerCase())) {
      return trimmedTitle.slice(prefix.length).trim();
    }
  }

  return trimmedTitle;
};

export const formatDateShortFR = (date: Date) => {
  return date
    .toLocaleDateString('fr-CA', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
    .toUpperCase();
};

export const formatDateLongFR = (date: Date) => {
  const dateText = date.toLocaleDateString('fr-CA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const weekday = date.toLocaleDateString('fr-CA', { weekday: 'long' });
  return `${dateText} (${weekday})`;
};
