const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("wellwatch_token");
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Token ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token) {
      clearSession();
      window.location.assign("/");
    }
    const detail = data.detail || data.error || data;
    const message = typeof detail === "string" ? detail : Array.isArray(detail)
      ? detail.join(" ")
      : Object.entries(detail).map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(" ") : messages}`).join(" ") || "Request failed.";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

export const api = {
  login: (credentials) => request("/login", { method: "POST", body: JSON.stringify(credentials) }),
  logout: () => request("/logout", { method: "POST" }),
  checkIn: (payload) => request("/checkin", { method: "POST", body: JSON.stringify(payload) }),
  dashboard: () => request("/me/dashboard"),
  trends: (range = "4w") => request(`/me/trends?range=${range}`),
  recommendations: () => request("/me/recommendations"),
  profile: () => request("/me/profile"),
  updateProfile: (profile) => request("/me/profile", { method: "PATCH", body: JSON.stringify(profile) }),
  changePassword: (current_password, new_password) => request("/me/password", { method: "PATCH", body: JSON.stringify({ current_password, new_password }) }),
  forgotPassword: (email) => request("/password/forgot", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (uid, token, new_password) => request("/password/reset", { method: "POST", body: JSON.stringify({ uid, token, new_password }) }),
  history: () => request("/me/history"),
  share: (shared_with_manager) => request("/me/share", { method: "PATCH", body: JSON.stringify({ shared_with_manager }) }),
  teamStats: () => request("/team/stats"),
  team: () => request("/team"),
  updateTeam: (name) => request("/team", { method: "PATCH", body: JSON.stringify({ name }) }),
  teamReport: () => request("/team/report"),
  teamMembers: () => request("/team/members"),
  addTeamMember: (member) => request("/team/members", { method: "POST", body: JSON.stringify(member) }),
  removeTeamMember: (id) => request("/team/members", { method: "DELETE", body: JSON.stringify({ id }) }),
  notifyHr: () => request("/team/notify-hr", { method: "POST" }),
};

export function clearSession() {
  localStorage.removeItem("wellwatch_token");
  localStorage.removeItem("wellwatch_role");
  localStorage.removeItem("wellwatch_loggedIn");
}
