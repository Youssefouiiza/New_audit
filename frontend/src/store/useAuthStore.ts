import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'MANAGER' | 'AUDITOR' | 'CLIENT';
}

interface AuthState {
  token: string | null;
  user: User | null;
  isHydrated: boolean;
  setToken: (token: string) => void;
  logout: () => void;
  setHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isHydrated: false,
      setToken: (token) => {
        try {
          const decoded: any = jwtDecode(token);
          set({
            token,
            user: {
              id: decoded.userId || decoded.sub, // adjust based on token claims
              email: decoded.email || decoded.sub,
              fullName: decoded.name || 'Utilisateur',
              role: decoded.role || 'CLIENT',
            },
          });
        } catch (e) {
          console.error('Invalid token');
        }
      },
      logout: () => set({ token: null, user: null }),
      setHydrated: (state) => set({ isHydrated: state }),
    }),
    {
      name: 'audit-auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
