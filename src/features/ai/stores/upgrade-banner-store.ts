import { create } from 'zustand';

type UpgradeBannerState = {
  /** Bannière masquée jusqu'au prochain démarrage de l'app (état UI éphémère, jamais persisté). */
  dismissed: boolean;
  dismiss: () => void;
};

export const useUpgradeBannerStore = create<UpgradeBannerState>((set) => ({
  dismissed: false,
  dismiss: () => set({ dismissed: true }),
}));
