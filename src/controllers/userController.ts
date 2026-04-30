import { Request, Response } from 'express';
import { db } from '../core/db';
import { users } from '../drizzle/user/user';
import { userStats } from '../drizzle/user/userStats';
import { subscriptions } from '../drizzle/user/subscription';
import { eq } from 'drizzle-orm';

// Validation helper
const validateUserData = (clerkId: string, username: string, email: string): string | null => {
    if (!clerkId || typeof clerkId !== 'string' || clerkId.trim() === '') {
        return 'Clerk ID is required and must be a valid string';
    }

    if (!username || typeof username !== 'string' || username.trim() === '') {
        return 'Username is required and must be a valid string';
    }

    if (username.length < 3 || username.length > 100) {
        return 'Username must be between 3 and 100 characters';
    }

    if (!email || typeof email !== 'string' || email.trim() === '') {
        return 'Email is required and must be a valid string';
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return 'Invalid email format';
    }

    return null;
};

// Sync user with backend (create or update)
export const syncUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { clerkUserId, username, email, profileImage } = req.body;

        // Validate input
        const validationError = validateUserData(clerkUserId, username, email);
        if (validationError) {
            res.status(400).json({
                success: false,
                error: validationError
            });
            return;
        }

        // Check if user already exists by clerkId
        const existingUsers = await db
            .select()
            .from(users)
            .where(eq(users.clerkId, clerkUserId.trim()));

        if (existingUsers.length > 0) {
            // Update existing user
            // NOTE: don't overwrite the username on every sync. Username can be edited
            // from the app Settings and should not be reverted by a background sync
            // from the Clerk profile. We still update email, profileImage and timestamps.
            const updatedUser = await db
                .update(users)
                .set({
                    email: email.trim().toLowerCase(),
                    profileImage: profileImage || null,
                    lastLoginAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(users.clerkId, clerkUserId.trim()))
                .returning();

            if(!updatedUser[0]) {
                throw new Error("No updated user found")
            }


            console.log('Updated user:', updatedUser[0])

            res.status(200).json({
                success: true,
                message: 'User updated successfully',
                user: {
                    id: updatedUser[0].id,
                    clerkId: updatedUser[0].clerkId,
                    username: updatedUser[0].username,
                    email: updatedUser[0].email,
                    profileImage: updatedUser[0].profileImage,
                    role: updatedUser[0].role,
                    isOnboarded: updatedUser[0].isOnboarded,
                },
            });
        } else {
            // Check if email already exists
            const existingEmail = await db
                .select()
                .from(users)
                .where(eq(users.email, email.trim().toLowerCase()));

            if (existingEmail.length > 0) {
                res.status(409).json({
                    success: false,
                    error: 'Email already registered',
                });
                return;
            }

            // Create new user
            const newUser = await db
                .insert(users)
                .values({
                    clerkId: clerkUserId.trim(),
                    username: username.trim(),
                    email: email.trim().toLowerCase(),
                    profileImage: profileImage || null,
                    role: 'USER',
                    isOnboarded: false,
                    lastLoginAt: new Date(),
                })
                .returning();

            if(!newUser[0]) {
                throw new Error("No new User found")
            }

            // Create user stats
            await db.insert(userStats).values({
                userId: newUser[0].id,
                trialsRemaining: 2,
                interviewsTaken: 0,
                dsaInterviewsTaken: 0,
                resumeInterviewsTaken: 0,
                aiTokensUsed: 0,
            });

            // Create free subscription
            await db.insert(subscriptions).values({
                userId: newUser[0].id,
                plan: 'FREE',
                status: 'ACTIVE',
            });

            res.status(201).json({
                success: true,
                message: 'User created successfully',
                user: {
                    id: newUser[0].id,
                    clerkId: newUser[0].clerkId,
                    username: newUser[0].username,
                    email: newUser[0].email,
                    profileImage: newUser[0].profileImage,
                    role: newUser[0].role,
                    isOnboarded: newUser[0].isOnboarded,
                },
            });
        }
    } catch (error) {
        console.error('Error syncing user:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};

// Get user by Clerk ID
export const getUserByClerkId = async (req: Request, res: Response): Promise<void> => {
    try {
        const { clerkId } = req.params;

        if (!clerkId) {
            res.status(400).json({
                success: false,
                error: 'Clerk ID is required',
            });
            return;
        }

        if(typeof clerkId !== 'string' || clerkId.trim() === '')
        {
            res.status(400).json({
                success: false,
                error: 'Clerk ID must be a non-empty string',
            });
            return;
        }

        const userResult = await db
            .select()
            .from(users)
            .where(eq(users.clerkId, clerkId));

        if (userResult.length === 0) {
            res.status(404).json({
                success: false,
                error: 'User not found',
            });
            return;
        }

        const user = userResult[0];

        if(!user) {
            throw new Error("No user found!")
        }

        // Get user stats
        const statsResult = await db
            .select()
            .from(userStats)
            .where(eq(userStats.userId, user.id));

        // Get subscription
        const subscriptionResult = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.userId, user.id));

        res.status(200).json({
            success: true,
            user: {
                id: user.id,
                clerkId: user.clerkId,
                username: user.username,
                email: user.email,
                profileImage: user.profileImage,
                role: user.role,
                isOnboarded: user.isOnboarded,
                stats: statsResult[0] || null,
                subscription: subscriptionResult[0] || null,
            },
        });
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};

// Get all users (for testing/admin purposes)
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const allUsers = await db.select().from(users);

        res.status(200).json({
            success: true,
            count: allUsers.length,
            users: allUsers.map(user => ({
                id: user.id,
                clerkId: user.clerkId,
                username: user.username,
                email: user.email,
                role: user.role,
                isOnboarded: user.isOnboarded,
                createdAt: user.createdAt,
            })),
        });
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};

// Update user onboarding status
export const updateOnboardingStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { clerkId } = req.params;
        const { isOnboarded } = req.body;

        if (!clerkId) {
            res.status(400).json({
                success: false, 
                error: 'Clerk ID is required',
            });
            return;
        }

        if(typeof clerkId !== 'string' || clerkId.trim() === '')
        {
            res.status(400).json({
                success: false,
                error: 'Clerk ID must be a non-empty string',
            });
            return;
        }

        if (typeof isOnboarded !== 'boolean') {
            res.status(400).json({
                success: false,
                error: 'isOnboarded must be a boolean',
            });
            return;
        }

        const updatedUser = await db
            .update(users)
            .set({
                isOnboarded,
                updatedAt: new Date(),
            })
            .where(eq(users.clerkId, clerkId))
            .returning();

        if (updatedUser.length === 0 || !updatedUser[0]) {
            res.status(404).json({
                success: false,
                error: 'User not found',
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Onboarding status updated successfully',
            user: {
                id: updatedUser[0].id,
                clerkId: updatedUser[0].clerkId,
                isOnboarded: updatedUser[0].isOnboarded,
            },
        });
    } catch (error) {
        console.error('Error updating onboarding status:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};

// Check if user has fullName
export const checkFullName = async (req: Request, res: Response): Promise<void> => {
    try {
        const { clerkUserId } = req.body;

        if (!clerkUserId || typeof clerkUserId !== 'string' || clerkUserId.trim() === '') {
            res.status(400).json({
                success: false,
                error: 'Clerk User ID is required',
            });
            return;
        }

        const userResult = await db
            .select()
            .from(users)
            .where(eq(users.clerkId, clerkUserId.trim()));

        if (userResult.length === 0 || !userResult[0]) {
            res.status(404).json({
                success: false,
                error: 'User not found',
            });
            return;
        }

        const user = userResult[0];
        const fullNameAvailable = !!(user.fullname && user.fullname.trim().length > 0);

        res.status(200).json({
            success: true,
            fullNameAvailable,
        });
    } catch (error) {
        console.error('Error checking full name:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};

// Update user's full name
export const updateFullName = async (req: Request, res: Response): Promise<void> => {
    try {
        const { clerkUserId, fullName } = req.body;

        if (!clerkUserId || typeof clerkUserId !== 'string' || clerkUserId.trim() === '') {
            res.status(400).json({
                success: false,
                error: 'Clerk User ID is required',
            });
            return;
        }

        if (!fullName || typeof fullName !== 'string' || fullName.trim() === '') {
            res.status(400).json({
                success: false,
                error: 'Full name is required',
            });
            return;
        }

        if (fullName.trim().length < 2) {
            res.status(400).json({
                success: false,
                error: 'Full name must be at least 2 characters',
            });
            return;
        }

        const updatedUser = await db
            .update(users)
            .set({
                fullname: fullName.trim(),
                updatedAt: new Date(),
            })
            .where(eq(users.clerkId, clerkUserId.trim()))
            .returning();

        if (updatedUser.length === 0 || !updatedUser[0]) {
            res.status(404).json({
                success: false,
                error: 'User not found',
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Full name updated successfully',
            user: {
                id: updatedUser[0].id,
                clerkId: updatedUser[0].clerkId,
                fullname: updatedUser[0].fullname,
            },
        });
    } catch (error) {
        console.error('Error updating full name:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};


export const updateUsername = async (req: Request, res: Response): Promise<void> => {
    try {
        const { clerkUserId, username } = req.body;

        if (!clerkUserId || typeof clerkUserId !== 'string' || clerkUserId.trim() === '') {
            res.status(400).json({
                success: false,
                error: 'Clerk User ID is required',
            });
            return;
        }

        if (!username || typeof username !== 'string' || username.trim() === '') {
            res.status(400).json({
                success: false,
                error: 'Username is required',
            });
            return;
        }

        if (username.trim().length < 2) {
            res.status(400).json({
                success: false,
                error: 'Username must be at least 2 characters',
            });
            return;
        }

        // check if username already exists in the database
        const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.username, username.trim()))
            .limit(1);

        if (existingUser.length > 0) {
            res.status(400).json({
                success: false,
                error: 'Username already exists',
            });
            return;
        }

        const updatedUser = await db
            .update(users)
            .set({
                username: username.trim(),
                updatedAt: new Date(),
            })
            .where(eq(users.clerkId, clerkUserId.trim()))
            .returning();

        if (updatedUser.length === 0 || !updatedUser[0]) {
            res.status(404).json({
                success: false,
                error: 'User not found',
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Username updated successfully',
            user: {
                id: updatedUser[0].id,
                clerkId: updatedUser[0].clerkId,
                username: updatedUser[0].username,
            },
        });
    } catch (error) {
        console.error('Error updating username:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};

export const settingsData = async (req: Request, res: Response): Promise<void> => {
    try {
        const clerkUserId = req.params?.id;

        if (!clerkUserId || typeof clerkUserId !== 'string' || clerkUserId.trim() === '') {
            res.status(400).json({
                success: false,
                error: 'Clerk User ID is required',
            });
            return;
        }

        const user = await db
            .select()
            .from(users)
            .where(eq(users.clerkId, clerkUserId.trim()))
            .limit(1);

        if (user.length === 0) {
            res.status(404).json({
                success: false,
                error: 'User not found',
            });
            return;
        }

        const username = user[0]?.username;
        const fullname = user[0]?.fullname || "";
        const email = user[0]?.email;
        const profileImage = user[0]?.profileImage || "";

        res.status(200).json({
            success: true,
            user: {
                username,
                fullname,
                email,
                profileImage,
            },
        });
    } catch (error) {
        console.error('Error fetching user settings:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};