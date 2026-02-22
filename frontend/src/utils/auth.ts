const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return window.atob(padded);
};

export const getCurrentUserId = (): string | null => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1]));
    return payload.sub || payload.userId || null;
  } catch {
    return null;
  }
};
