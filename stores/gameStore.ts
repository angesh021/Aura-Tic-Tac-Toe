
import { create } from 'zustand';
import { Room } from '../types';

interface GameState {
  room: Room | null;
  setRoom: (room: Room | null) => void;
}

export const useGameStore = create<GameState>((set) => ({
  room: null,
  setRoom: (room) => set({ room }),
}));
