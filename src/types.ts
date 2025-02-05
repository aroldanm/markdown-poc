export interface User {
  id: string;
  email: string;
}

export interface MarkdownFile {
  id: string;
  title: string | null; // Updated to allow null
  fileName: string;
  content: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
}

export type AuthProvider = 'github' | 'google' | 'apple' | 'email';

export interface AuthState {
  isSignUp: boolean;
  email: string;
  password: string;
  name?: string;
  confirmPassword?: string;
}