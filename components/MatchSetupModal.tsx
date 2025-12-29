import React, { useState } from 'react';
import Modal from './Modal';
import GameSettingsEditor from './GameSettingsEditor';
import { GameSettings, GameVariant, Difficulty, WagerTier } from '../types';
import { SwordIcon, CloseIcon, CoinIcon } from './Icons';

interface MatchSetupModalProps {
    onClose: () => void;
    onConfirm: (settings: GameSettings, wagerTier: WagerTier) => void;
    opponentName: string;
    userCoins: number;
}

const defaultSettings: GameSettings = {
    boardSize: 3,
    winLength: 3,
    obstacles: false,
    variant: GameVariant.CLASSIC,
    difficulty: Difficulty.MEDIUM, 
    startingPlayer: 'random',
};

const WAGERS: { id: WagerTier, name: string, ante: number, color: string }[] = [
    { id: 'bronze', name: 'Bronze', ante: 50, color: 'from-orange-700 to-yellow-800' },
    { id: 'silver', name: 'Silver', ante: 250, color: 'from-slate-600 to-gray-700' },
    { id: 'gold', name: 'Gold', ante: 1000, color: 'from-yellow-600 to-amber-700' },
];

const MatchSetupModal: React.FC<MatchSetupModalProps> = ({ onClose, onConfirm, opponentName, userCoins }) => {
    const [settings, setSettings] = useState<GameSettings>(defaultSettings);
    const [selectedTier, setSelectedTier] = useState<WagerTier>('bronze');

    return (
        <Modal onClose={onClose} className="max-w-xl max-h-[85vh] flex flex-col" noPadding>
            <div className="flex justify-between items-center p-6 border-b border-white/10 shrink-0 bg-slate-900/50">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <SwordIcon className="w-6 h-6 text-cyan-400" /> Challenge {opponentName}
                    </h2>
                    <p className="text-sm text-gray-400">Configure match rules & stakes</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <CloseIcon className="w-5 h-5 text-gray-400" />
                </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar p-6 space-y-8">
                {/* Wager Selection */}
                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <CoinIcon className="w-4 h-4 text-yellow-500" /> Select Stakes
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                        {WAGERS.map((tier) => {
                            const canAfford = userCoins >= tier.ante;
                            const isSelected = selectedTier === tier.id;
                            
                            return (
                                <button
                                    key={tier.id}
                                    onClick={() => canAfford && setSelectedTier(tier.id)}
                                    disabled={!canAfford}
                                    className={`relative p-3 rounded-xl border transition-all flex flex-col items-center gap-2 overflow-hidden group
                                        ${isSelected 
                                            ? 'border-yellow-500 ring-1 ring-yellow-500/50 bg-yellow-500/10' 
                                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                                        }
                                        ${!canAfford ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'}
                                    `}
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br ${tier.color} opacity-0 transition-opacity ${isSelected ? 'opacity-20' : 'group-hover:opacity-10'}`} />
                                    
                                    <div className="font-bold text-white text-sm relative z-10">{tier.name}</div>
                                    <div className={`text-xs font-mono font-bold flex items-center gap-1 relative z-10 ${isSelected ? 'text-yellow-400' : 'text-gray-400'}`}>
                                        <CoinIcon className="w-3 h-3" /> {tier.ante}
                                    </div>
                                    
                                    {!canAfford && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px] z-20">
                                            <span className="text-[10px] font-bold text-red-400 uppercase">No Funds</span>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-2 text-center">
                        <span className="text-xs text-gray-500">
                            Total Pot: <span className="text-yellow-400 font-bold">{WAGERS.find(t => t.id === selectedTier)!.ante * 2} Coins</span>
                        </span>
                    </div>
                </div>

                {/* Game Settings */}
                <div>
                    <GameSettingsEditor settings={settings} setSettings={setSettings} />
                </div>
            </div>

            <div className="flex gap-4 p-6 border-t border-white/10 bg-slate-900/50 shrink-0">
                <button 
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl font-bold text-gray-400 hover:bg-white/5 transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={() => onConfirm(settings, selectedTier)}
                    className="flex-[2] py-3 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
                >
                    <SwordIcon className="w-5 h-5" /> 
                    <span>Send Invite ({WAGERS.find(t => t.id === selectedTier)!.ante})</span>
                </button>
            </div>
        </Modal>
    );
};

export default MatchSetupModal;