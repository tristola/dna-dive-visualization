import { create } from 'zustand';

export type StageId = 'cell' | 'nucleus' | 'chromatin' | 'dna';

export type HoveredBase = {
  index: number;
  pair: 'AT' | 'GC';
  position: { x: number; y: number };
};

type SceneStore = {
  selectedGeneId: string | null;
  hoveredBase: HoveredBase | null;
  stage: StageId;
  scrollOffset: number;
  drawerGeneId: string | null;
  setSelectedGene: (id: string | null) => void;
  setHoveredBase: (b: HoveredBase | null) => void;
  setStage: (s: StageId) => void;
  setScrollOffset: (o: number) => void;
  setDrawerGene: (id: string | null) => void;
};

export const useScene = create<SceneStore>((set) => ({
  selectedGeneId: null,
  hoveredBase: null,
  stage: 'cell',
  scrollOffset: 0,
  drawerGeneId: null,
  setSelectedGene: (id) => set({ selectedGeneId: id }),
  setHoveredBase: (b) => set({ hoveredBase: b }),
  setStage: (s) => set((prev) => (prev.stage === s ? prev : { stage: s })),
  setScrollOffset: (o) => set({ scrollOffset: o }),
  setDrawerGene: (id) => set({ drawerGeneId: id }),
}));

export function stageFromOffset(offset: number): StageId {
  if (offset < 0.2) return 'cell';
  if (offset < 0.4) return 'nucleus';
  if (offset < 0.6) return 'chromatin';
  return 'dna';
}
