import express from 'express';
import {
    listRescueTeams,
    createRescueTeam,
    dispatchRescueTeam,
    deleteRescueTeam,
    listShelters,
    createShelter,
    updateShelterOccupancy,
    deleteShelter,
    listDistributions,
    createDistribution,
    getOperationalSummary,
} from '../controllers/emergencyResponseController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── All routes require a valid JWT ──
router.use(protect);

// ── Operational Summary ──
router.get('/summary', authorizeRoles('DMC_OFFICER', 'ADMIN'), getOperationalSummary);

// ── Rescue Teams ──
router.get('/rescue-teams', authorizeRoles('DMC_OFFICER', 'ADMIN'), listRescueTeams);
router.post('/rescue-teams', authorizeRoles('DMC_OFFICER', 'ADMIN'), createRescueTeam);
router.patch('/rescue-teams/:id/dispatch', authorizeRoles('DMC_OFFICER', 'ADMIN'), dispatchRescueTeam);
router.delete('/rescue-teams/:id', authorizeRoles('DMC_OFFICER', 'ADMIN'), deleteRescueTeam);

// ── Emergency Shelters ──
router.get('/shelters', authorizeRoles('DMC_OFFICER', 'ADMIN'), listShelters);
router.post('/shelters', authorizeRoles('DMC_OFFICER', 'ADMIN'), createShelter);
router.patch('/shelters/:id/occupancy', authorizeRoles('DMC_OFFICER', 'ADMIN'), updateShelterOccupancy);
router.delete('/shelters/:id', authorizeRoles('DMC_OFFICER', 'ADMIN'), deleteShelter);

// ── Relief Distribution ──
router.get('/distributions', authorizeRoles('DMC_OFFICER', 'ADMIN'), listDistributions);
router.post('/distributions', authorizeRoles('DMC_OFFICER', 'ADMIN'), createDistribution);

export default router;
