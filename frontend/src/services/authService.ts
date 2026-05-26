const API_URL = import.meta.env.VITE_API_URL || '/api';

console.log('Using API_URL:', API_URL);

const handleResponse = async (response: Response) => {
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    data = { message: text || response.statusText || 'Unknown server error' };
  }

  if (!response.ok) {
    throw data;
  }
  return data;
};

export const getCurrentUser = async () => {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    // Important if cookies are on different domain/port, though Vite proxy might handle it
    // credentials: 'omit' // or 'include' based on setup
  });

  return handleResponse(response);
};

export const logoutUser = async () => {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  localStorage.removeItem('user');
  return handleResponse(response);
};
