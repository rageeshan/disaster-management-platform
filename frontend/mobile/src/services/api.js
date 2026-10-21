import Constants from 'expo-constants';

const getHostIp = () => {
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
    if (hostUri) {
        return hostUri.split(':')[0];
    }
    return '172.20.10.3';
};

export const BASE_URL = `http://${getHostIp()}:5001/api/v1`;

export const loginUser = async (phoneNumber, password) => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, password }),
    });
    return response.json();
};

export const registerUser = async (userData) => {
    const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...userData,
            userType: 'CITIZEN',
            role: 'CITIZEN',
        }),
    });
    return response.json();
};