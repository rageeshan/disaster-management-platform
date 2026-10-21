import React, { useCallback, useEffect, useState } from 'react';
import './EmergencyCoordinationDashboard.css';

const API = 'http://localhost:5001/api/v1/emergency';

const DISTRICTS = [
    'Colombo','Gampaha','Kalutara','Kandy','Matale','Nuwara Eliya','Galle','Matara',
    'Hambantota','Jaffna','Kilinochchi','Mannar','Vavuniya','Mullaitivu','Batticaloa',
    'Ampara','Trincomalee','Kurunegala','Puttalam','Anuradhapura','Polonnaruwa',
    'Badulla','Moneragala','Ratnapura','Kegalle',
];

const STATUSES = ['STANDBY','DEPLOYED','ON_ROUTE','ON_SCENE','RETURNING','UNAVAILABLE'];
const RESOURCE_TYPES = ['FOOD','WATER','MEDICINE','SHELTER_KITS','CLOTHING','OTHER'];
const ORG_TYPES = ['GOVERNMENT','ARMED_FORCES','NGO','POLICE','PRIVATE_DONOR','PRIVATE'];
const CAPABILITIES = ['WATER_RESCUE','MEDICAL','SEARCH','EVACUATION','LOGISTICS','COMMUNICATIONS'];
const FACILITIES = ['MEDICAL','FOOD','WATER','SANITATION','POWER_BACKUP','WIFI'];

const fmt = (n) => Number(n || 0).toLocaleString();
const fmtDate = (d) => d ? new Date(d).toLocaleString('en-LK', { dateStyle: 'short', timeStyle: 'short' }) : '—';

// ── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    return (
        <span className={`ec-status ${status}`}>
            <span className="ec-status-dot" />
            {status?.replace('_', ' ')}
        </span>
    );
}

// ── Occupancy Bar ─────────────────────────────────────────────────────────────
function OccBar({ current, capacity }) {
    const pct = capacity > 0 ? Math.min(100, Math.round((current / capacity) * 100)) : 0;
    const cls = pct >= 90 ? 'high' : pct >= 65 ? 'medium' : 'low';
    return (
        <div className="occ-bar-wrap">
            <div className="occ-bar-track">
                <div className="occ-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="occ-bar-pct" style={{ color: pct >= 90 ? '#dc2626' : pct >= 65 ? '#d97706' : '#16a34a' }}>
                {pct}%
            </span>
        </div>
    );
}

// ── Summary KPIs ──────────────────────────────────────────────────────────────
function SummaryStrip({ summary }) {
    if (!summary) return null;
    const { teams, shelters } = summary;
    return (
        <div className="ec-kpi-strip">
            <div className="ec-kpi">
                <span className="ec-kpi-icon">🚒</span>
                <span className="ec-kpi-label">Active Teams</span>
                <span className="ec-kpi-value">{teams?.deployed ?? 0}</span>
                <span className="ec-kpi-sub">of {teams?.total ?? 0} total teams deployed</span>
            </div>
            <div className="ec-kpi">
                <span className="ec-kpi-icon">🏠</span>
                <span className="ec-kpi-label">Open Shelters</span>
                <span className="ec-kpi-value">{shelters?.open ?? 0}</span>
                <span className="ec-kpi-sub">{shelters?.full ?? 0} full · {shelters?.total ?? 0} total</span>
            </div>
            <div className="ec-kpi">
                <span className="ec-kpi-icon">👥</span>
                <span className="ec-kpi-label">Shelter Occupancy</span>
                <span className="ec-kpi-value">{fmt(shelters?.totalOccupancy)}</span>
                <span className="ec-kpi-sub">of {fmt(shelters?.totalCapacity)} capacity ({shelters?.utilisationPct ?? 0}%)</span>
            </div>
            <div className="ec-kpi">
                <span className="ec-kpi-icon">📦</span>
                <span className="ec-kpi-label">Recent Distributions</span>
                <span className="ec-kpi-value">{summary?.recentDistributions?.length ?? 0}</span>
                <span className="ec-kpi-sub">in the last 10 operations</span>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function EmergencyCoordinationDashboard({ officerToken }) {
    const [activeTab, setActiveTab]       = useState('TEAMS');
    const [summary, setSummary]           = useState(null);
    const [teams, setTeams]               = useState([]);
    const [shelters, setShelters]         = useState([]);
    const [distributions, setDistributions] = useState([]);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState('');

    // Filter state
    const [filterDistrict, setFilterDistrict] = useState('');
    const [filterStatus, setFilterStatus]     = useState('');

    // Modal state
    const [modal, setModal] = useState(null); // 'ADD_TEAM' | 'ADD_SHELTER' | 'LOG_DIST' | 'DISPATCH'
    const [selectedTeam, setSelectedTeam]   = useState(null);
    const [saving, setSaving]               = useState(false);

    // Form state
    const [form, setForm] = useState({});

    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${officerToken}` };

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [sumRes, teamsRes, sheltersRes, distRes] = await Promise.all([
                fetch(`${API}/summary`, { headers }),
                fetch(`${API}/rescue-teams`, { headers }),
                fetch(`${API}/shelters`, { headers }),
                fetch(`${API}/distributions`, { headers }),
            ]);
            const [sumData, teamsData, sheltersData, distData] = await Promise.all([
                sumRes.json(), teamsRes.json(), sheltersRes.json(), distRes.json(),
            ]);
            if (sumData.success)     setSummary(sumData.data);
            if (teamsData.success)   setTeams(teamsData.data);
            if (sheltersData.success) setShelters(sheltersData.data);
            if (distData.success)    setDistributions(distData.data);
        } catch (err) {
            setError('Unable to reach the backend. Ensure the server is running on port 5001.');
        } finally {
            setLoading(false);
        }
    }, [officerToken]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ── Dispatch a team ───────────────────────────────────────────────────────
    const handleDispatch = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API}/rescue-teams/${selectedTeam._id}/dispatch`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.success) { setModal(null); await fetchAll(); }
            else setError(data.message || 'Dispatch failed.');
        } catch { setError('Network error during dispatch.'); }
        finally { setSaving(false); }
    };

    // ── Delete a team ─────────────────────────────────────────────────────────
    const handleDeleteTeam = async (id) => {
        if (!window.confirm('Remove this rescue team?')) return;
        try {
            await fetch(`${API}/rescue-teams/${id}`, { method: 'DELETE', headers });
            await fetchAll();
        } catch { setError('Failed to remove team.'); }
    };

    // ── Delete a shelter ──────────────────────────────────────────────────────
    const handleDeleteShelter = async (id) => {
        if (!window.confirm('Remove this shelter?')) return;
        try {
            await fetch(`${API}/shelters/${id}`, { method: 'DELETE', headers });
            await fetchAll();
        } catch { setError('Failed to remove shelter.'); }
    };

    // ── Save forms ────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            let url = '', method = 'POST', body = { ...form };

            if (modal === 'ADD_TEAM')    { url = `${API}/rescue-teams`; }
            if (modal === 'ADD_SHELTER') { url = `${API}/shelters`; }
            if (modal === 'LOG_DIST')    { url = `${API}/distributions`; }
            if (modal === 'UPDATE_OCC')  { url = `${API}/shelters/${selectedTeam._id}/occupancy`; method = 'PATCH'; }

            const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
            const data = await res.json();
            if (data.success) { setModal(null); setForm({}); await fetchAll(); }
            else setError(data.message || 'Save failed.');
        } catch { setError('Network error while saving.'); }
        finally { setSaving(false); }
    };

    const openDispatch = (team) => { setSelectedTeam(team); setForm({ status: team.status, currentMission: team.currentMission || '' }); setModal('DISPATCH'); };
    const openUpdateOcc = (shelter) => { setSelectedTeam(shelter); setForm({ currentOccupancy: shelter.currentOccupancy }); setModal('UPDATE_OCC'); };

    // ── Filtered data ──────────────────────────────────────────────────────────
    const filteredTeams = teams.filter((t) => {
        if (filterDistrict && t.district !== filterDistrict) return false;
        if (filterStatus && t.status !== filterStatus) return false;
        return true;
    });
    const filteredShelters = shelters.filter((s) => {
        if (filterDistrict && s.district !== filterDistrict) return false;
        if (filterStatus && s.status !== filterStatus) return false;
        return true;
    });

    if (loading && !summary) {
        return (
            <div className="ec-spinner">
                <div className="ec-spinner-ring" />
                <span>Loading emergency coordination data...</span>
            </div>
        );
    }

    return (
        <div className="ec-container">
            {/* Header */}
            <header className="ec-header">
                <div>
                    <h2>Emergency Response &amp; Resource Deployment</h2>
                    <p className="ec-subtitle">
                        Dispatch rescue teams, manage emergency shelters, and coordinate relief distribution across Sri Lanka.
                    </p>
                </div>
            </header>

            {/* Tabs */}
            <div className="ec-tab-bar">
                {[['TEAMS', '🚒 Rescue Teams'], ['SHELTERS', '🏠 Shelters'], ['DISTRIBUTIONS', '📦 Relief Distributions']].map(([key, label]) => (
                    <button key={key} className={`ec-tab ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>
                        {label}
                    </button>
                ))}
            </div>

            <div className="ec-body">
                {error && <div className="ec-error">⚠️ {error}</div>}

                {/* KPI Strip */}
                <SummaryStrip summary={summary} />

                {/* ── RESCUE TEAMS TAB ── */}
                {activeTab === 'TEAMS' && (
                    <section className="ec-panel">
                        <div className="ec-panel-header">
                            <h3 className="ec-panel-title">🚒 Rescue Team Registry</h3>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                <select className="dispatch-select" value={filterDistrict} onChange={(e) => setFilterDistrict(e.target.value)}>
                                    <option value="">All Districts</option>
                                    {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
                                </select>
                                <select className="dispatch-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                    <option value="">All Statuses</option>
                                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                                </select>
                                <button id="btn-add-team" className="ec-btn ec-btn-primary" onClick={() => { setForm({}); setModal('ADD_TEAM'); }}>
                                    + Register Team
                                </button>
                            </div>
                        </div>
                        {filteredTeams.length === 0 ? (
                            <div className="ec-empty">No rescue teams found. Click "+ Register Team" to add one.</div>
                        ) : (
                            <div className="ec-table-wrap">
                                <table className="ec-table">
                                    <thead>
                                        <tr>
                                            <th>Team</th>
                                            <th>Code</th>
                                            <th>Organisation</th>
                                            <th>District</th>
                                            <th>Members</th>
                                            <th>Status</th>
                                            <th>Current Mission</th>
                                            <th>Last Deployed</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTeams.map((team) => (
                                            <tr key={team._id}>
                                                <td style={{ fontWeight: 700 }}>{team.name}</td>
                                                <td><code style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{team.teamCode}</code></td>
                                                <td>
                                                    <span className={`org-dot ${team.organisationType}`} />
                                                    {team.organisation}
                                                </td>
                                                <td>{team.district}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <strong>{team.memberCount}</strong>
                                                </td>
                                                <td><StatusBadge status={team.status} /></td>
                                                <td style={{ color: '#475569', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {team.currentMission || <span style={{ color: '#94a3b8' }}>—</span>}
                                                </td>
                                                <td style={{ color: '#64748b', fontSize: 12 }}>{fmtDate(team.lastDispatchedAt)}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button className="ec-btn ec-btn-success" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => openDispatch(team)}>
                                                            ⚡ Dispatch
                                                        </button>
                                                        <button className="ec-btn ec-btn-danger" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => handleDeleteTeam(team._id)}>
                                                            🗑
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}

                {/* ── SHELTERS TAB ── */}
                {activeTab === 'SHELTERS' && (
                    <section className="ec-panel">
                        <div className="ec-panel-header">
                            <h3 className="ec-panel-title">🏠 Emergency Shelters</h3>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                <select className="dispatch-select" value={filterDistrict} onChange={(e) => setFilterDistrict(e.target.value)}>
                                    <option value="">All Districts</option>
                                    {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
                                </select>
                                <select className="dispatch-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                    <option value="">All Statuses</option>
                                    <option>OPEN</option><option>FULL</option><option>CLOSED</option>
                                </select>
                                <button id="btn-add-shelter" className="ec-btn ec-btn-primary" onClick={() => { setForm({}); setModal('ADD_SHELTER'); }}>
                                    + Register Shelter
                                </button>
                            </div>
                        </div>
                        {filteredShelters.length === 0 ? (
                            <div className="ec-empty">No shelters found. Click "+ Register Shelter" to add one.</div>
                        ) : (
                            <div className="ec-table-wrap">
                                <table className="ec-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>District</th>
                                            <th>Managed By</th>
                                            <th>Capacity</th>
                                            <th>Occupancy</th>
                                            <th>Utilisation</th>
                                            <th>Status</th>
                                            <th>Contact</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredShelters.map((s) => (
                                            <tr key={s._id}>
                                                <td style={{ fontWeight: 700 }}>{s.name}</td>
                                                <td>{s.district}</td>
                                                <td>
                                                    <span className={`org-dot ${s.organisationType}`} />
                                                    {s.managingOrganisation}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>{fmt(s.capacity)}</td>
                                                <td style={{ textAlign: 'center' }}>{fmt(s.currentOccupancy)}</td>
                                                <td><OccBar current={s.currentOccupancy} capacity={s.capacity} /></td>
                                                <td><StatusBadge status={s.status} /></td>
                                                <td style={{ fontSize: 12, color: '#64748b' }}>{s.contactPerson || '—'}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button className="ec-btn ec-btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => openUpdateOcc(s)}>
                                                            🔄 Update
                                                        </button>
                                                        <button className="ec-btn ec-btn-danger" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => handleDeleteShelter(s._id)}>
                                                            🗑
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}

                {/* ── DISTRIBUTIONS TAB ── */}
                {activeTab === 'DISTRIBUTIONS' && (
                    <section className="ec-panel">
                        <div className="ec-panel-header">
                            <h3 className="ec-panel-title">📦 Relief Distribution Log</h3>
                            <button id="btn-log-dist" className="ec-btn ec-btn-primary" onClick={() => { setForm({ distributedAt: new Date().toISOString().slice(0, 16) }); setModal('LOG_DIST'); }}>
                                + Log Distribution
                            </button>
                        </div>
                        {distributions.length === 0 ? (
                            <div className="ec-empty">No distribution records yet. Log your first relief distribution.</div>
                        ) : (
                            <div className="ec-table-wrap">
                                <table className="ec-table">
                                    <thead>
                                        <tr>
                                            <th>Resource</th>
                                            <th>Quantity</th>
                                            <th>Beneficiaries</th>
                                            <th>District</th>
                                            <th>Shelter</th>
                                            <th>Organisation</th>
                                            <th>Distributed By</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {distributions.map((d) => (
                                            <tr key={d._id}>
                                                <td><span className={`res-pill ${d.resourceType}`}>{d.resourceType?.replace('_', ' ')}</span></td>
                                                <td style={{ fontWeight: 700 }}>{fmt(d.quantity)} <span style={{ color: '#94a3b8', fontWeight: 400 }}>{d.unit}</span></td>
                                                <td style={{ textAlign: 'center' }}>{fmt(d.beneficiaryCount)}</td>
                                                <td>{d.district}</td>
                                                <td style={{ fontSize: 12, color: '#64748b' }}>{d.shelter?.name || '—'}</td>
                                                <td>
                                                    <span className={`org-dot ${d.organisationType}`} />
                                                    {d.organisation}
                                                </td>
                                                <td style={{ color: '#64748b', fontSize: 12 }}>{d.distributedBy || '—'}</td>
                                                <td style={{ color: '#64748b', fontSize: 12 }}>{fmtDate(d.distributedAt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}
            </div>

            {/* ── MODALS ── */}
            {modal && (
                <div className="ec-modal-overlay" onClick={() => { setModal(null); setForm({}); }}>
                    <div className="ec-modal" onClick={(e) => e.stopPropagation()}>

                        {/* Dispatch */}
                        {modal === 'DISPATCH' && (
                            <>
                                <h3>⚡ Dispatch: {selectedTeam?.name}</h3>
                                <div className="ec-form-grid">
                                    <div className="ec-field full-width">
                                        <label>Status</label>
                                        <select value={form.status || ''} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                                            {STATUSES.map((s) => <option key={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div className="ec-field full-width">
                                        <label>Current Mission</label>
                                        <textarea value={form.currentMission || ''} onChange={(e) => setForm({ ...form, currentMission: e.target.value })} placeholder="Describe the mission or operation..." />
                                    </div>
                                    <div className="ec-field full-width">
                                        <label>Dispatched By</label>
                                        <input value={form.dispatchedBy || ''} onChange={(e) => setForm({ ...form, dispatchedBy: e.target.value })} placeholder="Officer name" />
                                    </div>
                                </div>
                                <div className="ec-modal-actions">
                                    <button className="ec-btn ec-btn-ghost" onClick={() => { setModal(null); setForm({}); }}>Cancel</button>
                                    <button className="ec-btn ec-btn-success" onClick={handleDispatch} disabled={saving}>{saving ? 'Saving…' : '✓ Confirm Dispatch'}</button>
                                </div>
                            </>
                        )}

                        {/* Update Occupancy */}
                        {modal === 'UPDATE_OCC' && (
                            <>
                                <h3>🔄 Update Occupancy: {selectedTeam?.name}</h3>
                                <div className="ec-form-grid">
                                    <div className="ec-field">
                                        <label>Current Occupancy</label>
                                        <input type="number" min="0" max={selectedTeam?.capacity} value={form.currentOccupancy ?? ''} onChange={(e) => setForm({ ...form, currentOccupancy: Number(e.target.value) })} />
                                    </div>
                                    <div className="ec-field">
                                        <label>Override Status (optional)</label>
                                        <select value={form.status || ''} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                                            <option value="">Auto-detect</option>
                                            <option>OPEN</option><option>FULL</option><option>CLOSED</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="ec-modal-actions">
                                    <button className="ec-btn ec-btn-ghost" onClick={() => { setModal(null); setForm({}); }}>Cancel</button>
                                    <button className="ec-btn ec-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : '✓ Update'}</button>
                                </div>
                            </>
                        )}

                        {/* Add Team */}
                        {modal === 'ADD_TEAM' && (
                            <>
                                <h3>🚒 Register Rescue Team</h3>
                                <div className="ec-form-grid">
                                    <div className="ec-field">
                                        <label>Team Name *</label>
                                        <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Colombo Flood Unit Alpha" />
                                    </div>
                                    <div className="ec-field">
                                        <label>Team Code *</label>
                                        <input value={form.teamCode || ''} onChange={(e) => setForm({ ...form, teamCode: e.target.value })} placeholder="e.g. CFU-ALPHA" />
                                    </div>
                                    <div className="ec-field">
                                        <label>Organisation</label>
                                        <input value={form.organisation || ''} onChange={(e) => setForm({ ...form, organisation: e.target.value })} placeholder="e.g. Sri Lanka Army" />
                                    </div>
                                    <div className="ec-field">
                                        <label>Org Type</label>
                                        <select value={form.organisationType || 'GOVERNMENT'} onChange={(e) => setForm({ ...form, organisationType: e.target.value })}>
                                            {ORG_TYPES.map((o) => <option key={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    <div className="ec-field">
                                        <label>Base District *</label>
                                        <select value={form.district || ''} onChange={(e) => setForm({ ...form, district: e.target.value })}>
                                            <option value="">Select district</option>
                                            {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div className="ec-field">
                                        <label>Member Count</label>
                                        <input type="number" min="1" value={form.memberCount || ''} onChange={(e) => setForm({ ...form, memberCount: Number(e.target.value) })} placeholder="e.g. 8" />
                                    </div>
                                    <div className="ec-field full-width">
                                        <label>Contact Number</label>
                                        <input value={form.contactNumber || ''} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} placeholder="+94 XX XXX XXXX" />
                                    </div>
                                </div>
                                <div className="ec-modal-actions">
                                    <button className="ec-btn ec-btn-ghost" onClick={() => { setModal(null); setForm({}); }}>Cancel</button>
                                    <button className="ec-btn ec-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : '✓ Register'}</button>
                                </div>
                            </>
                        )}

                        {/* Add Shelter */}
                        {modal === 'ADD_SHELTER' && (
                            <>
                                <h3>🏠 Register Emergency Shelter</h3>
                                <div className="ec-form-grid">
                                    <div className="ec-field">
                                        <label>Shelter Name *</label>
                                        <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Colombo Town Hall" />
                                    </div>
                                    <div className="ec-field">
                                        <label>District *</label>
                                        <select value={form.district || ''} onChange={(e) => setForm({ ...form, district: e.target.value })}>
                                            <option value="">Select district</option>
                                            {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div className="ec-field full-width">
                                        <label>Address *</label>
                                        <input value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" />
                                    </div>
                                    <div className="ec-field">
                                        <label>Capacity *</label>
                                        <input type="number" min="1" value={form.capacity || ''} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
                                    </div>
                                    <div className="ec-field">
                                        <label>Managing Organisation</label>
                                        <input value={form.managingOrganisation || ''} onChange={(e) => setForm({ ...form, managingOrganisation: e.target.value })} placeholder="e.g. Colombo Municipal Council" />
                                    </div>
                                    <div className="ec-field">
                                        <label>Org Type</label>
                                        <select value={form.organisationType || 'GOVERNMENT'} onChange={(e) => setForm({ ...form, organisationType: e.target.value })}>
                                            {['GOVERNMENT','ARMED_FORCES','NGO','PRIVATE_DONOR'].map((o) => <option key={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    <div className="ec-field">
                                        <label>Contact Person</label>
                                        <input value={form.contactPerson || ''} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
                                    </div>
                                    <div className="ec-field">
                                        <label>Contact Number</label>
                                        <input value={form.contactNumber || ''} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
                                    </div>
                                </div>
                                <div className="ec-modal-actions">
                                    <button className="ec-btn ec-btn-ghost" onClick={() => { setModal(null); setForm({}); }}>Cancel</button>
                                    <button className="ec-btn ec-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : '✓ Register'}</button>
                                </div>
                            </>
                        )}

                        {/* Log Distribution */}
                        {modal === 'LOG_DIST' && (
                            <>
                                <h3>📦 Log Relief Distribution</h3>
                                <div className="ec-form-grid">
                                    <div className="ec-field">
                                        <label>Resource Type *</label>
                                        <select value={form.resourceType || ''} onChange={(e) => setForm({ ...form, resourceType: e.target.value })}>
                                            <option value="">Select type</option>
                                            {RESOURCE_TYPES.map((r) => <option key={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <div className="ec-field">
                                        <label>Quantity *</label>
                                        <input type="number" min="0" value={form.quantity || ''} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
                                    </div>
                                    <div className="ec-field">
                                        <label>Unit</label>
                                        <input value={form.unit || ''} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="packs / litres / kits" />
                                    </div>
                                    <div className="ec-field">
                                        <label>District *</label>
                                        <select value={form.district || ''} onChange={(e) => setForm({ ...form, district: e.target.value })}>
                                            <option value="">Select district</option>
                                            {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div className="ec-field">
                                        <label>Organisation *</label>
                                        <input value={form.organisation || ''} onChange={(e) => setForm({ ...form, organisation: e.target.value })} placeholder="e.g. DMC Logistics" />
                                    </div>
                                    <div className="ec-field">
                                        <label>Org Type</label>
                                        <select value={form.organisationType || 'GOVERNMENT'} onChange={(e) => setForm({ ...form, organisationType: e.target.value })}>
                                            {['GOVERNMENT','ARMED_FORCES','NGO','PRIVATE_DONOR'].map((o) => <option key={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    <div className="ec-field">
                                        <label>Beneficiaries</label>
                                        <input type="number" min="0" value={form.beneficiaryCount || ''} onChange={(e) => setForm({ ...form, beneficiaryCount: Number(e.target.value) })} />
                                    </div>
                                    <div className="ec-field">
                                        <label>Distributed By</label>
                                        <input value={form.distributedBy || ''} onChange={(e) => setForm({ ...form, distributedBy: e.target.value })} placeholder="Officer / volunteer name" />
                                    </div>
                                    <div className="ec-field full-width">
                                        <label>Date &amp; Time</label>
                                        <input type="datetime-local" value={form.distributedAt || ''} onChange={(e) => setForm({ ...form, distributedAt: e.target.value })} />
                                    </div>
                                    <div className="ec-field full-width">
                                        <label>Notes</label>
                                        <textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." />
                                    </div>
                                </div>
                                <div className="ec-modal-actions">
                                    <button className="ec-btn ec-btn-ghost" onClick={() => { setModal(null); setForm({}); }}>Cancel</button>
                                    <button className="ec-btn ec-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : '✓ Log Distribution'}</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
