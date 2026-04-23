import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

export interface Toast {
  id: string;
  kind: 'error' | 'success' | 'info';
  message: string;
}

const slice = createSlice({
  name: 'ui',
  initialState: { toasts: [] as Toast[] },
  reducers: {
    toastShown: {
      reducer: (state, action: PayloadAction<Toast>) => {
        state.toasts.push(action.payload);
      },
      prepare: (kind: Toast['kind'], message: string) => ({
        payload: { id: nanoid(), kind, message } as Toast,
      }),
    },
    toastDismissed(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const { toastShown, toastDismissed } = slice.actions;
export const uiReducer = slice.reducer;
