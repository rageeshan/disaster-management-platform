import React, { useEffect, useMemo, useState } from 'react';
import './PostEventAnalysisDashboard.css';

const API_BASE = 'http://localhost:5001/api/v1/analysis';

const DISTRICTS = [
    'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
    'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
    'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
    'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
    'Moneragala', 'Ratnapura', 'Kegalle',
];

const defaultRange = () => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);
    return {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
    };
};

const formatNumber = (value) => Number(value || 0).toLocaleString();

const formatDateTime = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' });
};

const channelIcon = (channel) => {
    if (!channel) return '📡';
    const c = channel.toUpperCase();
    if (c === 'SMS') return '📱';
    if (c === 'PUSH') return '🔔';
    if (c === 'AUDIBLE') return '📢';
    return '📡';
};

const recIcon = (text) => {
    if (!text) return '💡';
    if (/retry|reach|channel/i.test(text)) return '📡';
    if (/verification|backlog/i.test(text)) return '✅';
    if (/overflow|shelter|capacity/i.test(text)) return '🏚️';
    return '💡';
};

export default function PostEventAnalysisDashboard({ officerToken }) {
    const initialRange = useMemo(() => defaultRange(), []);
    const [from, setFrom] = useState(initialRange.from);
    const [to, setTo] = useState(initialRange.to);
    const [district, setDistrict] = useState('');
    const [hazardType, setHazardType] = useState('');
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [exporting, setExporting] = useState('');

    const queryString = () => {
        const params = new URLSearchParams();
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        if (district) params.set('district', district);
        if (hazardType) params.set('hazardType', hazardType);
        return params.toString();
    };

    const fetchReport = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/operational-report?${queryString()}`, {
                headers: { Authorization: `Bearer ${officerToken}` },
            });
            const data = await res.json();
            if (data.success) {
                setReport(data.data);
            } else {
                setError(data.message || 'Failed to generate operational report.');
            }
        } catch (err) {
            console.error('Operational report fetch failed:', err);
            setError('Unable to reach the analysis service. Confirm the backend is running on port 5001.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [officerToken]);

    const handleExport = async (format) => {
        setExporting(format);
        try {
            const res = await fetch(`${API_BASE}/export?${queryString()}&format=${format}`, {
                headers: { Authorization: `Bearer ${officerToken}` },
            });
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `operational-report.${format}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export failed:', err);
            alert('Failed to export operational report.');
        } finally {
            setExporting('');
        }
    };

    if (loading && !report) {
        return (
            <div className="spinner">
                <div className="spinner-ring" />
                <span>Loading post-event operational report...</span>
            </div>
        );
    }

    const summary = report?.summary || {};
    const effectiveness = report?.effectiveness || {};
    const ratingClass = (effectiveness.rating || '').replace(/\s+/g, '-').toLowerCase();
    const maxDayOccupancy = Math.max(1, ...(report?.shelterOccupancy?.byDay || []).map((r) => r.occupancy || 0));
    const maxResource = Math.max(1, ...(report?.resourceDistribution?.byDistrict || []).map((r) => r.quantity || 0));

    return (
        <div className="analysis-container">
            {/* ── Page Header ── */}
            <header className="analysis-header">
                <div>
                    <h2>Post-Event Analysis &amp; Operational Reports</h2>
                    <p className="analysis-subtitle">
                        Evaluate alert timelines, citizen reach, shelter occupancy, and relief distribution after an event.
                    </p>
                </div>
                <div className="header-actions">
                    <button
                        id="btn-export-csv"
                        className="btn-export"
                        onClick={() => handleExport('csv')}
                        disabled={!!exporting}
                    >
                        {exporting === 'csv' ? 'Exporting…' : '⬇ Export CSV'}
                    </button>
                    <button
                        id="btn-export-json"
                        className="btn-export secondary"
                        onClick={() => handleExport('json')}
                        disabled={!!exporting}
                    >
                        {exporting === 'json' ? 'Exporting…' : '⬇ Export JSON'}
                    </button>
                </div>
            </header>

            {/* ── Filter Bar ── */}
            <form
                className="analysis-filters"
                onSubmit={(event) => {
                    event.preventDefault();
                    fetchReport();
                }}
            >
                <label htmlFor="filter-from">
                    From
                    <input
                        id="filter-from"
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                    />
                </label>
                <label htmlFor="filter-to">
                    To
                    <input
                        id="filter-to"
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                    />
                </label>
                <label htmlFor="filter-district">
                    District
                    <select id="filter-district" value={district} onChange={(e) => setDistrict(e.target.value)}>
                        <option value="">All districts</option>
                        {DISTRICTS.map((item) => (
                            <option key={item} value={item}>{item}</option>
                        ))}
                    </select>
                </label>
                <label htmlFor="filter-hazard">
                    Hazard type
                    <select id="filter-hazard" value={hazardType} onChange={(e) => setHazardType(e.target.value)}>
                        <option value="">All hazards</option>
                        <option value="Flood">🌊 Flood</option>
                        <option value="Landslide">⛰️ Landslide</option>
                        <option value="Tsunami">🌊 Tsunami</option>
                        <option value="Cyclone">🌀 Cyclone</option>
                        <option value="Extreme Weather">⛈️ Extreme Weather</option>
                    </select>
                </label>
                <button id="btn-generate-report" type="submit" className="btn-generate" disabled={loading}>
                    {loading ? '⏳ Generating…' : '🔍 Generate Report'}
                </button>
            </form>

            {/* ── Body ── */}
            <div className="analysis-body">
                {error && <div className="analysis-error">⚠️ {error}</div>}

                {report && (
                    <>
                        {/* ── KPI Cards ── */}
                        <section className="kpi-grid" aria-label="Key Performance Indicators">
                            <article className="kpi-card">
                                <span className="kpi-icon">📢</span>
                                <small>Alerts Issued</small>
                                <strong>{formatNumber(summary.alertsIssued)}</strong>
                                <span>{formatNumber(summary.citizensTargeted)} citizens targeted</span>
                            </article>
                            <article className="kpi-card">
                                <span className="kpi-icon">👥</span>
                                <small>Citizens Reached</small>
                                <strong>{formatNumber(summary.citizensReached)}</strong>
                                <span>of {formatNumber(summary.citizensTargeted)} targeted</span>
                            </article>
                            <article className="kpi-card">
                                <span className="kpi-icon">📋</span>
                                <small>Ground Reports</small>
                                <strong>{formatNumber(summary.groundReports)}</strong>
                                <span>{formatNumber(summary.verifiedClusters)} verified clusters</span>
                            </article>
                            <article className="kpi-card">
                                <span className="kpi-icon">🏠</span>
                                <small>Shelter Occupancy</small>
                                <strong>{formatNumber(summary.latestShelterOccupancy)}</strong>
                                <span>of {formatNumber(summary.totalShelterCapacity)} capacity</span>
                            </article>
                            <article className="kpi-card">
                                <span className="kpi-icon">📦</span>
                                <small>Relief Distributed</small>
                                <strong>{formatNumber(summary.resourcesDistributed)}</strong>
                                <span>{formatNumber(summary.distributionRecords)} logistics records</span>
                            </article>
                        </section>

                        {/* ── Effectiveness Banner ── */}
                        <section
                            className={`effectiveness-banner rating-${ratingClass}`}
                            aria-label="Response Effectiveness"
                        >
                            <div className="effectiveness-info">
                                <h3>Response Effectiveness: {effectiveness.rating || '—'}</h3>
                                <p>
                                    Composite score <strong>{effectiveness.responseScore || 0} / 100</strong> based on
                                    citizen reach, report verification throughput, and shelter utilisation.
                                </p>
                                <div className="effectiveness-metrics">
                                    <span className="metric-chip">
                                        <span className="metric-chip-label">Reach</span>
                                        {effectiveness.reachRate || 0}%
                                    </span>
                                    <span className="metric-chip">
                                        <span className="metric-chip-label">Verification</span>
                                        {effectiveness.verificationRate || 0}%
                                    </span>
                                    <span className="metric-chip">
                                        <span className="metric-chip-label">Shelter Use</span>
                                        {effectiveness.shelterUtilisation || 0}%
                                    </span>
                                </div>
                            </div>
                            <div className="effectiveness-score-ring">
                                <div
                                    className="score-circle"
                                    style={{ '--score': effectiveness.responseScore || 0 }}
                                >
                                    <div className="score-inner">
                                        {effectiveness.responseScore || 0}
                                    </div>
                                </div>
                                <span className="score-label">Score</span>
                            </div>
                        </section>

                        {/* ── Alert Timeline + Channel Reach (2-col) ── */}
                        <div className="analysis-columns">
                            {/* Alert Timeline */}
                            <section className="analysis-panel">
                                <h3 className="panel-title">
                                    <span className="panel-title-icon">⏱️</span>
                                    Alert Timeline
                                </h3>
                                {(report.alertTimeline || []).length === 0 ? (
                                    <p className="empty-copy">
                                        No official warnings in this window. Issue warnings from the Early Warning
                                        workspace to populate this timeline.
                                    </p>
                                ) : (
                                    <ol className="timeline-list">
                                        {report.alertTimeline.map((item) => (
                                            <li key={item.id} className="timeline-item">
                                                <div className="timeline-meta">
                                                    <span className={`severity-badge ${item.severity}`}>
                                                        {item.severity}
                                                    </span>
                                                    <span className={`status-badge ${item.status}`}>
                                                        {item.status}
                                                    </span>
                                                    <span className="timeline-date">
                                                        {formatDateTime(item.issuedAt)}
                                                    </span>
                                                </div>
                                                <p className="timeline-title">
                                                    {item.hazardType}
                                                    {item.targetLocations?.length > 0 &&
                                                        ` · ${item.targetLocations.join(', ')}`}
                                                </p>
                                                <p className="timeline-msg">{item.warningMessage}</p>
                                                <span className="timeline-footer">
                                                    👥 {formatNumber(item.estimatedRecipients)} estimated recipients
                                                </span>
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </section>

                            {/* Channel Reach */}
                            <section className="analysis-panel">
                                <h3 className="panel-title">
                                    <span className="panel-title-icon">📡</span>
                                    Citizens Reached by Channel
                                </h3>
                                {(report.citizensReached?.byChannel || []).length === 0 ? (
                                    <p className="empty-copy">No delivery telemetry for the selected alerts.</p>
                                ) : (
                                    <div className="channel-list">
                                        {report.citizensReached.byChannel.map((row) => {
                                            const pct = Math.round(
                                                ((row.successful || 0) / Math.max(row.totalTargeted || 1, 1)) * 100
                                            );
                                            return (
                                                <div key={row.channel} className="channel-row">
                                                    <div className="channel-label">
                                                        <strong>
                                                            {channelIcon(row.channel)} {row.channel}
                                                        </strong>
                                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                            <span className="channel-pct">{pct}%</span>
                                                            <span>
                                                                {formatNumber(row.successful)} /{' '}
                                                                {formatNumber(row.totalTargeted)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="progress-track">
                                                        <div
                                                            className="progress-fill"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* ── Shelter Occupancy ── */}
                        <section className="analysis-panel">
                            <h3 className="panel-title">
                                <span className="panel-title-icon">🏠</span>
                                Shelter Occupancy Over Time
                            </h3>
                            {(report.shelterOccupancy?.byDay || []).length === 0 ? (
                                <p className="empty-copy">
                                    No occupancy snapshots yet. Run{' '}
                                    <code>npm run seed:operations</code> in the backend to load demo shelter data.
                                </p>
                            ) : (
                                <div className="occupancy-chart-wrap">
                                    <div className="occupancy-chart-header">
                                        <span>Aggregate occupancy across all shelters</span>
                                        <span>Peak: {formatNumber(maxDayOccupancy)} persons</span>
                                    </div>
                                    <div className="occupancy-chart">
                                        {report.shelterOccupancy.byDay.map((row) => (
                                            <div key={row.date} className="occupancy-col">
                                                <div className="occupancy-bar-wrap">
                                                    <div
                                                        className="occupancy-bar"
                                                        style={{
                                                            height: `${Math.max(6, (row.occupancy / maxDayOccupancy) * 100)}%`,
                                                        }}
                                                        title={`${row.date}: ${formatNumber(row.occupancy)} persons`}
                                                    />
                                                </div>
                                                <small>{row.date.slice(5)}</small>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Shelter Detail Table */}
                            {(report.shelterOccupancy?.shelters || []).length > 0 && (
                                <div className="table-wrap">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Shelter</th>
                                                <th>District</th>
                                                <th>Organisation</th>
                                                <th>Latest Occupancy</th>
                                                <th>Capacity</th>
                                                <th>Utilisation</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {report.shelterOccupancy.shelters.map((shelter) => {
                                                const occ = shelter.latest?.occupancy || 0;
                                                const cap = shelter.capacity || 1;
                                                const pct = Math.round((occ / cap) * 100);
                                                const dotClass = pct >= 90 ? 'critical' : pct >= 75 ? 'high' : '';
                                                return (
                                                    <tr key={shelter.id}>
                                                        <td style={{ fontWeight: 700 }}>{shelter.name}</td>
                                                        <td>{shelter.district}</td>
                                                        <td>{shelter.organisation}</td>
                                                        <td>
                                                            <span className="occupancy-pct">
                                                                <span className={`occupancy-dot ${dotClass}`} />
                                                                {formatNumber(occ)}
                                                            </span>
                                                        </td>
                                                        <td>{formatNumber(cap)}</td>
                                                        <td>
                                                            <span style={{
                                                                fontWeight: 700,
                                                                color: pct >= 90 ? '#dc2626' : pct >= 75 ? '#ea580c' : '#16a34a',
                                                            }}>
                                                                {pct}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        {/* ── Resource Distribution ── */}
                        <div className="analysis-columns">
                            <section className="analysis-panel">
                                <h3 className="panel-title">
                                    <span className="panel-title-icon">📦</span>
                                    Resource Distribution by District
                                </h3>
                                {(report.resourceDistribution?.byDistrict || []).length === 0 ? (
                                    <p className="empty-copy">No relief distribution records in this window.</p>
                                ) : (
                                    <div className="resource-list">
                                        {report.resourceDistribution.byDistrict.map((row) => {
                                            const pct = Math.round((row.quantity / maxResource) * 100);
                                            const typeKey = row.resourceType?.replace('_', '') || 'OTHER';
                                            return (
                                                <div key={`${row.district}-${row.resourceType}`} className="resource-row">
                                                    <div className="resource-label">
                                                        <strong>
                                                            {row.district}
                                                            <span className={`resource-type-pill ${row.resourceType}`}>
                                                                {row.resourceType?.replace('_', ' ')}
                                                            </span>
                                                        </strong>
                                                        <span className="resource-qty">
                                                            {formatNumber(row.quantity)} {row.unit}
                                                        </span>
                                                    </div>
                                                    <div className="progress-track">
                                                        <div
                                                            className="progress-fill resource"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>

                            {/* Org Type Breakdown */}
                            <section className="analysis-panel">
                                <h3 className="panel-title">
                                    <span className="panel-title-icon">🏛️</span>
                                    By Organisation Type
                                </h3>
                                {(report.resourceDistribution?.byOrganisationType || []).length === 0 ? (
                                    <p className="empty-copy">No organisation breakdown available.</p>
                                ) : (
                                    <div className="org-type-grid">
                                        {report.resourceDistribution.byOrganisationType.map((org) => (
                                            <div key={org.organisationType} className="org-type-card">
                                                <span className={`org-type-dot ${org.organisationType}`} />
                                                <div className="org-type-info">
                                                    <span className="org-type-name">
                                                        {org.organisationType?.replace('_', ' ')}
                                                    </span>
                                                    <span className="org-type-qty">
                                                        {formatNumber(org.quantity)} units
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* ── Planning Notes / Recommendations ── */}
                        <section className="analysis-panel">
                            <h3 className="panel-title">
                                <span className="panel-title-icon">💡</span>
                                Planning Notes &amp; Recommendations
                            </h3>
                            {(effectiveness.recommendations || []).length === 0 ? (
                                <p className="empty-copy">No recommendations available for this window.</p>
                            ) : (
                                <ul className="recommendation-list">
                                    {effectiveness.recommendations.map((item) => (
                                        <li key={item} className="recommendation-item">
                                            <span className="rec-icon">{recIcon(item)}</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}
