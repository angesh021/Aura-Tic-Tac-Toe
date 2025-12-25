
import { User } from '../types';

/**
 * Excludes specific keys from a user object to prevent sensitive data leakage.
 * @param user The user object (Prisma result)
 * @param keys Array of keys to exclude (e.g., passwordHash)
 */
export function exclude<User, Key extends keyof User>(user: User, keys: Key[]): Omit<User, Key> {
  return Object.fromEntries(
    Object.entries(user as Record<string, any>).filter(([key]) => !keys.includes(key as Key))
  ) as Omit<User, Key>;
}

/**
 * Safely extracts quest data from the User object, handling potential nulls or malformed JSON.
 * @param user The user object
 */
export const getQuestData = (user: any): any => {
    if (!user) return {};
    return (user.questData && typeof user.questData === 'object') ? user.questData : {};
};

/**
 * Extracts only public-safe quest data (like frames and prestige level)
 * to be sent to other clients (e.g., in leaderboards or friend lists).
 * @param user The user object
 */
export const getPublicQuestData = (user: any) => {
    const qData = getQuestData(user);
    return {
        equippedFrame: qData.equippedFrame,
        prestigeLevel: qData.prestigeLevel
    };
};
