import { Router } from 'express';
import { 
  syncUser, 
  getUserByClerkId, 
  getAllUsers,
  updateOnboardingStatus,
  checkFullName,
  updateFullName,
  updateUsername,
  settingsData
} from '../controllers/userController';
import { getDashboardData, interviewPageData } from '../controllers/dashboardController';

const router = Router();

// POST /api/users/sync - Create or update user
router.post('/sync', syncUser);

// GET /api/users/clerk/:clerkId - Get user by Clerk ID
router.get('/clerk/:clerkId', getUserByClerkId);

// GET /api/users - Get all users (for testing/admin)
router.get('/', getAllUsers);

// PATCH /api/users/clerk/:clerkId/onboarding - Update onboarding status
router.patch('/clerk/:clerkId/onboarding', updateOnboardingStatus);

// POST /api/users/check-fullname - Check if user has fullName
router.post('/check-fullname', checkFullName);

// POST /api/users/update-fullname - Update user's full name
router.post('/update-fullname', updateFullName);

// GET /api/users/dashboard/:userId - Get user dashboard data
router.get('/dash/:userId', getDashboardData);

// POST /api/users/update-username - Update user's username
router.post('/update-username', updateUsername);

// GET /api/users/settings - Get user settings
router.get('/settings/:id', settingsData);

// GET /api/users/interview/:id - Get user interview data
router.get('/interview-page/:id', interviewPageData);

export default router;
