window.api = {
  token: null,
  async request(path, options = {}) {
    const method = options.method || "GET";
    if (method !== "GET" && !this.token) {
      const result = await this.request("/auth/csrf");
      this.token = result.csrfToken;
    }
    let response;
    try {
      response = await fetch(`/api${path}`, {
        credentials: "same-origin",
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(method !== "GET" ? { "X-CSRF-Token": this.token } : {}),
          ...options.headers,
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      });
    } catch {
      throw new Error(
        "Chưa kết nối được máy chủ. Hãy kiểm tra mạng và thử lại.",
      );
    }
    const result = await response
      .json()
      .catch(() => ({ message: "Phản hồi máy chủ không hợp lệ." }));
    if (!response.ok) {
      const error = new Error(result.message || "Không thể thực hiện yêu cầu.");
      error.status = response.status;
      throw error;
    }
    if (result.csrfToken) this.token = result.csrfToken;
    return result;
  },
};
