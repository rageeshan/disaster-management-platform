class GeofencingService {
    // Mock demographic data for geographic regions in Sri Lanka
    constructor() {
        this.regionPopulations = {
            'Kalutara District': 25000,
            'Colombo District': 50000,
            'Gampaha District': 45000,
            'Galle District': 30000,
            'Kalu River Basin': 18000,
            'Kelani River Basin': 35000,
            'Gin River Basin': 12000,
        };
    }

    // Calculate total estimated recipients for selected target locations
    async calculateEstimatedRecipients(targetAreaType, targetLocations = []) {
        try {
            if (!targetLocations || targetLocations.length === 0) {
                return 0;
            }

            let totalEstimate = 0;
            for (const location of targetLocations) {
                const count = this.regionPopulations[location] || 10000; // Default fallback count
                totalEstimate += count;
            }

            console.log(`[GeofencingService] Target: ${targetAreaType} (${targetLocations.join(', ')}). Estimated: ${totalEstimate}`);
            return totalEstimate;
        } catch (error) {
            console.warn('[GeofencingService] Geofencing calculation failed. Falling back to default recipient pool.', error.message);
            return 5000; // Manual fallback estimate for safety audit[cite: 7]
        }
    }
}

export default new GeofencingService();