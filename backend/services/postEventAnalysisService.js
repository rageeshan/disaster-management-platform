import HazardWarning from '../models/HazardWarning.js';
import DeliveryLog from '../models/DeliveryLog.js';
import HazardReport from '../models/HazardReport.js';
import ReportCluster from '../models/ReportCluster.js';
import EmergencyShelter from '../models/EmergencyShelter.js';
import ShelterOccupancyLog from '../models/ShelterOccupancyLog.js';
import ReliefDistribution from '../models/ReliefDistribution.js';

const WARNING_HAZARDS = ['Flood', 'Tsunami', 'Landslide', 'Cyclone', 'Extreme Weather'];
const REPORT_HAZARDS = ['FLOOD', 'LANDSLIDE', 'HEAVY_RAIN', 'TSUNAMI', 'EARTHQUAKE'];

const REPORT_TO_WARNING = {
    FLOOD: 'Flood',
    LANDSLIDE: 'Landslide',
    TSUNAMI: 'Tsunami',
    HEAVY_RAIN: 'Extreme Weather',
    EARTHQUAKE: 'Extreme Weather',
    CYCLONE: 'Cyclone',
};

const WARNING_TO_REPORT = {
    Flood: 'FLOOD',
    Landslide: 'LANDSLIDE',
    Tsunami: 'TSUNAMI',
    Cyclone: 'CYCLONE',
    'Extreme Weather': 'HEAVY_RAIN',
};

export function normalizeWarningHazard(hazardType) {
    if (!hazardType) return null;
    if (WARNING_HAZARDS.includes(hazardType)) return hazardType;
    return REPORT_TO_WARNING[hazardType.toUpperCase()] || hazardType;
}

export function normalizeReportHazard(hazardType) {
    if (!hazardType) return null;
    if (REPORT_HAZARDS.includes(hazardType)) return hazardType;
    return WARNING_TO_REPORT[hazardType] || hazardType.toUpperCase();
}

export function buildDateRange(from, to) {
    const range = {};
    if (from) {
        range.$gte = new Date(from);
    }
    if (to) {
        const end = new Date(to);
        if (!Number.isNaN(end.getTime())) {
            end.setHours(23, 59, 59, 999);
            range.$lte = end;
        }
    }
    return Object.keys(range).length ? range : null;
}

function districtMatchesLocations(targetLocations, district) {
    if (!district) return true;
    const needle = district.toLowerCase();
    return (targetLocations || []).some((loc) => String(loc).toLowerCase().includes(needle));
}

function percent(part, whole) {
    if (!whole) return 0;
    return Math.round((part / whole) * 1000) / 10;
}

export function buildEffectiveness(summary) {
    const reachRate = percent(summary.citizensReached, summary.citizensTargeted);
    const verificationRate = percent(summary.verifiedClusters, summary.totalClusters);
    const shelterUtilisation = percent(summary.latestShelterOccupancy, summary.totalShelterCapacity);
    const responseScore = Math.round((reachRate * 0.4) + (verificationRate * 0.3) + (Math.min(shelterUtilisation, 100) * 0.3));

    let rating = 'Needs Improvement';
    if (responseScore >= 80) rating = 'Strong';
    else if (responseScore >= 60) rating = 'Adequate';

    return {
        reachRate,
        verificationRate,
        shelterUtilisation,
        responseScore,
        rating,
        recommendations: [
            reachRate < 80 ? 'Improve multi-channel retry coverage so more targeted citizens are reached.' : 'Citizen reach performed well across dissemination channels.',
            verificationRate < 70 ? 'Reduce verification backlog so ground reports influence warnings faster.' : 'Verification throughput supported timely official warnings.',
            shelterUtilisation > 90 ? 'Several shelters approached capacity — pre-position overflow sites for similar events.' : 'Shelter occupancy remained within operable capacity for the selected window.',
        ],
    };
}

export function toCsv(report) {
    const lines = [];
    lines.push('Section,Key,Value');
    lines.push(`Summary,Alerts Issued,${report.summary.alertsIssued}`);
    lines.push(`Summary,Citizens Targeted,${report.summary.citizensTargeted}`);
    lines.push(`Summary,Citizens Reached,${report.summary.citizensReached}`);
    lines.push(`Summary,Ground Reports,${report.summary.groundReports}`);
    lines.push(`Summary,Verified Clusters,${report.summary.verifiedClusters}`);
    lines.push(`Summary,Resources Distributed,${report.summary.resourcesDistributed}`);
    lines.push(`Effectiveness,Reach Rate,${report.effectiveness.reachRate}`);
    lines.push(`Effectiveness,Verification Rate,${report.effectiveness.verificationRate}`);
    lines.push(`Effectiveness,Shelter Utilisation,${report.effectiveness.shelterUtilisation}`);
    lines.push(`Effectiveness,Response Score,${report.effectiveness.responseScore}`);
    lines.push(`Effectiveness,Rating,${report.effectiveness.rating}`);

    report.alertTimeline.forEach((item) => {
        lines.push(`Alert Timeline,${item.issuedAt},${item.hazardType} ${item.severity} (${item.status})`);
    });

    report.citizensReached.byChannel.forEach((row) => {
        lines.push(`Citizens Reached,${row.channel},${row.successful}/${row.totalTargeted}`);
    });

    report.shelterOccupancy.series.forEach((row) => {
        lines.push(`Shelter Occupancy,${row.date} ${row.shelterName},${row.occupancy}/${row.capacity}`);
    });

    report.resourceDistribution.byDistrict.forEach((row) => {
        lines.push(`Resource Distribution,${row.district} ${row.resourceType},${row.quantity} ${row.unit}`);
    });

    return lines.join('\n');
}

export async function getOperationalReport({ from, to, district, hazardType } = {}) {
    const createdAt = buildDateRange(from, to);
    const warningHazard = normalizeWarningHazard(hazardType);
    const reportHazard = normalizeReportHazard(hazardType);

    const warningFilter = {
        status: { $in: ['ISSUED', 'ESCALATED', 'EXPIRED'] },
    };
    if (createdAt) warningFilter.createdAt = createdAt;
    if (warningHazard) warningFilter.hazardType = warningHazard;

    let warnings = await HazardWarning.find(warningFilter).sort({ createdAt: 1 }).lean();
    if (district) {
        warnings = warnings.filter((warning) => districtMatchesLocations(warning.targetLocations, district));
    }

    const warningIds = warnings.map((warning) => warning._id);
    const deliveryLogs = warningIds.length
        ? await DeliveryLog.find({ warningId: { $in: warningIds } }).lean()
        : [];

    const channelMap = {};
    let citizensTargeted = 0;
    let citizensReached = 0;
    let citizensFailed = 0;

    deliveryLogs.forEach((log) => {
        const channel = log.channel || 'UNKNOWN';
        if (!channelMap[channel]) {
            channelMap[channel] = { channel, totalTargeted: 0, successful: 0, failed: 0 };
        }
        channelMap[channel].totalTargeted += log.totalTargeted || 0;
        channelMap[channel].successful += log.successful || 0;
        channelMap[channel].failed += log.failed || 0;
        citizensTargeted += log.totalTargeted || 0;
        citizensReached += log.successful || 0;
        citizensFailed += log.failed || 0;
    });

    const reportFilter = {};
    if (createdAt) reportFilter.createdAt = createdAt;
    if (district) reportFilter.district = district;
    if (reportHazard) reportFilter.hazardType = reportHazard;

    const groundReports = await HazardReport.countDocuments(reportFilter);
    const clusters = await ReportCluster.find(reportFilter).lean();
    const verifiedClusters = clusters.filter((cluster) => cluster.status === 'VERIFIED').length;

    const shelterFilter = district ? { district } : {};
    const shelters = await EmergencyShelter.find(shelterFilter).lean();
    const shelterById = Object.fromEntries(shelters.map((shelter) => [String(shelter._id), shelter]));
    const shelterIds = shelters.map((shelter) => shelter._id);

    const occupancyFilter = {};
    if (shelterIds.length) occupancyFilter.shelter = { $in: shelterIds };
    if (createdAt) occupancyFilter.recordedAt = createdAt;
    const occupancyLogs = shelterIds.length
        ? await ShelterOccupancyLog.find(occupancyFilter).sort({ recordedAt: 1 }).lean()
        : [];

    const occupancySeries = occupancyLogs.map((log) => {
        const shelter = shelterById[String(log.shelter)] || {};
        const capacity = shelter.capacity || 0;
        return {
            shelterId: log.shelter,
            shelterName: shelter.name || 'Unknown shelter',
            district: shelter.district || '',
            date: log.recordedAt,
            occupancy: log.occupancy,
            capacity,
            utilisation: percent(log.occupancy, capacity),
        };
    });

    const latestByShelter = {};
    occupancySeries.forEach((row) => {
        latestByShelter[String(row.shelterId)] = row;
    });
    const latestSnapshots = Object.values(latestByShelter);
    const latestShelterOccupancy = latestSnapshots.reduce((sum, row) => sum + (row.occupancy || 0), 0);
    const totalShelterCapacity = shelters.reduce((sum, shelter) => sum + (shelter.capacity || 0), 0);

    const occupancyByDay = {};
    occupancySeries.forEach((row) => {
        const day = new Date(row.date).toISOString().slice(0, 10);
        if (!occupancyByDay[day]) occupancyByDay[day] = { date: day, occupancy: 0, capacity: 0 };
        occupancyByDay[day].occupancy += row.occupancy || 0;
        occupancyByDay[day].capacity += row.capacity || 0;
    });

    const resourceFilter = {};
    if (createdAt) resourceFilter.distributedAt = createdAt;
    if (district) resourceFilter.district = district;
    const distributions = await ReliefDistribution.find(resourceFilter).sort({ distributedAt: 1 }).lean();

    const districtResourceMap = {};
    const orgTypeMap = {};
    let resourcesDistributed = 0;

    distributions.forEach((item) => {
        resourcesDistributed += item.quantity || 0;
        const key = `${item.district}::${item.resourceType}`;
        if (!districtResourceMap[key]) {
            districtResourceMap[key] = {
                district: item.district,
                resourceType: item.resourceType,
                quantity: 0,
                unit: item.unit || 'units',
            };
        }
        districtResourceMap[key].quantity += item.quantity || 0;

        const orgKey = item.organisationType || 'GOVERNMENT';
        if (!orgTypeMap[orgKey]) orgTypeMap[orgKey] = { organisationType: orgKey, quantity: 0 };
        orgTypeMap[orgKey].quantity += item.quantity || 0;
    });

    const summary = {
        alertsIssued: warnings.length,
        citizensTargeted,
        citizensReached,
        citizensFailed,
        groundReports,
        totalClusters: clusters.length,
        verifiedClusters,
        sheltersTracked: shelters.length,
        latestShelterOccupancy,
        totalShelterCapacity,
        resourcesDistributed,
        distributionRecords: distributions.length,
    };

    const report = {
        generatedAt: new Date().toISOString(),
        filters: { from: from || null, to: to || null, district: district || null, hazardType: hazardType || null },
        summary,
        alertTimeline: warnings.map((warning) => ({
            id: warning._id,
            hazardType: warning.hazardType,
            severity: warning.severity,
            status: warning.status,
            warningMessage: warning.warningMessage,
            targetAreaType: warning.targetAreaType,
            targetLocations: warning.targetLocations || [],
            estimatedRecipients: warning.estimatedRecipients || 0,
            issuedBy: warning.issuedBy,
            issuedAt: warning.createdAt,
        })),
        citizensReached: {
            totalTargeted: citizensTargeted,
            successful: citizensReached,
            failed: citizensFailed,
            reachRate: percent(citizensReached, citizensTargeted),
            byChannel: Object.values(channelMap),
        },
        shelterOccupancy: {
            shelters: shelters.map((shelter) => ({
                id: shelter._id,
                name: shelter.name,
                district: shelter.district,
                capacity: shelter.capacity,
                organisation: shelter.managingOrganisation,
                organisationType: shelter.organisationType,
                latest: latestByShelter[String(shelter._id)] || null,
            })),
            series: occupancySeries,
            byDay: Object.values(occupancyByDay).sort((a, b) => a.date.localeCompare(b.date)),
        },
        resourceDistribution: {
            byDistrict: Object.values(districtResourceMap).sort((a, b) => a.district.localeCompare(b.district)),
            byOrganisationType: Object.values(orgTypeMap),
            records: distributions,
        },
        effectiveness: buildEffectiveness(summary),
    };

    return report;
}
