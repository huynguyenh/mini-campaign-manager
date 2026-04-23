import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser } from '@mcm/shared';

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
}

// Rehydrate session from sessionStorage so a page refresh doesn't kick the user out.
// sessionStorage (vs. localStorage) limits exposure if the tab is closed — a light
// defense-in-depth vs. XSS-captured tokens.
function loadInitial(): AuthState {
  if (typeof window === 'undefined') return { token: null, user: null };
  try {
    const raw = window.sessionStorage.getItem('mcm-auth');
    if (!raw) return { token: null, user: null };
    return JSON.parse(raw) as AuthState;
  } catch {
    return { token: null, user: null };
  }
}

const slice = createSlice({
  name: 'auth',
  initialState: loadInitial(),
  reducers: {
    loggedIn(state, action: PayloadAction<{ token: string; user: AuthUser }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      try {
        window.sessionStorage.setItem('mcm-auth', JSON.stringify(state));
      } catch {
        /* ignore storage errors */
      }
    },
    loggedOut(state) {
      state.token = null;
      state.user = null;
      try {
        window.sessionStorage.removeItem('mcm-auth');
      } catch {
        /* ignore */
      }
    },
  },
});

export const { loggedIn, loggedOut } = slice.actions;
export const authReducer = slice.reducer;
