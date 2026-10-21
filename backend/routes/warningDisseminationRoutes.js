import express from 'express';
import deliveryMonitoringController from '../controllers/deliveryMonitoringController.js';
import { protect } from '../middleware/authMiddleware.js'; // Replace with your actual path if needed

const router = express.Router();

// Real-time delivery dashboard monitoring (Protected)
router.get('/:id/delivery-status', protect, deliveryMonitoringController.getDeliveryStatus);

// Delivery retry for failed channels (Protected)
router.post('/:id/retry-failed', protect, deliveryMonitoringController.retryFailedDeliveries);

// Warning escalation and redistribution (Protected)
router.post('/:id/escalate', protect, deliveryMonitoringController.escalateWarning);

export default router;