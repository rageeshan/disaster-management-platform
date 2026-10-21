import ReportCluster from '../models/ReportCluster.js';
import HazardReport from '../models/HazardReport.js';

// @desc    Get pending hazard clusters for DMC Officers
// @route   GET /api/v1/reports/verification/clusters
// @access  Private (DMC_OFFICER, ADMIN)
export const getPendingClusters = async (req, res) => {
    try {
        const { district, hazardType, status, sort = 'confidenceScore', order = 'desc' } = req.query;

        // Include FLAGGED clusters by default so supervisors can review escalated items
        const filter = {
            status: status
                ? status
                : { $in: ['PENDING', 'PENDING_VERIFICATION', 'IN_REVIEW', 'UNDER_VERIFICATION', 'FLAGGED'] }
        };

        if (district) filter.district = district;
        if (hazardType && hazardType !== 'ALL') filter.hazardType = hazardType;

        const sortOrder = order === 'asc' ? 1 : -1;
        const sortOptions = {};
        sortOptions[sort] = sortOrder;
        if (sort !== 'createdAt') sortOptions['createdAt'] = -1;

        const clusters = await ReportCluster.find(filter)
            .populate({
                path: 'reports',
                populate: { path: 'reporter', select: 'fullName nic phoneNumber userType' },
            })
            .sort(sortOptions);

        res.status(200).json({
            success: true,
            count: clusters.length,
            data: clusters,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Acquire operational lock on a cluster (Concurrency Control)
// @route   POST /api/v1/reports/verification/clusters/:id/lock
// @access  Private (DMC_OFFICER, ADMIN)
export const lockCluster = async (req, res) => {
    try {
        const clusterId = req.params.id;
        const officerId = req.user.id;

        const cluster = await ReportCluster.findById(clusterId);
        if (!cluster) {
            return res.status(404).json({ success: false, message: 'Cluster not found' });
        }

        // Check if locked by another active officer session (Exception Flow E1)[cite: 3, 6, 7]
        const now = new Date();
        if (
            cluster.lockedBy &&
            cluster.lockedBy.toString() !== officerId &&
            cluster.lockExpiresAt > now
        ) {
            return res.status(409).json({
                success: false,
                message: 'This cluster is currently being reviewed by another DMC Officer',
            });
        }

        // Set optimistic lock for 5 minutes[cite: 3, 5, 12]
        cluster.lockedBy = officerId;
        cluster.lockExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
        cluster.status = 'IN_REVIEW';
        await cluster.save();

        res.status(200).json({
            success: true,
            message: 'Operational lock acquired for 5 minutes',
            data: {
                clusterId: cluster._id,
                lockedBy: cluster.lockedBy,
                lockExpiresAt: cluster.lockExpiresAt,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Execute review action on a hazard cluster (VERIFY, REJECT, FLAG, MERGE)
// @route   POST /api/v1/reports/verification/clusters/:id/verify
// @access  Private (DMC_OFFICER, ADMIN)
export const verifyCluster = async (req, res) => {
    try {
        const clusterId = req.params.id;
        const officerId = req.user.id;
        const { action, officerNotes, reasonCode, severityLevel, masterClusterId } = req.body;

        // Supported actions: VERIFY, REJECT, FLAG (Alt A1), MERGE (Alt A2)
        const validActions = ['VERIFY', 'REJECT', 'FLAG', 'MERGE'];
        if (!validActions.includes(action)) {
            return res.status(400).json({
                success: false,
                message: `Invalid action. Must be one of: ${validActions.join(', ')}`,
            });
        }

        const cluster = await ReportCluster.findById(clusterId).populate('reports');
        if (!cluster) {
            return res.status(404).json({ success: false, message: 'Cluster not found' });
        }

        // 1. Lock Ownership Check (Ensures officer holding the lock executes the action)[cite: 5]
        const now = new Date();
        if (
            cluster.lockedBy &&
            cluster.lockedBy.toString() !== officerId &&
            cluster.lockExpiresAt > now
        ) {
            return res.status(423).json({
                success: false,
                message: 'Action blocked: This cluster is currently locked by another DMC officer',
            });
        }

        // Extract report IDs for bulk status updates
        const reportIds = cluster.reports && cluster.reports.length > 0
            ? cluster.reports.map((r) => r._id || r)
            : [];

        // ------------------------------------------------------------------
        // ACTION 1: REJECT (Safety Gate Validation)[cite: 3, 6, 10]
        // ------------------------------------------------------------------
        if (action === 'REJECT') {
            if (!reasonCode || !officerNotes || officerNotes.trim().length < 5) {
                return res.status(400).json({
                    success: false,
                    message: 'Rejection Safety Gate: A valid reasonCode and officerNotes (min 5 characters) are required to reject a report cluster.',
                });
            }

            cluster.status = 'REJECTED';
            cluster.reasonCode = reasonCode;
            cluster.officerNotes = officerNotes;
            cluster.lockedBy = null;
            cluster.lockExpiresAt = null;
            await cluster.save();

            if (reportIds.length > 0) {
                await HazardReport.updateMany(
                    { _id: { $in: reportIds } },
                    { $set: { status: 'REJECTED', rejectionReason: reasonCode } }
                );
            }

            return res.status(200).json({
                success: true,
                message: 'Cluster successfully rejected',
            });
        }

        // ------------------------------------------------------------------
        // ACTION 2: FLAG (Alternate Flow A1 - Senior Escalation)[cite: 9, 11]
        // ------------------------------------------------------------------
        if (action === 'FLAG') {
            if (!officerNotes || officerNotes.trim().length < 5) {
                return res.status(400).json({
                    success: false,
                    message: 'Escalation Safety Gate: Detailed officerNotes (min 5 characters) are required when flagging for senior escalation.',
                });
            }

            cluster.status = 'FLAGGED';
            cluster.officerNotes = officerNotes;
            cluster.lockedBy = null; // Release lock so senior supervisor can review[cite: 9, 11]
            cluster.lockExpiresAt = null;
            await cluster.save();

            if (reportIds.length > 0) {
                await HazardReport.updateMany(
                    { _id: { $in: reportIds } },
                    { $set: { status: 'FLAGGED' } }
                );
            }

            return res.status(200).json({
                success: true,
                message: 'Cluster successfully flagged and routed to Senior Operations Supervisor queue',
            });
        }

        // ------------------------------------------------------------------
        // ACTION 3: MERGE (Alternate Flow A2 - Duplicate Merging)[cite: 9, 11]
        // ------------------------------------------------------------------
        if (action === 'MERGE') {
            if (!masterClusterId) {
                return res.status(400).json({
                    success: false,
                    message: 'Merge Safety Gate: Target masterClusterId is required to merge duplicate clusters.',
                });
            }

            if (masterClusterId.toString() === clusterId.toString()) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid operation: Cannot merge a cluster into itself.',
                });
            }

            const masterCluster = await ReportCluster.findById(masterClusterId);
            if (!masterCluster) {
                return res.status(404).json({ success: false, message: 'Target master cluster not found.' });
            }

            // Transfer underlying reports to target master cluster[cite: 9, 11]
            const existingMasterReportIds = (masterCluster.reports || []).map(r => r.toString());
            reportIds.forEach(id => {
                if (!existingMasterReportIds.includes(id.toString())) {
                    masterCluster.reports.push(id);
                }
            });
            masterCluster.totalReportCount = masterCluster.reports.length;
            await masterCluster.save();

            // Update current cluster to DUPLICATE_MERGED[cite: 9, 11, 13]
            cluster.status = 'DUPLICATE_MERGED';
            cluster.officerNotes = officerNotes || `Merged into master cluster ${masterClusterId}`;
            cluster.lockedBy = null;
            cluster.lockExpiresAt = null;
            await cluster.save();

            if (reportIds.length > 0) {
                await HazardReport.updateMany(
                    { _id: { $in: reportIds } },
                    { $set: { status: 'DUPLICATE_MERGED', masterClusterId: masterClusterId } }
                );
            }

            return res.status(200).json({
                success: true,
                message: 'Cluster successfully merged into primary incident cluster',
            });
        }

        // ------------------------------------------------------------------
        // ACTION 4: VERIFY (Main Flow - Handover Payload for UC-02)[cite: 8, 11]
        // ------------------------------------------------------------------
        cluster.status = 'VERIFIED';
        cluster.officerNotes = officerNotes || cluster.officerNotes;
        cluster.lockedBy = null;
        cluster.lockExpiresAt = null;
        await cluster.save();

        if (reportIds.length > 0) {
            await HazardReport.updateMany(
                { _id: { $in: reportIds } },
                { $set: { status: 'VERIFIED' } }
            );
        }

        // Construct UC-02 Handover Payload[cite: 8, 11]
        const handoverPayload = {
            clusterId: cluster._id,
            action: 'VERIFIED',
            hazardType: cluster.hazardType,
            district: cluster.district,
            centroid: cluster.centroid,
            confidenceScore: cluster.confidenceScore,
            severityLevel: severityLevel || (cluster.confidenceScore >= 6 ? 'CRITICAL' : 'MODERATE'),
            iotVerified: cluster.iotVerified || false,
            matchedSensors: cluster.matchedSensors || [],
            totalReportCount: cluster.reports ? cluster.reports.length : 0,
            verifiedAt: new Date(),
            verifiedByOfficerId: officerId,
            officerNotes: officerNotes || '',
            reasonCode: null,
        };

        return res.status(200).json({
            success: true,
            message: 'Cluster successfully verified', // Fixed double "ed" typo
            handoverPayload,
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};