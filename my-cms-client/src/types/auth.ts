export interface LoginRequest { username: string; password: string; }
export interface RegisterRequest { username: string; password: string; email: string; }
export interface AuthResponse { token: string; username: string; role: string; }
export interface VisitorCredentialsResponse { username: string; password: string; }
