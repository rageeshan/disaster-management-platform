import HazardReport from '../models/HazardReport.js';
import ReportCluster from '../models/ReportCluster.js';
import { evaluateNearbySensors } from './iotService.js';

export const processReportClustering = async (report) => {
    try {
        const radiusInMeters = 500;
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

        // 1. Cross-reference nearby IoT telemetry (2km radius)
        const iotData = await evaluateNearbySensors(report.location, report.hazardType);

        // 2. Find existing cluster
        let existingCluster = await ReportCluster.findOne({
            hazardType: report.hazardType,
            district: report.district,
            status: { $in: ['PENDING_VERIFICATION', 'IN_REVIEW'] },
            updatedAt: { $gte: threeHoursAgo },
            centroid: {
                $near: {
                    $geometry: report.location,
                    $maxDistance: radiusInMeters,
                },
            },
        });

        if (existingCluster) {
            existingCluster.reports.push(report._id);

            // Recalculate centroid
            const allReports = await HazardReport.find({
                _id: { $in: existingCluster.reports },
            });

            const totalReports = allReports.length;
            const sumLon = allReports.reduce((sum, r) => sum + r.location.coordinates[0], 0);
            const sumLat = allReports.reduce((sum, r) => sum + r.location.coordinates[1], 0);

            existingCluster.centroid.coordinates = [sumLon / totalReports, sumLat / totalReports];

            // Recalculate confidence score: Citizen reports + Guest reports + IoT boost
            const nonGuestCount = allReports.filter((r) => !r.isGuestReport).length;
            const guestCount = totalReports - nonGuestCount;

            existingCluster.confidenceScore = (nonGuestCount * 2) + (guestCount * 1) + iotData.totalBoost;
            existingCluster.iotVerified = iotData.iotVerified;
            existingCluster.matchedSensors = iotData.matchedSensors;

            await existingCluster.save();
        } else {
            // Instantiate new cluster with base citizen score + IoT boost
            const baseScore = report.isGuestReport ? 1 : 2;

            existingCluster = await ReportCluster.create({
                hazardType: report.hazardType,
                district: report.district,
                centroid: report.location,
                reports: [report._id],
                confidenceScore: baseScore + iotData.totalBoost,
                iotVerified: iotData.iotVerified,
                matchedSensors: iotData.matchedSensors,
                status: 'PENDING_VERIFICATION',
            });
        }

        report.status = 'CLUSTERED';
        await report.save();

        return existingCluster;
    } catch (error) {
        console.error('❌ Clustering Engine Error:', error.message);
        throw error;
    }
};