import { create } from 'zustand';

export const ARCHIVE_CUTOFF_DATE = '2026-01-01';

interface ArchiveState {
  isArchiveMode: boolean;
  setArchiveMode: (mode: boolean) => void;
}

export const useArchiveStore = create<ArchiveState>((set) => ({
  isArchiveMode: false,
  setArchiveMode: (mode) => set({ isArchiveMode: mode }),
}));

export const applyArchiveFilter = (query: any, dateColumn: string) => {
  const { isArchiveMode } = useArchiveStore.getState();
  if (isArchiveMode) {
    return query.lt(dateColumn, ARCHIVE_CUTOFF_DATE);
  } else {
    return query.gte(dateColumn, ARCHIVE_CUTOFF_DATE);
  }
};

