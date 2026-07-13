// Check for ?api=... query parameter to dynamically set backend URL
if (typeof window !== "undefined") {
  const urlParams = new URLSearchParams(window.location.search);
  const apiParam = urlParams.get('api');
  if (apiParam) {
    localStorage.setItem('gg_api_url', apiParam);
    // Clean the URL by removing the query parameter from browser history
    const cleanUrl = window.location.pathname + window.location.search.replace(/[?&]api=[^&]+/, '').replace(/^&/, '?');
    window.history.replaceState({}, document.title, cleanUrl);
  }
}

const DEFAULT_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
const savedApiUrl = typeof window !== "undefined" ? localStorage.getItem("gg_api_url") : null;

export let BASE_URL = (savedApiUrl || DEFAULT_BASE_URL).replace(/\/$/, "");

export const getApiUrl = () => BASE_URL;

export const setApiUrl = (url) => {
  if (url) {
    localStorage.setItem("gg_api_url", url);
    BASE_URL = url.replace(/\/$/, "");
  } else {
    localStorage.removeItem("gg_api_url");
    BASE_URL = DEFAULT_BASE_URL;
  }
};

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
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "69420",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const request = (baseUrl) => fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  const attemptedBaseUrl = BASE_URL;
  let response;
  try {
    response = await request(attemptedBaseUrl);
  } catch {
    // ngrok free URLs commonly change. If a saved override is dead, retry the
    // configured URL and forget the stale override as soon as it responds.
    if (attemptedBaseUrl !== DEFAULT_BASE_URL) {
      try {
        response = await request(DEFAULT_BASE_URL);
        setApiUrl(null);
      } catch {
        throw new Error(`Cannot reach the backend at ${attemptedBaseUrl}. Check the API URL and make sure the backend and ngrok are running.`);
      }
    } else {
      throw new Error(`Cannot reach the backend at ${attemptedBaseUrl}. Make sure the backend is running.`);
    }
  }

  // A dead tunnel can still return a gateway response. Treat it like a stale
  // saved URL when the configured backend is available.
  if ([502, 503, 504].includes(response.status) && attemptedBaseUrl !== DEFAULT_BASE_URL) {
    try {
      response = await request(DEFAULT_BASE_URL);
      setApiUrl(null);
    } catch {
      // Preserve the original gateway response so the normal error handling
      // below reports its status.
    }
  }

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
    } catch {}
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
