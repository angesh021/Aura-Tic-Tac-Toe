
export const getPersonalizedGreeting = (name: string): string => {
    const date = new Date();
    const hour = date.getHours();
    const month = date.getMonth(); // 0-11
    const day = date.getDate();

    // Festivals & Special Dates
    if (month === 0 && day === 1) return `Happy New Year, ${name}! 🎉`;
    if (month === 1 && day === 14) return `Happy Valentine's, ${name}! 💖`;
    if (month === 9 && day === 31) return `Happy Halloween, ${name}! 🎃`;
    if (month === 11 && day === 25) return `Merry Christmas, ${name}! 🎄`;
    if (month === 11 && day === 31) return `Happy New Year's Eve, ${name}! 🥂`;

    // Seasons (Northern Hemisphere roughly)
    let seasonEmoji = '';
    if (month >= 11 || month <= 1) seasonEmoji = '❄️'; // Winter
    else if (month >= 2 && month <= 4) seasonEmoji = '🌸'; // Spring
    else if (month >= 5 && month <= 7) seasonEmoji = '☀️'; // Summer
    else if (month >= 8 && month <= 10) seasonEmoji = '🍂'; // Autumn

    // Time of Day
    let timeGreeting = '';
    if (hour < 12) timeGreeting = 'Good Morning';
    else if (hour < 18) timeGreeting = 'Good Afternoon';
    else timeGreeting = 'Good Evening';

    return `${timeGreeting}, ${name} ${seasonEmoji}`;
};
