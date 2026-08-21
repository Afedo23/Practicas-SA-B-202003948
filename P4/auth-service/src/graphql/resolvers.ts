import { AuthService } from "../application/AuthService";

export function buildResolvers(authService: AuthService) {
  return {
    Query: {
      me: async (_: unknown, { token }: { token: string }) => {
        const payload = authService.verifyToken(token);
        if (!payload) return null;
        return authService.me(payload.id);
      },
    },
    Mutation: {
      login: async (_: unknown, { username, password }: { username: string; password: string }) => {
        return authService.login(username, password);
      },
    },
  };
}
