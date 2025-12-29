
const MESSAGES = {
    MORNING: [
        "Rise and shine, {name}! ☀️",
        "Ready to conquer the grid, {name}? ☕",
        "Top of the morning to you, {name}! 🥐",
        "Coffee first, then victory, {name}? ☕",
        "Let's start this day with a win, {name}! 🌅",
        "Wakey wakey, {name}! The arena awaits.",
        "New day, new strategies, {name}.",
        "Hope you slept well, {name}! Ready to play?",
        "Carpe Diem, {name}! Seize the board.",
        "Morning glory awaits you, {name}. 🌻"
    ],
    AFTERNOON: [
        "Good afternoon, {name}! ☀️",
        "Powering through the day, {name}? 🔋",
        "Perfect time for a quick match, {name}! 🕛",
        "Keep that energy up, {name}! ⚡",
        "Hope your day is going great, {name}! 🚀",
        "Lunch break victory, {name}?",
        "The afternoon slump doesn't apply to you, {name}!",
        "Sun's out, {name}'s out to win.",
        "Halfway through the day, {name}! Stay sharp.",
        "Afternoon delight: A win for {name}. 🍰"
    ],
    EVENING: [
        "Good evening, {name}! 🌙",
        "Time to unwind and win, {name}. 🍷",
        "The arena awaits you, {name}. ⚔️",
        "Ending the day strong, {name}? 💪",
        "Relax and strategize, {name}. 🌌",
        "Dinner and a duel, {name}?",
        "Twilight tactics with {name}.",
        "Wrap up the day with a W, {name}.",
        "The night is young, {name}. Let's play.",
        "Chill vibes and tic-tac-toe, {name}. 🎧"
    ],
    LATE_NIGHT: [
        "Burning the midnight oil, {name}? 🦉",
        "Late night grinding, {name}! 🌑",
        "Sleep is for the weak, right {name}? 😴",
        "The stars are watching your moves, {name}. ✨",
        "Up late for one more win, {name}? 🎮",
        "Night owl mode: Activated, {name}.",
        "Silence in the world, chaos on the board, {name}.",
        "Past your bedtime, {name}? Let's play anyway.",
        "Midnight madness with {name}. 👻",
        "Dreaming of victory, {name}? Make it real."
    ],
    MONDAY: [
        "Happy Monday, {name}! Let's crush it. 👊",
        "New week, new wins, {name}! 📅",
        "Monday blues? Nothing a win can't fix, {name}. 💙",
        "Start the week strong, {name}!",
        "Make this Monday legendary, {name}."
    ],
    FRIDAY: [
        "It's Friday, {name}! Party time? 🎉",
        "Weekend mode: ACTIVATED for {name}. 🚀",
        "Happy Friday, {name}! Let's play. 🕹️",
        "Friyay vibes with {name}!",
        "Slide into the weekend with a win, {name}."
    ],
    WEEKEND: [
        "Happy Weekend, {name}! 🌴",
        "Saturday vibes in the arena, {name}. 🕶️",
        "Sunday strategy session, {name}? 🧠",
        "Relaxing weekend gaming, {name}?",
        "Weekend warrior {name} reporting for duty!",
        "Saturdays are for the boys (and girls), {name}. 👾",
        "Easy like Sunday morning, {name}. ☕"
    ],
    RETURN: [
        "Back for more, {name}? 😎",
        "You couldn't stay away, {name}! Welcome back. 💖",
        "Round 2? Let's go, {name}! 🥊",
        "The grid missed you, {name}. 👋",
        "Can't stop, won't stop, {name}! 🚀",
        "Welcome back, {name}! Ready to streak? 🔥",
        "Addicted to the win, {name}?",
        "Good to see you again so soon, {name}.",
        "Reloading for another match, {name}. 🔄",
        "The return of the king (or queen), {name}! 👑"
    ],
    GENERIC: [
        "Ready to dominate, {name}? 👑",
        "Your move, {name}. 🎲",
        "Let's make some magic happen, {name}. ✨",
        "May the Aura be with you, {name}. 🔮",
        "Focus. Speed. Victory. You got this, {name}. 🦅",
        "Show them what you've got, {name}!",
        "The board is yours, {name}.",
        "Aura levels rising, {name}. 📈",
        "Time to shine, {name}. 💎",
        "Legend status loading for {name}... ⏳"
    ]
};

const getRandomMsg = (arr: string[], name: string) => {
    const template = arr[Math.floor(Math.random() * arr.length)];
    return template.replace('{name}', name);
};

export const getPersonalizedGreeting = (name: string, lastVisitIso?: string): string => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday...
    const todayStr = now.toDateString();
    
    let isSameDayReturn = false;
    if (lastVisitIso) {
        const last = new Date(lastVisitIso);
        isSameDayReturn = last.toDateString() === todayStr;
    }

    // 1. Chance for "Welcome Back" message if returning same day (60% chance)
    if (isSameDayReturn && Math.random() > 0.4) {
        return getRandomMsg(MESSAGES.RETURN, name);
    }

    // 2. Specific Day Checks
    if (day === 1 && Math.random() > 0.5) return getRandomMsg(MESSAGES.MONDAY, name);
    if (day === 5 && Math.random() > 0.5) return getRandomMsg(MESSAGES.FRIDAY, name);
    if ((day === 0 || day === 6) && Math.random() > 0.5) return getRandomMsg(MESSAGES.WEEKEND, name);

    // 3. Time of Day Checks
    if (hour >= 23 || hour < 5) return getRandomMsg(MESSAGES.LATE_NIGHT, name);
    if (hour < 12) return getRandomMsg(MESSAGES.MORNING, name);
    if (hour < 18) return getRandomMsg(MESSAGES.AFTERNOON, name);
    if (hour >= 18) return getRandomMsg(MESSAGES.EVENING, name);

    // 4. Fallback
    return getRandomMsg(MESSAGES.GENERIC, name);
};
