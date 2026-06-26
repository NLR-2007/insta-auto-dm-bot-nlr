// Client API connector to local backend (via tunnel or direct localhost)

export const getApiUrl = () => {
  return localStorage.getItem("insta_api_url") || "http://localhost:8000";
};

export const setApiUrl = (url) => {
  let cleanedUrl = url.trim();
  if (cleanedUrl.endsWith("/")) {
    cleanedUrl = cleanedUrl.slice(0, -1);
  }
  localStorage.setItem("insta_api_url", cleanedUrl);
};

export const apiFetch = async (endpoint, options = {}) => {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}${endpoint}`;
  
  const headers = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "69420", // Skip ngrok browser warning intercept screen to prevent CORS errors on fetch
    ...options.headers,
  };
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    let errMsg = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const data = await response.json();
      if (data && data.detail) errMsg = data.detail;
    } catch (_) {}
    throw new Error(errMsg);
  }
  
  return response.json();
};
