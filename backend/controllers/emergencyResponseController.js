/**
 * emergencyResponseController.js
 * UC-03 – Coordinate Emergency Response & Resource Deployment
 *
 * Manages: RescueTeams, EmergencyShelters, ReliefDistributions
 */

import RescueTeam from '../models/RescueTeam.js';
import EmergencyShelter from '../models/EmergencyShelter.js';
import ReliefDistribution from '../models/ReliefDistribution.js';

// ─── RESCUE TEAMS ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/emergency/rescue-teams
 * List all rescue teams, optional ?district= & ?status= filters
 */
export const listRescueTeams = async (req, res) => {
    try {
        const filter = {};
        if (req.query.district) filter.district = req.query.district;
        if (req.query.status) filter.status = req.query.status;

        const teams = await RescueTeam.find(filter).sort({ status: 1, name: 1 }).lean();
        return res.status(200).json({ success: true, count: teams.length, data: teams });
    } catch (error) {
        console.error('[EmergencyResponse] listRescueTeams error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/v1/emergency/rescue-teams
 * Register a new rescue team
 */
export const createRescueTeam = async (req, res) => {
    try {
        const {
            name, teamCode, organisation, organisationType,
            district, memberCount, contactNumber, capabilities, notes,
        } = req.body;

        if (!name || !teamCode || !district) {
            return res.status(400).json({
                success: false,
                message: 'name, teamCode, and district are required.',
            });
        }

        const team = await RescueTeam.create({
            name, teamCode, organisation, organisationType,
            district, memberCount, contactNumber, capabilities, notes,
        });
        return res.status(201).json({ success: true, data: team });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: `Team code '${req.body.teamCode}' already exists.`,
            });
        }
        console.error('[EmergencyResponse] createRescueTeam error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PATCH /api/v1/emergency/rescue-teams/:id/dispatch
 * Dispatch a team — sets status to DEPLOYED, records mission and dispatcher
 */
export const dispatchRescueTeam = async (req, res) => {
    try {
        const { id } = req.params;
        const { currentMission, dispatchedBy, status } = req.body;

        const allowedStatuses = ['DEPLOYED', 'ON_ROUTE', 'ON_SCENE', 'RETURNING', 'STANDBY', 'UNAVAILABLE'];
        const newStatus = allowedStatuses.includes(status) ? status : 'DEPLOYED';

        const team = await RescueTeam.findByIdAndUpdate(
            id,
            {
                status: newStatus,
                currentMission: currentMission || '',
                dispatchedBy: dispatchedBy || req.user?.email || 'DMC Officer',
                lastDispatchedAt: newStatus === 'DEPLOYED' || newStatus === 'ON_ROUTE' ? new Date() : undefined,
            },
            { new: true, runValidators: true }
        );

        if (!team) {
            return res.status(404).json({ success: false, message: 'Rescue team not found.' });
        }
        return res.status(200).json({ success: true, data: team });
    } catch (error) {
        console.error('[EmergencyResponse] dispatchRescueTeam error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * DELETE /api/v1/emergency/rescue-teams/:id
 * Remove a rescue team record
 */
export const deleteRescueTeam = async (req, res) => {
    try {
        const team = await RescueTeam.findByIdAndDelete(req.params.id);
        if (!team) {
            return res.status(404).json({ success: false, message: 'Rescue team not found.' });
        }
        return res.status(200).json({ success: true, message: 'Rescue team removed.' });
    } catch (error) {
        console.error('[EmergencyResponse] deleteRescueTeam error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─── EMERGENCY SHELTERS ──────────────────────────────────────────────────────

/**
 * GET /api/v1/emergency/shelters
 * List all shelters, optional ?district= & ?status= filters
 */
export const listShelters = async (req, res) => {
    try {
        const filter = {};
        if (req.query.district) filter.district = req.query.district;
        if (req.query.status) filter.status = req.query.status;

        const shelters = await EmergencyShelter.find(filter).sort({ district: 1, name: 1 }).lean();
        return res.status(200).json({ success: true, count: shelters.length, data: shelters });
    } catch (error) {
        console.error('[EmergencyResponse] listShelters error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/v1/emergency/shelters
 * Register a new emergency shelter
 */
export const createShelter = async (req, res) => {
    try {
        const {
            name, district, address, capacity,
            managingOrganisation, organisationType,
            contactPerson, contactNumber, facilities, notes,
        } = req.body;

        if (!name || !district || !address || !capacity) {
            return res.status(400).json({
                success: false,
                message: 'name, district, address, and capacity are required.',
            });
        }

        const shelter = await EmergencyShelter.create({
            name, district, address, capacity,
            managingOrganisation, organisationType,
            contactPerson, contactNumber, facilities, notes,
        });
        return res.status(201).json({ success: true, data: shelter });
    } catch (error) {
        console.error('[EmergencyResponse] createShelter error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PATCH /api/v1/emergency/shelters/:id/occupancy
 * Update shelter occupancy and auto-set status (FULL when capacity reached)
 */
export const updateShelterOccupancy = async (req, res) => {
    try {
        const { id } = req.params;
        const { currentOccupancy, status } = req.body;

        if (currentOccupancy === undefined) {
            return res.status(400).json({ success: false, message: 'currentOccupancy is required.' });
        }

        const shelter = await EmergencyShelter.findById(id);
        if (!shelter) {
            return res.status(404).json({ success: false, message: 'Shelter not found.' });
        }

        shelter.currentOccupancy = Math.max(0, Number(currentOccupancy));

        // Auto-set status based on occupancy if not explicitly provided
        if (status && ['OPEN', 'FULL', 'CLOSED'].includes(status)) {
            shelter.status = status;
        } else {
            shelter.status = shelter.currentOccupancy >= shelter.capacity ? 'FULL' : 'OPEN';
        }

        await shelter.save();
        return res.status(200).json({ success: true, data: shelter });
    } catch (error) {
        console.error('[EmergencyResponse] updateShelterOccupancy error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * DELETE /api/v1/emergency/shelters/:id
 * Remove a shelter record
 */
export const deleteShelter = async (req, res) => {
    try {
        const shelter = await EmergencyShelter.findByIdAndDelete(req.params.id);
        if (!shelter) {
            return res.status(404).json({ success: false, message: 'Shelter not found.' });
        }
        return res.status(200).json({ success: true, message: 'Shelter removed.' });
    } catch (error) {
        console.error('[EmergencyResponse] deleteShelter error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─── RELIEF DISTRIBUTION ─────────────────────────────────────────────────────

/**
 * GET /api/v1/emergency/distributions
 * List relief distributions, optional ?district= filter
 */
export const listDistributions = async (req, res) => {
    try {
        const filter = {};
        if (req.query.district) filter.district = req.query.district;

        const distributions = await ReliefDistribution.find(filter)
            .sort({ distributedAt: -1 })
            .populate('shelter', 'name district')
            .lean();

        return res.status(200).json({ success: true, count: distributions.length, data: distributions });
    } catch (error) {
        console.error('[EmergencyResponse] listDistributions error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/v1/emergency/distributions
 * Log a new relief distribution record
 */
export const createDistribution = async (req, res) => {
    try {
        const {
            resourceType, quantity, unit, district, shelter,
            organisation, organisationType, distributedBy,
            distributedAt, beneficiaryCount, notes,
        } = req.body;

        if (!resourceType || !quantity || !district || !organisation) {
            return res.status(400).json({
                success: false,
                message: 'resourceType, quantity, district, and organisation are required.',
            });
        }

        const distribution = await ReliefDistribution.create({
            resourceType, quantity, unit, district,
            shelter: shelter || null,
            organisation, organisationType,
            distributedBy: distributedBy || req.user?.email || '',
            distributedAt: distributedAt ? new Date(distributedAt) : new Date(),
            beneficiaryCount: beneficiaryCount || 0,
            notes,
        });

        return res.status(201).json({ success: true, data: distribution });
    } catch (error) {
        console.error('[EmergencyResponse] createDistribution error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/v1/emergency/summary
 * Operational summary: team counts by status, shelter totals, recent distributions
 */
export const getOperationalSummary = async (req, res) => {
    try {
        const [teams, shelters, distributions] = await Promise.all([
            RescueTeam.find().lean(),
            EmergencyShelter.find().lean(),
            ReliefDistribution.find().sort({ distributedAt: -1 }).limit(10).lean(),
        ]);

        const teamsByStatus = teams.reduce((acc, t) => {
            acc[t.status] = (acc[t.status] || 0) + 1;
            return acc;
        }, {});

        const totalCapacity = shelters.reduce((s, sh) => s + (sh.capacity || 0), 0);
        const totalOccupancy = shelters.reduce((s, sh) => s + (sh.currentOccupancy || 0), 0);
        const openShelters = shelters.filter((sh) => sh.status === 'OPEN').length;
        const fullShelters = shelters.filter((sh) => sh.status === 'FULL').length;

        return res.status(200).json({
            success: true,
            data: {
                teams: {
                    total: teams.length,
                    byStatus: teamsByStatus,
                    deployed: (teamsByStatus.DEPLOYED || 0) + (teamsByStatus.ON_ROUTE || 0) + (teamsByStatus.ON_SCENE || 0),
                },
                shelters: {
                    total: shelters.length,
                    open: openShelters,
                    full: fullShelters,
                    totalCapacity,
                    totalOccupancy,
                    utilisationPct: totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0,
                },
                recentDistributions: distributions,
            },
        });
    } catch (error) {
        console.error('[EmergencyResponse] getOperationalSummary error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
