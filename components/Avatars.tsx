
import React, { useContext } from 'react';
import AvatarFrame from './AvatarFrame';
import { AuthContext } from '../contexts/AuthContext'; // Optional, if we want auto-frame
// We'll pass frameId explicitly usually, or rely on caller to pass it. 
// However, to make it seamless, let's keep it simple: UserAvatar just renders the SVG.
// We will wrap UserAvatar with AvatarFrame in key locations, or allow passing frameId here.

interface AvatarProps {
    className?: string;
}

const Strategist: React.FC<AvatarProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" fill="#1e293b" />
        <path d="M50 25v25M25 50h50" stroke="#06b6d4" strokeWidth="4" strokeLinecap="round" />
        <rect x="35" y="35" width="30" height="30" rx="4" stroke="#06b6d4" strokeWidth="4" />
        <circle cx="50" cy="50" r="6" fill="#ec4899" />
    </svg>
);

const Maverick: React.FC<AvatarProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" fill="#312e81" />
        <path d="M30 65L40 40L50 60L60 35L75 65" stroke="#f472b6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="40" cy="40" r="3" fill="#22d3ee" />
        <circle cx="60" cy="35" r="3" fill="#22d3ee" />
    </svg>
);

const Guardian: React.FC<AvatarProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" fill="#14532d" />
        <path d="M50 20v60" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" />
        <path d="M25 50c0 13.807 11.193 25 25 25s25-11.193 25-25" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" />
        <circle cx="50" cy="40" r="8" fill="#fff" />
    </svg>
);

const Visionary: React.FC<AvatarProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" fill="#4c1d95" />
        <circle cx="50" cy="50" r="20" stroke="#c084fc" strokeWidth="4" />
        <circle cx="50" cy="50" r="10" fill="#22d3ee" />
        <path d="M50 20v10M50 70v10M20 50h10M70 50h10" stroke="#c084fc" strokeWidth="4" strokeLinecap="round" />
    </svg>
);

const Catalyst: React.FC<AvatarProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" fill="#7c2d12" />
        <path d="M35 65c0-15 15-25 15-40 0 15 15 25 15 40" stroke="#fb923c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="50" cy="55" r="5" fill="#fff" />
    </svg>
);

const Cyber: React.FC<AvatarProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="80" height="80" rx="20" fill="#111827" />
        <rect x="30" y="40" width="15" height="5" fill="#22d3ee" />
        <rect x="55" y="40" width="15" height="5" fill="#22d3ee" />
        <path d="M30 60h40" stroke="#ec4899" strokeWidth="4" strokeLinecap="round" />
    </svg>
);

const Zen: React.FC<AvatarProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" fill="#0f766e" />
        <path d="M30 50a20 20 0 0 0 40 0" stroke="#ccfbf1" strokeWidth="4" strokeLinecap="round" />
        <path d="M30 40h10M60 40h10" stroke="#ccfbf1" strokeWidth="4" strokeLinecap="round" />
    </svg>
);

const Enigma: React.FC<AvatarProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" fill="#000" />
        <path d="M35 35L65 65M65 35L35 65" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        <circle cx="50" cy="50" r="42" stroke="#6366f1" strokeWidth="2" />
    </svg>
);

const Ghost: React.FC<AvatarProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" fill="#4b5563" opacity="0.5" />
        <path d="M30 70c0-15 10-25 20-25s20 10 20 25" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        <circle cx="40" cy="40" r="4" fill="#fff" />
        <circle cx="60" cy="40" r="4" fill="#fff" />
    </svg>
);

const King: React.FC<AvatarProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" fill="#fcd34d" />
        <path d="M30 45L40 30L50 45L60 30L70 45V65H30V45Z" fill="#fbbf24" stroke="#b45309" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="40" cy="30" r="3" fill="#fff" />
        <circle cx="60" cy="30" r="3" fill="#fff" />
        <circle cx="50" cy="45" r="2" fill="#000" />
    </svg>
);

export const AVATAR_LIST = [
    { id: 'avatar-1', name: 'The Strategist', Component: Strategist },
    { id: 'avatar-2', name: 'The Maverick', Component: Maverick },
    { id: 'avatar-3', name: 'The Guardian', Component: Guardian },
    { id: 'avatar-4', name: 'The Visionary', Component: Visionary },
    { id: 'avatar-5', name: 'The Catalyst', Component: Catalyst },
    { id: 'avatar-6', name: 'The Cyber', Component: Cyber },
    { id: 'avatar-7', name: 'The Zen', Component: Zen },
    { id: 'avatar-8', name: 'The Enigma', Component: Enigma },
    { id: 'avatar-9', name: 'The Ghost', Component: Ghost },
    { id: 'avatar-10', name: 'The King', Component: King },
];

interface UserAvatarProps {
    avatarId: string;
    className?: string;
    frameId?: string; // New Prop
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ avatarId, className, frameId }) => {
    const avatar = AVATAR_LIST.find(a => a.id === avatarId) || AVATAR_LIST[0];
    const Component = avatar.Component;
    
    // If a frame is provided, wrap it
    if (frameId && frameId !== 'frame-none') {
        return (
            <AvatarFrame frameId={frameId} className={className}>
                <Component className="w-full h-full" />
            </AvatarFrame>
        );
    }

    return <Component className={className} />;
};

export const getAvatarName = (id: string) => {
    const avatar = AVATAR_LIST.find(a => a.id === id);
    return avatar ? avatar.name : 'Unknown';
};
        