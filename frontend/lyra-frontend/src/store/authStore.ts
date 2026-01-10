type AuthState = {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
};

export const authStore: AuthState = {
  token: localStorage.getItem("lyra_token"),

  login(token: string) {
    this.token = token;
    localStorage.setItem("lyra_token", token);
  },

  logout() {
    this.token = null;
    localStorage.removeItem("lyra_token");
  },
};
