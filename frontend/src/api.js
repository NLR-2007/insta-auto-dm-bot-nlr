// Client API connector — URL is loaded from environment variable (hidden from users)
const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

export const getApiUrl = () => BASE_URL;

// ─── Token helpers ───────────────────────────────────────────────────────────
export const getToken = () => localStorage.getItem("gg_token");
export const setToken = (token) => localStorage.setItem("gg_token", token);
export const removeToken = () => localStorage.removeItem("gg_token");

export const getAuthUser = () => {
  try {
    return JSON.parse(localStorage.getItem("gg_user") || "null");
  } catch {
    return null;
  }
};
export const setAuthUser = (user) => localStorage.setItem("gg_user", JSON.stringify(user));
export const removeAuthUser = () => localStorage.removeItem("gg_user");

export const logout = () => {
  removeToken();
  removeAuthUser();
  window.location.reload();
};

// ─── Core fetch wrapper ───────────────────────────────────────────────────────
export const apiFetch = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "69420",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Auto-logout on expired/invalid token
  if (response.status === 401) {
    logout();
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    let errMsg = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const data = await response.json();
      if (data && data.detail) {
        errMsg = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
      }
    } catch (_) {}
    throw new Error(errMsg);
  }

  return response.json();
};

// ─── Auth API helpers ─────────────────────────────────────────────────────────
export const apiLogin = async (username, password) => {
  const data = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(data.access_token);
  setAuthUser({ username: data.username, is_admin: data.is_admin });
  return data;
};

export const apiRegister = async (username, email, password) => {
  return apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
};

export const apiUpload = async (endpoint, file) => {
  const url = `${BASE_URL}${endpoint}`;
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "ngrok-skip-browser-warning": "69420",
    },
    body: formData,
  });

  if (response.status === 401) {
    logout();
    throw new Error("Session expired. Please log in again.");
  }
  if (!response.ok) {
    let errMsg = `Upload failed: ${response.status}`;
    try {
      const data = await response.json();
      if (data?.detail) errMsg = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
    } catch {}
    throw new Error(errMsg);
  }
  return response.json();
};
