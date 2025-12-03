
import React, { useState } from 'react';
import Modal from './Modal';
import GameSettingsEditor from './GameSettingsEditor';
import { GameSettings, GameVariant, Difficulty } from '../types';
import { SwordIcon, CloseIcon } from './Icons';

interface MatchSetupModalProps {
    onClose: () => void;
    onConfirm: (settings: GameSettings) => void;
    opponentName: string;
}

const defaultSettings: GameSettings = {
    boardSize: 3,
    winLength: 3,
    obstacles: false,
    variant: GameVariant.CLASSIC,
    difficulty: Difficulty.MEDIUM, 
};

const MatchSetupModal: React.FC<MatchSetupModalProps> = ({ onClose, onConfirm, opponentName }) => {
    const [settings, setSettings] = useState<GameSettings>(defaultSettings);

    return (
        <Modal onClose={onClose} className="max-w-xl">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <SwordIcon className="w-6 h-6 text-cyan-400" /> Challenge {opponentName}
                    </h2>
                    <p className="text-sm text-gray-400">Configure match rules</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <CloseIcon className="w-5 h-5 text-gray-400" />
                </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 mb-6">
                <GameSettingsEditor settings={settings} setSettings={setSettings} />
            </div>

            <div className="flex gap-4 pt-4 border-t border-white/10">
                <button 
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl font-bold text-gray-400 hover:bg-white/5 transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={() => onConfirm(settings)}
                    className="flex-[2] py-3 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
                >
                    <SwordIcon className="w-5 h-5" /> Send Invite
                </button>
            </div>
        </Modal>
    );
};

export default MatchSetupModal;
