import express from 'express';
import {
    getOperationalReportHandler,
    exportOperationalReportHandler,
} from '../controllers/postEventAnalysisController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get(
    '/operational-report',
    protect,
    authorizeRoles('DMC_OFFICER', 'ADMIN'),
    getOperationalReportHandler
);

router.get(
    '/export',
    protect,
    authorizeRoles('DMC_OFFICER', 'ADMIN'),
    exportOperationalReportHandler
);

export default router;
