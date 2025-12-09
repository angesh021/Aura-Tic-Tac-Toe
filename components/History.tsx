
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MatchRecord, GameMode, GameVariant, Player, Difficulty } from '../types';
import { getHistory } from '../services/history';
import { HomeIcon, PlayIcon, ClockIcon, TrophyIcon } from './Icons';

interface HistoryProps {
    onWatchReplay: (match: MatchRecord) => void;
    onBack: () => void;
}

const History: React.FC<HistoryProps> = ({ onWatchReplay, onBack }) => {
    const [history, setHistory] = useState<MatchRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                const userHistory = await getHistory();
                setHistory(userHistory);
            } catch (error) {
                console.error("Failed to fetch match history:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const getResultData = (match: MatchRecord) => {
        const isDraw = match.winner === 'draw';
        let isWin = false;
        
        // Determine win state based on recorded role or game mode
        if (match.playerRole) {
            isWin = match.winner === match.playerRole;
        } else if (match.gameMode === GameMode.AI || match.gameMode === GameMode.CAMPAIGN) {
            isWin = match.winner === Player.X;
        } else {
            isWin = match.winner === Player.X; // Fallback
        }

        const title = isDraw ? "DRAW" : (isWin ? "VICTORY" : "DEFEAT");
        
        let reason = "Line Complete";
        const r = match.winReason || match.gameSettings.winReason;
        
        if (isDraw) reason = "Stalemate";
        else {
            if (r === 'timeout') {
                reason = isWin ? "Opponent Timeout" : "Time Run Out";
            } else if (r === 'forfeit') {
                reason = isWin ? "Opponent Forfeited" : "Forfeited";
            } else if (r === 'disconnect') {
                reason = "Connection Lost";
            } else if (match.gameSettings.variant === GameVariant.MISERE) {
                reason = isWin ? "Opponent Forced" : "Forced to Win";
            }
        }
        
        return { title, reason, isWin, isDraw };
    };

    const getDifficultyColor = (d: Difficulty) => {
        switch(d) {
            case Difficulty.EASY: return 'text-green-400 bg-green-400/10 border-green-400/20';
            case Difficulty.MEDIUM: return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
            case Difficulty.HARD: return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
            case Difficulty.BOSS: return 'text-red-400 bg-red-400/10 border-red-400/20';
            default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
        }
    };

    const getOpponentLabel = (match: MatchRecord): string => {
        if (match.opponentName) return match.opponentName;
        if (match.gameMode === GameMode.AI) return 'Aura (AI)';
        if (match.gameMode === GameMode.LOCAL) return 'Local Player';
        if (match.gameMode === GameMode.ONLINE) return 'Online Opponent';
        return 'Opponent';
    };

    return (
        <motion.div
            className="w-full max-w-2xl p-6 space-y-6 bg-white/20 dark:bg-black/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 h-full max-h-[800px] flex flex-col"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-white">Match History</h1>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Past Battles</p>
                </div>
                <motion.button onClick={onBack} className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors" aria-label="Go Back" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <HomeIcon className="w-6 h-6" />
                </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                <AnimatePresence>
                {isLoading ? (
                     <motion.div className="flex justify-center items-center h-64" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </motion.div>
                ) : history.length === 0 ? (
                    <motion.div className="flex flex-col items-center justify-center h-64 text-gray-400" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <TrophyIcon className="w-12 h-12 mb-2 opacity-20" />
                        <p className="text-lg">No matches found.</p>
                    </motion.div>
                ) : (
                    history.map((match, index) => {
                        const { title, reason, isWin, isDraw } = getResultData(match);
                        const stripeClass = isDraw ? 'bg-gray-500' : (isWin ? 'bg-green-500' : 'bg-red-500');
                        
                        return (
                        <motion.div
                            key={match.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => onWatchReplay(match)}
                            className="group relative w-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-xl cursor-pointer transition-all duration-200 overflow-hidden"
                        >
                            {/* Status Stripe */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${stripeClass}`} />

                            <div className="p-4 pl-6 flex flex-col sm:flex-row sm:items-center gap-4">
                                {/* Result & Reason */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <h3 className={`text-xl font-black italic tracking-tight ${
                                            isDraw ? 'text-gray-400' : (isWin ? 'text-green-400' : 'text-red-400')
                                        }`}>
                                            {title}
                                        </h3>
                                        <span className="text-xs font-bold text-white/50 uppercase tracking-wider truncate">
                                            {reason}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 text-sm text-gray-300">
                                        <span className="font-bold text-white">{getOpponentLabel(match)}</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-600" />
                                        <span className="text-xs opacity-70">{new Date(match.date).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                {/* Details & Stats */}
                                <div className="flex flex-wrap sm:flex-col sm:items-end gap-2 sm:gap-1 text-right">
                                    <div className="flex items-center gap-1.5">
                                        {(match.gameMode === GameMode.AI || match.gameMode === GameMode.CAMPAIGN) && (
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${getDifficultyColor(match.gameSettings.difficulty)}`}>
                                                {match.gameSettings.difficulty}
                                            </span>
                                        )}
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 uppercase">
                                            {match.gameSettings.boardSize}x{match.gameSettings.boardSize}
                                        </span>
                                        {match.gameSettings.blitzMode && (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-red-500/20 bg-red-500/10 text-red-400 uppercase flex items-center gap-1">
                                                <ClockIcon className="w-3 h-3" /> Blitz
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-4 mt-1">
                                        <span className="text-xs font-mono text-gray-500">
                                            {match.moves.length} Moves
                                        </span>
                                        <motion.button 
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            className="p-2 rounded-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-colors"
                                            title="Watch Replay"
                                        >
                                            <PlayIcon className="w-4 h-4" />
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )})
                )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default History;
