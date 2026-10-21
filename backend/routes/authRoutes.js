import express from 'express';
import { registerCitizen, loginCitizen, getMe } from '../controllers/authController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public Auth Endpoints
router.post('/citizen/register', registerCitizen);
router.post('/citizen/login', loginCitizen);
router.post('/register', registerCitizen);
router.post('/login', loginCitizen);

// Protected Auth Verification Endpoint
router.get('/citizen/me', protect, authorizeRoles('CITIZEN'), getMe);

export default router;