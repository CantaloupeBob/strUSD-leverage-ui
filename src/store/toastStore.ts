import { create } from "zustand";

export type ToastStatus = "success" | "pending" | "fail";

export type Toast = {
  status: ToastStatus;
  title: string;
  description: string;
  hash?: string;
};

type ToastStore = {
  toast?: Toast;
  showToast: (toast: Toast) => void;
  dismissToast: () => void;
};

export const useToastStore = create<ToastStore>((set) => ({
  toast: undefined,
  showToast: (toast) => set({ toast }),
  dismissToast: () => set({ toast: undefined }),
}));
