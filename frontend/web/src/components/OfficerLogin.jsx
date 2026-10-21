import React, { useState } from 'react';
import './OfficerLogin.css';

const AUTH_URL = 'http://localhost:5001/api/v1/auth';

export default function OfficerLogin({ onLoginSuccess }) {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            let res = await fetch(`${AUTH_URL}/citizen/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, email: identifier, password }),
            });

            if (res.status === 404) {
                res = await fetch(`${AUTH_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier, email: identifier, password }),
                });
            }

            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(data.message || 'Login failed. Check your credentials.');
                return;
            }

            // Only DMC officers and admins can access the verification dashboard
            const allowedRoles = ['DMC_OFFICER', 'ADMIN'];
            if (!allowedRoles.includes(data.user?.role)) {
                setError('Access denied. This portal is for DMC Officers only.');
                return;
            }

            onLoginSuccess(data.token, data.user);
        } catch (err) {
            setError('Cannot connect to server. Make sure the backend is running on port 5001.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-logo">🛡️</div>
                <h1 className="login-title">DMC Officer Portal</h1>
                <p className="login-subtitle">Disaster Management Centre — Verification Dashboard</p>

                <form onSubmit={handleLogin} className="login-form">
                    <div className="form-group">
                        <label htmlFor="identifier">Email / NIC / Phone</label>
                        <input
                            id="identifier"
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="officer1.dmc@gmail.com"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <div className="login-error">
                            ⚠️ {error}
                        </div>
                    )}

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Authenticating...' : '🔐 Sign In to Dashboard'}
                    </button>
                </form>

                <p className="login-hint">
                    Default test credentials: <code>officer1.dmc@gmail.com</code> / <code>Officer@1234</code>
                </p>
            </div>
        </div>
    );
}
