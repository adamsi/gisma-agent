export interface User {
  username: string;
  email: string;
  picture?: string;
  role: string;
}

export interface LoginUserDto {
  username: string;
  password: string;
}

export interface RegisterUserDto {
  email: string;
  password: string;
  username: string;
}

export interface VerificationInfoDto {
  message: string;
  email: string;
}

export interface AuthResponse {
  message: string;
  user?: User;
} 