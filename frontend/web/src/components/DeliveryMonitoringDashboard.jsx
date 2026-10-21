import React, { useState, useEffect } from 'react';
import './DeliveryMonitoringDashboard.css';

const API_BASE = 'http://localhost:5001/api/warnings';

export default function DeliveryMonitoringDashboard({ officerToken, warningId, onBackToWizard }) {
    const [warning, setWarning] = useState(null);
    const [deliveryLogs, setDeliveryLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modals State
    const [showRetryModal, setShowRetryModal] = useState(false);
    const [channelsToRetry, setChannelsToRetry] = useState([]);
    const [retrying, setRetrying] = useState(false);

    const [showEscalateModal, setShowEscalateModal] = useState(false);
    const [newSeverity, setNewSeverity] = useState('Critical');
    const [escalateNotes, setEscalateNotes] = useState('');
    const [escalating, setEscalating] = useState(false);

    // Fetch real-time delivery status via GET /api/warnings/:id/delivery-status
    const fetchDeliveryStatus = async () => {
        if (!warningId) {
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/${warningId}/delivery-status`, {
                headers: {
                    Authorization: `Bearer ${officerToken}`,
                },
            });

            const data = await res.json();
            if (data.success && data.data) {
                setWarning(data.data.warning || null);
                setDeliveryLogs(data.data.deliveryLogs || []);
            }
        } catch (err) {
            console.error('Fetch Delivery Status Error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDeliveryStatus();
        const interval = setInterval(fetchDeliveryStatus, 5000); // Polling every 5 sec
        return () => clearInterval(interval);
    }, [warningId, officerToken]);

    // Retry Failed Action: POST /api/warnings/:id/retry-failed
    const handleExecuteRetry = async () => {
        setRetrying(true);
        try {
            const res = await fetch(`${API_BASE}/${warningId}/retry-failed`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${officerToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ channelsToRetry }),
            });

            const data = await res.json();
            if (data.success) {
                alert('🔄 Re-dissemination attempt initiated for failed channels!');
                setShowRetryModal(false);
                fetchDeliveryStatus();
            } else {
                alert(data.message || 'Failed to retry deliveries.');
            }
        } catch (err) {
            alert('Error submitting delivery retry.');
        } finally {
            setRetrying(false);
        }
    };

    // Escalate Action: POST /api/warnings/:id/escalate
    const handleExecuteEscalation = async () => {
        setEscalating(true);
        try {
            const res = await fetch(`${API_BASE}/${warningId}/escalate`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${officerToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    newSeverity,
                    additionalInfo: escalateNotes || 'Severity escalated by DMC Operations Supervisor.',
                    officerId: 'DMC Senior Officer',
                }),
            });

            const data = await res.json();
            if (data.success) {
                alert(`🚨 Warning successfully escalated to ${newSeverity}! Re-broadcast dispatched.`);
                setShowEscalateModal(false);
                setEscalateNotes('');
                fetchDeliveryStatus();
            } else {
                alert(data.message || 'Failed to escalate warning.');
            }
        } catch (err) {
            alert('Error escalating warning severity.');
        } finally {
            setEscalating(false);
        }
    };

    const toggleRetryChannel = (ch) => {
        if (channelsToRetry.includes(ch)) {
            setChannelsToRetry(channelsToRetry.filter((c) => c !== ch));
        } else {
            setChannelsToRetry([...channelsToRetry, ch]);
        }
    };

    if (loading) return <div className="spinner">Loading Delivery Monitoring Dashboard...</div>;

    if (!warningId || !warning) {
        return (
            <div className="empty-dashboard-card">
                <h3>📡 No Warning Selected for Telemetry Monitoring</h3>
                <p>Select an active early warning or issue a new broadcast from the wizard.</p>
                {onBackToWizard && (
                    <button className="btn-open-wizard" onClick={onBackToWizard}>
                        📢 Open Early Warning Wizard →
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="monitoring-container">
            <header className="monitoring-header">
                <div>
                    <h2>📡 Multi-Channel Delivery Telemetry Dashboard</h2>
                    <p className="warning-meta">
                        Warning ID: <strong>{warning._id}</strong> &nbsp;·&nbsp;
                        Version Lock: <strong>v{warning.version || 1}</strong>
                    </p>
                </div>
                <div className="header-actions">
                    <button className="btn-escalate" onClick={() => setShowEscalateModal(true)}>
                        🚨 Escalate Warning
                    </button>
                    <button className="btn-retry" onClick={() => setShowRetryModal(true)}>
                        🔄 Retry Failed Channels
                    </button>
                </div>
            </header>

            {/* Warning Overview Summary Card */}
            <div className="warning-summary-card">
                <div className="summary-left">
                    <span className={`severity-badge ${warning.severity}`}>{warning.severity} SEVERITY</span>
                    <span className={`status-badge ${warning.status}`}>{warning.status}</span>
                    <h3>{warning.hazardType} Emergency Warning</h3>
                    <p className="summary-msg">"{warning.warningMessage}"</p>
                </div>
                <div className="summary-right">
                    <p><strong>Target Area:</strong> {warning.targetAreaType}</p>
                    <p><strong>Locations:</strong> {warning.targetLocations?.join(', ')}</p>
                    <p><strong>Estimated Coverage:</strong> {warning.estimatedRecipients?.toLocaleString()} citizens</p>
                    <p><strong>Issued By:</strong> {warning.issuedBy}</p>
                </div>
            </div>

            {/* Delivery Logs Telemetry Grid */}
            <h3>Real-Time Channel Telemetry ({deliveryLogs.length} Channels)</h3>
            <div className="telemetry-grid">
                {deliveryLogs.map((log) => {
                    const total = log.totalTargeted || 1;
                    const successPct = Math.round(((log.successful || 0) / total) * 100);

                    return (
                        <div key={log._id || log.channel} className={`telemetry-card ${log.status}`}>
                            <div className="card-header-row">
                                <h4>{log.channel === 'SMS' ? '📱 Cellular SMS' : log.channel === 'PUSH' ? '🔔 App Push' : '🔊 Siren Network'} ({log.channel})</h4>
                                <span className={`log-status-badge ${log.status}`}>{log.status}</span>
                            </div>

                            {/* Progress bar */}
                            <div className="progress-bar-bg">
                                <div className="progress-bar-fill" style={{ width: `${successPct}%` }} />
                            </div>

                            <div className="stat-grid">
                                <div>
                                    <small>Targeted</small>
                                    <strong>{log.totalTargeted}</strong>
                                </div>
                                <div>
                                    <small>Successful</small>
                                    <strong style={{ color: '#16A34A' }}>{log.successful}</strong>
                                </div>
                                <div>
                                    <small>Failed</small>
                                    <strong style={{ color: log.failed > 0 ? '#DC2626' : '#64748B' }}>{log.failed}</strong>
                                </div>
                                <div>
                                    <small>Retries</small>
                                    <strong>{log.retryCount || 0}</strong>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal 1: Partial Failure Retry Modal */}
            {showRetryModal && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <header className="modal-header">
                            <h3>🔄 Retry Failed Delivery Channels</h3>
                        </header>
                        <div className="modal-body">
                            <p>Select channels to re-dispatch failed notifications:</p>
                            {deliveryLogs.map((log) => (
                                <label key={log.channel} style={{ display: 'flex', gap: '8px', margin: '8px 0', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={channelsToRetry.includes(log.channel)}
                                        onChange={() => toggleRetryChannel(log.channel)}
                                    />
                                    <strong>{log.channel}</strong> — Failed: {log.failed} recipients
                                </label>
                            ))}
                        </div>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowRetryModal(false)} disabled={retrying}>
                                Cancel
                            </button>
                            <button className="btn-confirm-disseminate" onClick={handleExecuteRetry} disabled={retrying}>
                                {retrying ? 'Retrying...' : '⚡ Execute Re-Dissemination'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal 2: Warning Escalation Modal */}
            {showEscalateModal && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <header className="modal-header warning">
                            <h3>🚨 Escalate Warning Severity Level</h3>
                        </header>
                        <div className="modal-body">
                            <label style={{ display: 'block', marginBottom: '12px' }}>
                                <strong>New Severity Level:</strong>
                                <select value={newSeverity} onChange={(e) => setNewSeverity(e.target.value)} style={{ width: '100%', marginTop: '4px', padding: '8px' }}>
                                    <option value="High">High</option>
                                    <option value="Critical">Critical</option>
                                </select>
                            </label>

                            <label style={{ display: 'block' }}>
                                <strong>Escalation Instructions & Reason:</strong>
                                <textarea
                                    rows="3"
                                    style={{ width: '100%', marginTop: '4px', padding: '8px' }}
                                    value={escalateNotes}
                                    onChange={(e) => setEscalateNotes(e.target.value)}
                                    placeholder="Enter additional threat escalation findings..."
                                />
                            </label>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowEscalateModal(false)} disabled={escalating}>
                                Cancel
                            </button>
                            <button className="btn-confirm-disseminate" onClick={handleExecuteEscalation} disabled={escalating}>
                                {escalating ? 'Escalating...' : '🚨 CONFIRM ESCALATION'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
