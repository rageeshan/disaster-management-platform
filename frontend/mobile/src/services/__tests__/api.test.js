/**
 * Mobile Service Unit Tests: api.js
 * Target Coverage: > 80%
 */

import { loginUser, registerUser, BASE_URL } from '../api';

describe('Mobile API Services (api.js)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });

    it('TC-MOB-API-01: loginUser sends correct payload and returns json response', async () => {
        const mockResponse = { success: true, token: 'mock-jwt-token', user: { id: 'u123' } };
        global.fetch.mockResolvedValueOnce({
            json: jest.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await loginUser('0771234567', 'password123');

        expect(global.fetch).toHaveBeenCalledWith(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber: '0771234567', password: 'password123' }),
        });
        expect(result).toEqual(mockResponse);
    });

    it('TC-MOB-API-02: registerUser attaches CITIZEN userType and role', async () => {
        const mockUserData = {
            fullName: 'Kamal Perera',
            phoneNumber: '0779998887',
            password: 'pass',
            email: 'kamal@example.com',
            nic: '199012345678',
            district: 'Colombo',
            homeAddress: '123 Main St',
        };
        const mockResponse = { success: true, message: 'User registered' };

        global.fetch.mockResolvedValueOnce({
            json: jest.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await registerUser(mockUserData);

        expect(global.fetch).toHaveBeenCalledWith(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...mockUserData,
                userType: 'CITIZEN',
                role: 'CITIZEN',
            }),
        });
        expect(result).toEqual(mockResponse);
    });
});
