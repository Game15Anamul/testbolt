export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
};

export const setTeamSession = (teamId: string, teamName: string) => {
  sessionStorage.setItem('team_id', teamId);
  sessionStorage.setItem('team_name', teamName);
};

export const getTeamSession = (): { teamId: string; teamName: string } | null => {
  const teamId = sessionStorage.getItem('team_id');
  const teamName = sessionStorage.getItem('team_name');
  if (teamId && teamName) {
    return { teamId, teamName };
  }
  return null;
};

export const clearTeamSession = () => {
  sessionStorage.removeItem('team_id');
  sessionStorage.removeItem('team_name');
};

export const setAdminSession = () => {
  sessionStorage.setItem('is_admin', 'true');
};

export const getAdminSession = (): boolean => {
  return sessionStorage.getItem('is_admin') === 'true';
};

export const clearAdminSession = () => {
  sessionStorage.removeItem('is_admin');
};
