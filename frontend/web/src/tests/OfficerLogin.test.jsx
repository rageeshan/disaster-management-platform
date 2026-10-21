/**
 * Unit Tests: OfficerLogin.jsx
 * Module: UC-01 – DMC Officer Authentication
 * Framework: Vitest + React Testing Library
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OfficerLogin from '../components/OfficerLogin';

// ── Helpers ────────────────────────────────────────────────────────────────
const mockOnLoginSuccess = vi.fn();

const renderComponent = () =>
    render(<OfficerLogin onLoginSuccess={mockOnLoginSuccess} />);

const fillAndSubmit = async (identifier, password) => {
    await userEvent.type(screen.getByLabelText(/email \/ nic \/ phone/i), identifier);
    await userEvent.type(screen.getByLabelText(/password/i), password);
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
};

// ══════════════════════════════════════════════════════════════════════════
// RENDER & STRUCTURE TESTS
// ══════════════════════════════════════════════════════════════════════════
describe('OfficerLogin – Rendering', () => {
    beforeEach(() => vi.clearAllMocks());

    it('TC-OL-01: Renders login form with all required fields', () => {
        renderComponent();
        expect(screen.getByLabelText(/email \/ nic \/ phone/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('TC-OL-02: Renders portal title and subtitle', () => {
        renderComponent();
        expect(screen.getByText(/dmc officer portal/i)).toBeInTheDocument();
        expect(screen.getByText(/verification dashboard/i)).toBeInTheDocument();
    });

    it('TC-OL-03: Shows default test credentials hint', () => {
        renderComponent();
        expect(screen.getByText(/officer1.dmc@gmail.com/i)).toBeInTheDocument();
    });

    it('TC-OL-04: No error message shown on initial render', () => {
        renderComponent();
        expect(screen.queryByText(/⚠️/)).not.toBeInTheDocument();
    });
});

// ══════════════════════════════════════════════════════════════════════════
// POSITIVE – SUCCESSFUL LOGIN
// ══════════════════════════════════════════════════════════════════════════
describe('OfficerLogin – Successful Login', () => {
    beforeEach(() => vi.clearAllMocks());

    it('TC-OL-05: DMC_OFFICER login calls onLoginSuccess with token and user', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                token: 'jwt-token-abc',
                user: { role: 'DMC_OFFICER', name: 'Officer A' },
            }),
        });

        renderComponent();
        await fillAndSubmit('officer1.dmc@gmail.com', 'Officer@1234');

        await waitFor(() => {
            expect(mockOnLoginSuccess).toHaveBeenCalledWith('jwt-token-abc', {
                role: 'DMC_OFFICER', name: 'Officer A',
            });
        });
    });

    it('TC-OL-06: ADMIN role is also allowed access', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                token: 'admin-token',
                user: { role: 'ADMIN', name: 'Admin User' },
            }),
        });

        renderComponent();
        await fillAndSubmit('admin@dmc.gov', 'Admin@123');

        await waitFor(() => {
            expect(mockOnLoginSuccess).toHaveBeenCalledTimes(1);
        });
    });

    it('TC-OL-07: Button shows "Authenticating..." while request is in-flight', async () => {
        let resolveFetch;
        global.fetch = vi.fn().mockReturnValueOnce(
            new Promise((resolve) => { resolveFetch = resolve; })
        );

        renderComponent();
        await userEvent.type(screen.getByLabelText(/email/i), 'officer@test.com');
        await userEvent.type(screen.getByLabelText(/password/i), 'Pass@123');
        fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form'));

        expect(await screen.findByText(/authenticating/i)).toBeInTheDocument();

        // Resolve so the component can clean up
        resolveFetch({ ok: true, json: async () => ({ success: true, token: 't', user: { role: 'DMC_OFFICER' } }) });
    });
});

// ══════════════════════════════════════════════════════════════════════════
// NEGATIVE – FAILED LOGIN
// ══════════════════════════════════════════════════════════════════════════
describe('OfficerLogin – Failed Login', () => {
    beforeEach(() => vi.clearAllMocks());

    it('TC-OL-08: Wrong credentials shows backend error message', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: false,
            json: async () => ({ success: false, message: 'Invalid credentials' }),
        });

        renderComponent();
        await fillAndSubmit('wrong@email.com', 'wrongpass');

        await waitFor(() => {
            expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
        });
        expect(mockOnLoginSuccess).not.toHaveBeenCalled();
    });

    it('TC-OL-09: Non-officer role (CITIZEN) shows access denied error', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                token: 'citizen-token',
                user: { role: 'CITIZEN' },
            }),
        });

        renderComponent();
        await fillAndSubmit('citizen@test.com', 'Pass@123');

        await waitFor(() => {
            expect(screen.getByText(/access denied/i)).toBeInTheDocument();
        });
        expect(mockOnLoginSuccess).not.toHaveBeenCalled();
    });

    it('TC-OL-10: Network failure shows "Cannot connect to server" error', async () => {
        global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network Error'));

        renderComponent();
        await fillAndSubmit('officer@dmc.gov', 'Pass@123');

        await waitFor(() => {
            expect(screen.getByText(/cannot connect to server/i)).toBeInTheDocument();
        });
    });

    it('TC-OL-11: Error clears on new submission attempt', async () => {
        // First attempt – fail
        global.fetch = vi.fn()
            .mockResolvedValueOnce({
                ok: false,
                json: async () => ({ success: false, message: 'Bad credentials' }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, token: 't', user: { role: 'DMC_OFFICER' } }),
            });

        renderComponent();
        await fillAndSubmit('bad@email.com', 'wrong');

        await waitFor(() => expect(screen.getByText(/bad credentials/i)).toBeInTheDocument());

        // Second attempt – succeed
        await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
        await waitFor(() => expect(screen.queryByText(/bad credentials/i)).not.toBeInTheDocument());
    });

    it('TC-OL-12: Submit button is disabled while loading', async () => {
        let resolveFetch;
        global.fetch = vi.fn().mockReturnValueOnce(
            new Promise((resolve) => { resolveFetch = resolve; })
        );

        renderComponent();
        await userEvent.type(screen.getByLabelText(/email/i), 'officer@test.com');
        await userEvent.type(screen.getByLabelText(/password/i), 'Pass@123');
        fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form'));

        const btn = await screen.findByRole('button', { name: /authenticating/i });
        expect(btn).toBeDisabled();

        resolveFetch({ ok: true, json: async () => ({ success: true, token: 't', user: { role: 'DMC_OFFICER' } }) });
    });
});
