import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from './Modal';
import { 
    TrophyIcon, LightningIcon, SkullIcon, ClockIcon, GridIcon, 
    MapIcon, CoinIcon, InfoIcon, QuestIcon, 
    SwordIcon, ShieldIcon, BombIcon, UndoIcon, HintIcon,
    BadgeIcon, LeaderboardIcon, StarIcon, ObstacleIcon
} from './Icons';
import { RANKS } from '../utils/badgeData';

interface InstructionsModalProps {
    onClose: () => void;
}

type Tab = 'basics' | 'modes' | 'ranks' | 'campaign' | 'economy';

const InstructionsModal: React.FC<InstructionsModalProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<Tab>('basics');

    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: 'basics', label: 'Basics', icon: <InfoIcon className="w-4 h-4" /> },
        { id: 'modes', label: 'Modes', icon: <GridIcon className="w-4 h-4" /> },
        { id: 'ranks', label: 'Ranks', icon: <LeaderboardIcon className="w-4 h-4" /> },
        { id: 'campaign', label: 'Campaign', icon: <MapIcon className="w-4 h-4" /> },
        { id: 'economy', label: 'Rewards', icon: <CoinIcon className="w-4 h-4" /> },
    ];

    return (
        <Modal onClose={onClose} className="max-w-4xl h-[600px] flex flex-col overflow-hidden" noPadding>
            {/* Header */}
            <div className="p-6 pb-2 flex justify-between items-center bg-black/20 border-b border-white/5">
                <div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-pink-500">
                        Game Guide
                    </h2>
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">Master the Aura</p>
                </div>
                <div className="flex gap-2 bg-black/40 p-1 rounded-xl overflow-x-auto max-w-[200px] sm:max-w-none no-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap
                                ${activeTab === tab.id 
                                    ? 'bg-white/10 text-white shadow-lg' 
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                }
                            `}
                        >
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative">
                <AnimatePresence mode="wait">
                    {activeTab === 'basics' && (
                        <motion.div 
                            key="basics"
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                            className="space-y-8"
                        >
                            <section className="space-y-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <TrophyIcon className="w-5 h-5 text-yellow-400" /> Core Rules
                                </h3>
                                <div className="bg-white/5 p-5 rounded-2xl border border-white/5 grid md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="font-bold text-cyan-400 mb-2">Standard Victory</h4>
                                        <p className="text-sm text-gray-300 leading-relaxed">
                                            Align <strong>3 or more</strong> of your symbols (X or O) in a row, column, or diagonal. The required length depends on the game settings (e.g., 4-in-a-row on 5x5 boards).
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-pink-400 mb-2">Misère Mode</h4>
                                        <p className="text-sm text-gray-300 leading-relaxed">
                                            Inverted rules! If you complete a line, you <strong className="text-red-400">LOSE</strong>. The goal is to force your opponent to make a line.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <LightningIcon className="w-5 h-5 text-purple-400" /> Power-Ups
                                </h3>
                                <p className="text-sm text-gray-400">Available in Local PvP and Solo vs AI modes. Can be toggled on/off in game settings.</p>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><UndoIcon className="w-5 h-5" /></div>
                                        <div>
                                            <strong className="block text-white text-sm">Undo / Rewind</strong>
                                            <p className="text-xs text-gray-400">Reverts the last move. Against AI, it rewinds the full round (your move + AI's move).</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                                        <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400"><HintIcon className="w-5 h-5" /></div>
                                        <div>
                                            <strong className="block text-white text-sm">Hint</strong>
                                            <p className="text-xs text-gray-400">Highlights the best available move. Great for learning strategy.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                                        <div className="p-2 bg-red-500/20 rounded-lg text-red-400"><BombIcon className="w-5 h-5" /></div>
                                        <div>
                                            <strong className="block text-white text-sm">Destroy</strong>
                                            <p className="text-xs text-gray-400">Removes an opponent's piece from the board. Tactical removal.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                                        <div className="p-2 bg-green-500/20 rounded-lg text-green-400"><ShieldIcon className="w-5 h-5" /></div>
                                        <div>
                                            <strong className="block text-white text-sm">Wall</strong>
                                            <p className="text-xs text-gray-400">Places an indestructible obstacle on an empty square. Block their path!</p>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </motion.div>
                    )}

                    {activeTab === 'modes' && (
                        <motion.div 
                            key="modes"
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                        >
                            <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/20">
                                <h3 className="text-xl font-bold text-white mb-4">Online PvP</h3>
                                <ul className="space-y-3">
                                    <li className="flex gap-3 text-sm text-gray-300">
                                        <TrophyIcon className="w-5 h-5 text-yellow-500 shrink-0" />
                                        <span><strong>ELO System:</strong> Everyone starts at 1000. Win to climb the leaderboard.</span>
                                    </li>
                                    <li className="flex gap-3 text-sm text-gray-300">
                                        <ClockIcon className="w-5 h-5 text-blue-400 shrink-0" />
                                        <span><strong>Standard:</strong> A timer per turn. If time runs out, you lose the match.</span>
                                    </li>
                                    <li className="flex gap-3 text-sm text-gray-300">
                                        <LightningIcon className="w-5 h-5 text-red-500 shrink-0" />
                                        <span><strong>Blitz Mode:</strong> Chess-clock rules. You have a total time bank (e.g., 3 mins). If your total time hits zero, you lose instantly.</span>
                                    </li>
                                </ul>
                            </div>
                            
                            <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-900/30 to-yellow-900/20 border border-orange-500/20">
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><CoinIcon className="w-5 h-5 text-yellow-400"/> Online Wager Lobbies</h3>
                                <ul className="space-y-3 text-sm text-gray-300">
                                    <li><strong>Ante Up:</strong> Choose a lobby (e.g., Bronze, Silver, Gold) and pay an entry fee (ante) in coins.</li>
                                    <li><strong>Winner Takes All:</strong> The antes from both players create a prize pot. The victor of the match wins the entire pot!</li>
                                    <li><strong>Draws:</strong> If the match is a draw, the pot is split evenly between both players.</li>
                                </ul>
                                <p className="text-xs text-orange-300/80 mt-4 italic">This is the ultimate test of skill for high stakes and high rewards.</p>
                            </div>

                            <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                                <h3 className="text-xl font-bold text-white mb-4">Customizable Rules</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                     <div className="flex gap-3">
                                        <GridIcon className="w-8 h-8 text-gray-500" />
                                        <div>
                                            <strong className="block text-white">Grid & Win Length</strong>
                                            <p className="text-xs text-gray-400 mt-1">Play on boards from 3x3 to 10x10. Adjust the required win streak from 'match 3' up to the board size.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <SkullIcon className="w-8 h-8 text-gray-500" />
                                        <div>
                                            <strong className="block text-white">Obstacles & Misère</strong>
                                            <p className="text-xs text-gray-400 mt-1">Enable random unplayable blocks or invert the rules with Misère mode for a fresh challenge.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'ranks' && (
                        <motion.div 
                            key="ranks"
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                        >
                            <div className="text-center mb-6">
                                <h3 className="text-2xl font-bold text-white mb-2">Competitive Tiers</h3>
                                <p className="text-gray-400 text-sm">Win Online Matches to increase your ELO and ascend.</p>
                            </div>

                            <div className="grid gap-3">
                                {RANKS.slice().reverse().map((rank) => (
                                    <div key={rank.name} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="text-3xl filter drop-shadow-md">{rank.icon}</div>
                                            <div>
                                                <div className={`font-bold text-lg ${rank.color} uppercase tracking-wider`}>{rank.name}</div>
                                                <div className="text-xs text-gray-500 font-medium">Tier</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono font-bold text-white text-lg">{rank.minElo}+</div>
                                            <div className="text-xs text-gray-500 font-medium">ELO</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'campaign' && (
                        <motion.div 
                            key="campaign"
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                        >
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 mx-auto bg-orange-500/20 rounded-full flex items-center justify-center border-2 border-orange-500 text-orange-500 mb-4">
                                    <MapIcon className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-bold text-white">The Journey</h3>
                                <p className="text-gray-400 text-sm mt-2">10 Levels. 10 Bosses. Infinite Glory.</p>
                            </div>

                            <div className="grid gap-4">
                                <div className="p-4 bg-white/5 rounded-xl border-l-4 border-green-500 flex items-center gap-4">
                                    <div className="text-2xl">⭐</div>
                                    <div>
                                        <strong className="block text-white">Star Rating</strong>
                                        <p className="text-xs text-gray-400">Based on moves. Win in under 10 moves for 3 Stars.</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl border-l-4 border-orange-500 flex items-center gap-4">
                                    <div className="text-2xl">⚔️</div>
                                    <div>
                                        <strong className="block text-white">Boss Mechanics</strong>
                                        <p className="text-xs text-gray-400">Each boss has a unique personality and board setup. Level 5 and 10 are major milestones.</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl border-l-4 border-yellow-500 flex items-center gap-4">
                                    <div className="text-2xl">💰</div>
                                    <div>
                                        <strong className="block text-white">Rewards</strong>
                                        <p className="text-xs text-gray-400">Earn huge Coin bonuses for clearing a level for the first time.</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'economy' && (
                        <motion.div 
                            key="economy"
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                        >
                             {/* Ways to Earn Coins */}
                            <div className="space-y-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <CoinIcon className="w-5 h-5 text-yellow-400" /> Ways to Earn Coins
                                </h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-white/5 rounded-xl"><strong className="text-cyan-400">Online PvP:</strong> +25 Coins per win.</div>
                                    <div className="p-4 bg-white/5 rounded-xl"><strong className="text-orange-400">Campaign:</strong> +50 to +1000 Coins on first clear.</div>
                                    <div className="p-4 bg-white/5 rounded-xl"><strong className="text-purple-400">Daily Quests:</strong> +30 to +100 Coins per quest.</div>
                                    <div className="p-4 bg-white/5 rounded-xl"><strong className="text-yellow-400">Achievements:</strong> +100 Coins per badge.</div>
                                </div>
                            </div>
                            
                            {/* XP Section */}
                            <div className="space-y-4 pt-6 border-t border-white/10">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <StarIcon className="w-5 h-5 text-purple-400" /> Earning Experience (XP)
                                </h3>
                                <p className="text-sm text-gray-400">Earn XP from every match to level up your profile and unlock rewards.</p>
                                <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-4">
                                    <div>
                                        <h4 className="font-bold text-purple-300 mb-2">Base XP</h4>
                                        <p className="text-sm text-gray-300">Earn <strong className="text-white">+10 XP</strong> for every match played, plus a <strong className="text-green-400">+25 XP</strong> bonus for winning.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-purple-300 mb-2">Skill Bonuses</h4>
                                        <ul className="text-sm text-gray-300 list-disc list-inside space-y-1">
                                            <li><strong className="text-cyan-400">ELO Bonus:</strong> Outplay a higher-ranked opponent for more XP.</li>
                                            <li><strong className="text-blue-400">Efficiency Bonus:</strong> Win in fewer moves.</li>
                                            <li><strong className="text-yellow-400">Flawless Bonus:</strong> Win without letting your opponent get a threat.</li>
                                            <li><strong className="text-orange-400">Comeback Bonus:</strong> Win after blocking an opponent's winning move.</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-purple-300 mb-2">Challenge Bonuses</h4>
                                        <ul className="text-sm text-gray-300 list-disc list-inside space-y-1">
                                            <li><strong className="text-indigo-400">Settings Bonus:</strong> Earn extra for winning on larger grids, with longer win-streaks, or with Obstacles/Misère modes active.</li>
                                            <li><strong className="text-red-400">Difficulty Bonus:</strong> Defeating Harder AI opponents in Solo or Campaign modes yields greater rewards.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 flex justify-end">
                <button 
                    onClick={onClose}
                    className="px-8 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg transition-colors"
                >
                    Got it
                </button>
            </div>
        </Modal>
    );
};

export default InstructionsModal;