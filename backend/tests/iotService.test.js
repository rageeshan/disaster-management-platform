/**
 * Unit Tests: iotService.js
 * Module: UC-01 – IoT Telemetry Cross-Reference
 * Coverage: evaluateNearbySensors – boost calculation, empty results, error fallback
 */

import { jest } from '@jest/globals';

const mockIoTSensorFind = jest.fn();

jest.unstable_mockModule('../models/IoTSensor.js', () => ({
    default: { find: mockIoTSensorFind },
}));

const { evaluateNearbySensors } = await import('../services/iotService.js');

const floodLocation = { type: 'Point', coordinates: [79.983, 6.932] };

describe('iotService – evaluateNearbySensors Positive Cases', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-IS-01: CRITICAL sensor returns boost of 5 and iotVerified=true', async () => {
        mockIoTSensorFind.mockResolvedValue([
            { sensorCode: 'S1', name: 'Sensor A', currentValue: 5.2, unit: 'm', status: 'CRITICAL' },
        ]);
        const result = await evaluateNearbySensors(floodLocation, 'FLOOD');

        expect(result.iotVerified).toBe(true);
        expect(result.totalBoost).toBe(5);
        expect(result.matchedSensors).toHaveLength(1);
        expect(result.matchedSensors[0].status).toBe('CRITICAL');
    });

    test('TC-IS-02: WARNING sensor returns boost of 3 and iotVerified=true', async () => {
        mockIoTSensorFind.mockResolvedValue([
            { sensorCode: 'S2', name: 'Sensor B', currentValue: 3.8, unit: 'm', status: 'WARNING' },
        ]);
        const result = await evaluateNearbySensors(floodLocation, 'FLOOD');

        expect(result.iotVerified).toBe(true);
        expect(result.totalBoost).toBe(3);
    });

    test('TC-IS-03: Multiple sensors cumulate boost correctly (CRITICAL+WARNING = 8)', async () => {
        mockIoTSensorFind.mockResolvedValue([
            { sensorCode: 'S1', name: 'A', currentValue: 5.2, unit: 'm', status: 'CRITICAL' },
            { sensorCode: 'S2', name: 'B', currentValue: 3.1, unit: 'm', status: 'WARNING' },
        ]);
        const result = await evaluateNearbySensors(floodLocation, 'FLOOD');

        expect(result.totalBoost).toBe(8);
        expect(result.matchedSensors).toHaveLength(2);
    });

    test('TC-IS-04: No nearby sensors returns iotVerified=false, totalBoost=0', async () => {
        mockIoTSensorFind.mockResolvedValue([]);
        const result = await evaluateNearbySensors(floodLocation, 'FLOOD');

        expect(result.iotVerified).toBe(false);
        expect(result.totalBoost).toBe(0);
        expect(result.matchedSensors).toHaveLength(0);
    });

    test('TC-IS-05: Custom maxDistanceMeters is forwarded to query', async () => {
        mockIoTSensorFind.mockResolvedValue([]);
        await evaluateNearbySensors(floodLocation, 'FLOOD', 5000);

        const queryArg = mockIoTSensorFind.mock.calls[0][0];
        expect(queryArg.location.$near.$maxDistance).toBe(5000);
    });

    test('TC-IS-06: Default radius is 2000 meters when not specified', async () => {
        mockIoTSensorFind.mockResolvedValue([]);
        await evaluateNearbySensors(floodLocation, 'FLOOD');

        const queryArg = mockIoTSensorFind.mock.calls[0][0];
        expect(queryArg.location.$near.$maxDistance).toBe(2000);
    });

    test('TC-IS-07: Only WARNING and CRITICAL sensors are queried', async () => {
        mockIoTSensorFind.mockResolvedValue([]);
        await evaluateNearbySensors(floodLocation, 'FLOOD');

        const queryArg = mockIoTSensorFind.mock.calls[0][0];
        expect(queryArg.status.$in).toEqual(expect.arrayContaining(['WARNING', 'CRITICAL']));
        expect(queryArg.status.$in).not.toContain('NORMAL');
    });

    test('TC-IS-08: HazardType filter is applied correctly', async () => {
        mockIoTSensorFind.mockResolvedValue([]);
        await evaluateNearbySensors(floodLocation, 'LANDSLIDE');

        const queryArg = mockIoTSensorFind.mock.calls[0][0];
        expect(queryArg.hazardType).toBe('LANDSLIDE');
    });
});

describe('iotService – Error Fallback Cases', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-IS-09: DB error returns safe fallback (iotVerified=false, boost=0)', async () => {
        mockIoTSensorFind.mockRejectedValue(new Error('Connection refused'));

        const result = await evaluateNearbySensors(floodLocation, 'FLOOD');

        expect(result.iotVerified).toBe(false);
        expect(result.totalBoost).toBe(0);
        expect(result.matchedSensors).toHaveLength(0);
    });

    test('TC-IS-10: Two CRITICAL sensors yield boost of 10', async () => {
        mockIoTSensorFind.mockResolvedValue([
            { sensorCode: 'S1', name: 'A', currentValue: 5.2, unit: 'm', status: 'CRITICAL' },
            { sensorCode: 'S2', name: 'B', currentValue: 6.0, unit: 'm', status: 'CRITICAL' },
        ]);
        const result = await evaluateNearbySensors(floodLocation, 'FLOOD');
        expect(result.totalBoost).toBe(10);
    });
});
