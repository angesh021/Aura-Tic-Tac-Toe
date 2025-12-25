
export interface BadgeDef {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    border: string;
}

export const ALL_BADGES: BadgeDef[] = [
    { id: 'rookie', name: 'Rookie', description: 'Complete your first match.', icon: '🐣', color: 'text-yellow-400', border: 'border-yellow-400/50' },
    { id: 'first_win', name: 'First Blood', description: 'Win your first online match.', icon: '🩸', color: 'text-red-500', border: 'border-red-500/50' },
    { id: 'night_owl', name: 'Night Owl', description: 'Win between 12AM - 4AM.', icon: '🦉', color: 'text-indigo-400', border: 'border-indigo-400/50' },
    { id: 'sniper', name: 'Sniper', description: 'Win in 5 moves or less.', icon: '🎯', color: 'text-green-500', border: 'border-green-500/50' },
    { id: 'veteran', name: 'Veteran', description: 'Play 10 online matches.', icon: '🎖️', color: 'text-blue-400', border: 'border-blue-400/50' },
    { id: 'peacekeeper', name: 'Peacekeeper', description: 'Achieve 3 draws.', icon: '🕊️', color: 'text-gray-300', border: 'border-gray-400/50' },
    { id: 'marathon', name: 'Marathon', description: 'Win a game > 20 moves.', icon: '🏃', color: 'text-orange-400', border: 'border-orange-400/50' },
    { id: 'grandmaster', name: 'Grandmaster', description: 'Reach 1200 ELO.', icon: '👑', color: 'text-yellow-300', border: 'border-yellow-300/50' },
];

export const getBadge = (id: string): BadgeDef | undefined => {
    return ALL_BADGES.find(b => b.id === id);
};

// --- Rank System ---

export interface RankDef {
    name: string;
    minElo: number;
    color: string; // Tailwind text color class
    icon: string;
    shadow: string;
}

export const RANKS: RankDef[] = [
    { name: 'Iron', minElo: 0, color: 'text-zinc-500', icon: '🔩', shadow: 'shadow-zinc-500/50' },
    { name: 'Bronze', minElo: 1000, color: 'text-orange-400', icon: '🥉', shadow: 'shadow-orange-500/50' },
    { name: 'Silver', minElo: 1200, color: 'text-slate-300', icon: '🥈', shadow: 'shadow-slate-500/50' },
    { name: 'Gold', minElo: 1400, color: 'text-yellow-400', icon: '🥇', shadow: 'shadow-yellow-500/50' },
    { name: 'Platinum', minElo: 1600, color: 'text-cyan-400', icon: '💠', shadow: 'shadow-cyan-500/50' },
    { name: 'Emerald', minElo: 1800, color: 'text-emerald-400', icon: '💚', shadow: 'shadow-emerald-500/50' },
    { name: 'Diamond', minElo: 2000, color: 'text-blue-400', icon: '💎', shadow: 'shadow-blue-500/50' },
    { name: 'Master', minElo: 2200, color: 'text-purple-400', icon: '🔮', shadow: 'shadow-purple-500/50' },
    { name: 'Grandmaster', minElo: 2400, color: 'text-red-500', icon: '👑', shadow: 'shadow-red-500/50' },
];

export const getRank = (elo: number): RankDef => {
    // Returns the highest rank for the given ELO
    return [...RANKS].reverse().find(r => elo >= r.minElo) || RANKS[0];
};
