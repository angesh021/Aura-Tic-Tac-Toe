
import React from 'react';
import { useGameStore } from '../stores/gameStore';
import { onlineService } from '../services/online';
import WagerConfirmation from './WagerConfirmation';
import Modal from './Modal';

interface GlobalWagerModalProps {
    currentUserId: string;
    onClose: () => void;
}

const GlobalWagerModal: React.FC<GlobalWagerModalProps> = ({ currentUserId, onClose }) => {
    // Only subscribe to the specific parts of the room needed, or the whole room if it changes infrequently
    // Since this modal only shows during 'confirming_wager', changes to board/chat won't happen often here.
    const room = useGameStore(state => state.room);
    
    // Only render if we are in the correct state
    if (!room || room.status !== 'confirming_wager') return null;

    return (
        <Modal onClose={onClose} className="max-w-2xl bg-slate-900/90 backdrop-blur-xl border border-white/10" noPadding>
            <WagerConfirmation
                room={room}
                currentUserId={currentUserId}
                onConfirm={() => onlineService.confirmWager(room.id)}
                onCancel={onClose}
            />
        </Modal>
    );
}

export default GlobalWagerModal;
