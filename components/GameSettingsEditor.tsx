
import React from 'react';
import { GameSettings, GameVariant, Difficulty, Player } from '../types';
import { GridIcon, TrophyIcon, ObstacleIcon, SkullIcon, LightningIcon, ClockIcon, InfoIcon, PlayIcon, SwordIcon } from './Icons';

interface GameSettingsEditorProps {
    settings: GameSettings;
    setSettings: React.Dispatch<React.SetStateAction<GameSettings>>;
}

const GameSettingsEditor: React.FC<GameSettingsEditorProps> = ({ settings, setSettings }) => {
    
    const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSize = parseInt(e.target.value, 10);
        setSettings(s => ({
            ...s,
            boardSize: newSize,
            winLength: Math.min(s.winLength, newSize)
        }));
    };
    
    const handleWinLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newWinLength = parseInt(e.target.value, 10);
        setSettings(s => ({ ...s, winLength: newWinLength }));
    };

    const handleDifficultyChange = (difficulty: Difficulty) => {
        setSettings(s => ({ ...s, difficulty }));
    };
    
    const handleBlitzDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings(s => ({ ...s, blitzDuration: parseInt(e.target.value, 10) }));
    }

    const handleTurnDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings(s => ({ ...s, turnDuration: parseInt(e.target.value, 10) }));
    }

    const getDifficultyDescription = (diff: Difficulty) => {
        switch(diff) {
            case Difficulty.EASY: return "Makes occasional mistakes. Good for warming up.";
            case Difficulty.MEDIUM: return "Balanced challenge. Thinks a few moves ahead.";
            case Difficulty.HARD: return "Aggressive and strategic. tough to beat.";
            case Difficulty.BOSS: return "Calculates almost every possibility. Unbeatable.";
        }
    };

    return (
        <div className="p-1 space-y-8">
            {/* Difficulty Selector */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 font-bold text-gray-600 dark:text-gray-300 text-sm uppercase tracking-wider">
                    <LightningIcon className="w-5 h-5 text-purple-500" />
                    <span>AI Difficulty</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {Object.values(Difficulty).map((diff) => (
                        <button
                            key={diff}
                            onClick={() => handleDifficultyChange(diff)}
                            className={`px-1 py-3 text-xs sm:text-sm font-semibold rounded-lg border transition-all duration-200
                                ${settings.difficulty === diff 
                                    ? 'bg-cyan-500 text-white border-cyan-600 shadow-md transform scale-105' 
                                    : 'bg-white/5 text-gray-500 dark:text-gray-400 border-transparent hover:bg-white/10'
                                }
                                ${diff === Difficulty.BOSS && settings.difficulty !== Difficulty.BOSS ? 'text-red-500 dark:text-red-400' : ''}
                            `}
                        >
                            {diff === Difficulty.BOSS ? 'BOSS 💀' : diff}
                        </button>
                    ))}
                </div>
                 <div className="bg-purple-500/5 p-3 rounded-lg border border-purple-500/10 flex gap-3 items-start">
                    <InfoIcon className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        {getDifficultyDescription(settings.difficulty)}
                    </p>
                 </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-white/5 pt-6">
                {/* Board Size Slider */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-base">
                        <div className="flex items-center gap-2 font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            <GridIcon className="w-5 h-5 text-cyan-500" />
                            <span>Board Size</span>
                        </div>
                        <span className="font-bold text-cyan-500 bg-cyan-500/10 px-3 py-1 rounded-md border border-cyan-500/20 text-sm">
                            {settings.boardSize} x {settings.boardSize}
                        </span>
                    </div>
                    <input 
                        type="range" 
                        min="3" 
                        max="10" 
                        value={settings.boardSize} 
                        onChange={handleSizeChange} 
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" 
                    />
                    <div className="bg-cyan-500/5 p-3 rounded-lg border border-cyan-500/10">
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                            Adjust grid dimensions. Standard is 3x3. <br/>
                            <span className="text-cyan-500 font-bold">Note:</span> AI support disabled &gt; 4x4.
                        </p>
                    </div>
                </div>

                {/* Win Length Slider */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-base">
                        <div className="flex items-center gap-2 font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            <TrophyIcon className="w-5 h-5 text-yellow-500" />
                            <span>Win Streak</span>
                        </div>
                        <span className="font-bold text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-md border border-yellow-500/20 text-sm">
                            Match {settings.winLength}
                        </span>
                    </div>
                    <input 
                        type="range" 
                        min="3" 
                        max={settings.boardSize} 
                        value={settings.winLength} 
                        onChange={handleWinLengthChange} 
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500" 
                    />
                    <div className="bg-yellow-500/5 p-3 rounded-lg border border-yellow-500/10">
                         <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                             Number of consecutive symbols (horizontal, vertical, diagonal) required to win.
                        </p>
                    </div>
                </div>
            </div>
            
            {/* New Game Rules Section */}
            <div className="space-y-4 pt-6 border-t border-white/5">
                <h3 className="font-bold text-gray-600 dark:text-gray-300 text-sm uppercase tracking-wider mb-2">Game Rules</h3>
                
                {/* Starting Player */}
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Starting Player</label>
                    <div className="flex bg-black/20 p-1 rounded-lg border border-white/10">
                        {(['X', 'random', 'O'] as const).map((opt) => (
                            <button
                                key={opt}
                                onClick={() => setSettings(s => ({ ...s, startingPlayer: opt }))}
                                className={`flex-1 py-2 rounded-md text-xs font-bold uppercase transition-all ${
                                    settings.startingPlayer === opt 
                                        ? 'bg-white/10 text-white shadow-sm' 
                                        : 'text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                {opt === 'random' ? 'Random (?)' : `Player ${opt}`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Turn Duration (Only if Blitz is off) */}
                {!settings.blitzMode && (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-gray-500 uppercase">Turn Timer</span>
                            <span className="font-mono font-bold text-blue-400">{settings.turnDuration || 30}s</span>
                        </div>
                        <input 
                            type="range" 
                            min="5" 
                            max="60" 
                            step="5"
                            value={settings.turnDuration || 30} 
                            onChange={handleTurnDurationChange} 
                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                        />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 pt-6 border-t border-white/5">
                <h3 className="font-bold text-gray-600 dark:text-gray-300 text-sm uppercase tracking-wider mb-2">Modifiers</h3>

                {/* Obstacles Toggle */}
                <label className={`relative flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer
                    ${settings.obstacles 
                        ? 'bg-orange-500/10 border-orange-500/30' 
                        : 'bg-white/5 border-transparent hover:bg-white/10'
                    }`}
                >
                    <div className={`p-2 rounded-full mt-1 ${settings.obstacles ? 'bg-orange-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                        <ObstacleIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                         <div className="flex justify-between">
                             <div className="font-bold text-sm">Obstacles</div>
                            <input 
                                type="checkbox" 
                                checked={settings.obstacles} 
                                onChange={e => setSettings(s => ({...s, obstacles: e.target.checked}))} 
                                className="w-5 h-5 accent-orange-500" 
                            />
                         </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-1">
                            Randomly places unplayable blocks on the board to disrupt standard strategies.
                        </p>
                    </div>
                </label>

                {/* Power Ups Toggle */}
                <label className={`relative flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer
                    ${settings.powerUps !== false 
                        ? 'bg-blue-500/10 border-blue-500/30' 
                        : 'bg-white/5 border-transparent hover:bg-white/10'
                    }`}
                >
                    <div className={`p-2 rounded-full mt-1 ${settings.powerUps !== false ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                        <SwordIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                         <div className="flex justify-between">
                             <div className="font-bold text-sm">Enable Power-Ups</div>
                            <input 
                                type="checkbox" 
                                checked={settings.powerUps !== false} 
                                onChange={e => setSettings(s => ({...s, powerUps: e.target.checked}))} 
                                className="w-5 h-5 accent-blue-500" 
                            />
                         </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-1">
                            Allow usage of purchased items like Undo, Destroy, and Fortify. Disable for a pure skill match.
                        </p>
                    </div>
                </label>

                {/* Misere Toggle */}
                <label className={`relative flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer
                    ${settings.variant === GameVariant.MISERE 
                        ? 'bg-purple-500/10 border-purple-500/30' 
                        : 'bg-white/5 border-transparent hover:bg-white/10'
                    }`}
                >
                    <div className={`p-2 rounded-full mt-1 ${settings.variant === GameVariant.MISERE ? 'bg-purple-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                        <SkullIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between">
                            <div className="font-bold text-sm">Misère Mode</div>
                             <input 
                                type="checkbox" 
                                checked={settings.variant === GameVariant.MISERE} 
                                onChange={e => setSettings(s => ({...s, variant: e.target.checked ? GameVariant.MISERE : GameVariant.CLASSIC}))} 
                                className="w-5 h-5 accent-purple-500" 
                            />
                        </div>
                         <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-1">
                            Inverted rules: The player who completes a line of {settings.winLength} <span className="font-bold text-purple-400">LOSES</span>. Force your opponent to win!
                        </p>
                    </div>
                </label>
                
                 {/* Blitz Mode Toggle */}
                 <div className={`rounded-xl border transition-all overflow-hidden ${settings.blitzMode ? 'bg-red-500/5 border-red-500/30' : 'bg-white/5 border-transparent'}`}>
                    <label className="flex items-start gap-4 p-4 cursor-pointer hover:bg-white/5 transition-colors">
                        <div className={`p-2 rounded-full mt-1 ${settings.blitzMode ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                            <ClockIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between">
                                <div className="font-bold text-sm">Blitz Mode (Online Only)</div>
                                <input 
                                    type="checkbox" 
                                    checked={!!settings.blitzMode} 
                                    onChange={e => setSettings(s => ({
                                        ...s, 
                                        blitzMode: e.target.checked,
                                        blitzDuration: e.target.checked ? 180 : undefined 
                                    }))} 
                                    className="w-5 h-5 accent-red-500" 
                                />
                            </div>
                             <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-1">
                                Fast-paced chess clock style. You have a total time bank. If it runs out, you lose immediately.
                            </p>
                        </div>
                    </label>
                    
                    {settings.blitzMode && (
                        <div className="px-4 pb-4 pt-0 animate-fade-in">
                             <div className="flex justify-between items-center text-xs mb-2 pt-3 border-t border-red-500/10">
                                <span className="font-medium text-gray-500">Total Time Per Player</span>
                                <span className="font-mono text-red-400 font-bold text-sm">{Math.floor((settings.blitzDuration || 180)/60)}m {(settings.blitzDuration || 180)%60}s</span>
                            </div>
                             <input 
                                type="range" 
                                min="30" 
                                max="600" 
                                step="30"
                                value={settings.blitzDuration || 180} 
                                onChange={handleBlitzDurationChange} 
                                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500" 
                            />
                        </div>
                    )}
                 </div>
            </div>
        </div>
    );
};

export default GameSettingsEditor;
