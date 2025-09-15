'use client';

interface SessionProviderProps {
  children: React.ReactNode;
}

export default function SessionProvider({ children }: SessionProviderProps) {
  // Using custom JWT authentication system - no NextAuth needed
  return <>{children}</>;
} 