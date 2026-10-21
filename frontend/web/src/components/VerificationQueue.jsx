import React, { useState, useEffect } from 'react';
import ClusterMap from './ClusterMap';
import './VerificationQueue.css';

const API_BASE = 'http://localhost:5001/api/v1/reports';

// Component Error Boundary to catch map/render crashes gracefully
class VerificationErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Verification Queue Component Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B', marginTop: '15px' }}>
                    <h4>⚠️ Display Exception Encountered</h4>
                    <p style={{ fontSize: '13px', margin: '8px 0' }}>{this.state.error?.message || 'An error occurred while rendering the cluster details.'}</p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        style={{ padding: '6px 12px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                        🔄 Reload Panel
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function VerificationQueue({ officerToken, onHandoverVerifiedCluster }) {
    const [clusters, setClusters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCluster, setSelectedCluster] = useState(null);
    const [locking, setLocking] = useState(false);

    // Verification Form State
    const [officerNotes, setOfficerNotes] = useState('');
    const [reasonCode, setReasonCode] = useState('');
    const [severityLevel, setSeverityLevel] = useState('MODERATE');

    // 1. Fetch pending clusters from backend GET endpoint
    const fetchPendingClusters = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/verification/clusters`, {
                headers: {
                    Authorization: `Bearer ${officerToken}`,
                },
            });
            const data = await res.json();
            if (data.success) {
                setClusters(data.data || []); // Matches backend response key: data.data
            } else {
                alert(data.message || 'Failed to retrieve clusters');
            }
        } catch (err) {
            console.error('Failed to load pending clusters:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingClusters();
    }, [officerToken]);

    // 2. Lock a cluster for operational review
    const handleLockCluster = async (clusterId) => {
        setLocking(true);
        try {
            const res = await fetch(`${API_BASE}/verification/clusters/${clusterId}/lock`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${officerToken}`,
                    'Content-Type': 'application/json',
                },
            });
            const data = await res.json();
            if (data.success) {
                const found = clusters.find((c) => c._id === clusterId);
                setSelectedCluster(found);
                setOfficerNotes('');
                setReasonCode('');
                // Update local cluster status
                setClusters((prev) =>
                    prev.map((c) =>
                        c._id === clusterId ? { ...c, status: 'IN_REVIEW' } : c
                    )
                );
            } else {
                alert(data.message || 'Cluster is already locked by another DMC officer.');
            }
        } catch (err) {
            alert('Error acquiring operational lock.');
        } finally {
            setLocking(false);
        }
    };

    // 3. Execute review action (VERIFY, REJECT, FLAG)
    const handleExecuteAction = async (actionType) => {
        if (!selectedCluster) return;

        // Safety Gate Client Validation
        if ((actionType === 'REJECT' || actionType === 'FLAG') && officerNotes.trim().length < 5) {
            alert('Officer notes (min 5 characters) are required for REJECT and FLAG actions.');
            return;
        }
        if (actionType === 'REJECT' && !reasonCode) {
            alert('A reason code is required to reject an incident cluster.');
            return;
        }

        try {
            const payload = {
                action: actionType,
                officerNotes,
                reasonCode: actionType === 'REJECT' ? reasonCode : undefined,
                severityLevel: actionType === 'VERIFY' ? severityLevel : undefined,
            };

            const res = await fetch(`${API_BASE}/verification/clusters/${selectedCluster._id}/verify`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${officerToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (data.success) {
                alert(data.message || `Cluster action ${actionType} completed.`);
                setSelectedCluster(null);
                
                // Handover to Module 2 Warning Creation Wizard if VERIFY action
                if (actionType === 'VERIFY' && onHandoverVerifiedCluster && data.handoverPayload) {
                    onHandoverVerifiedCluster(data.handoverPayload);
                }
                
                fetchPendingClusters();
            } else {
                alert(data.message || 'Failed to process verification action.');
            }
        } catch (err) {
            alert('Error submitting verification action.');
        }
    };

    if (loading) return <div className="spinner">Loading Verification Queue...</div>;

    return (
        <div className="queue-container">
            <header className="queue-header">
                <h2>🛡️ DMC Officer Incident Verification Queue</h2>
                <button onClick={fetchPendingClusters} className="refresh-btn">
                    🔄 Refresh Feed
                </button>
            </header>

            <div className="queue-grid">
                {/* Left Column: List of Pending Clusters */}
                <div className="cluster-list">
                    <h3>Pending Hazard Clusters ({clusters.length})</h3>
                    {clusters.length === 0 ? (
                        <p className="empty-msg">No pending report clusters require verification.</p>
                    ) : (
                        clusters.map((cluster) => (
                            <div
                                key={cluster._id}
                                className={`cluster-card ${selectedCluster?._id === cluster._id ? 'active' : ''}`}
                                onClick={() => handleLockCluster(cluster._id)}
                            >
                                <div className="card-top">
                                    <span className={`badge ${cluster.hazardType}`}>{cluster.hazardType}</span>
                                    <span className="confidence-score">
                                        Score: {cluster.confidenceScore}
                                    </span>
                                </div>
                                <h4>District: {cluster.district || 'Unassigned'}</h4>
                                <p>Status: <strong>{cluster.status}</strong></p>
                                <p>📊 Reports Grouped: {cluster.reports?.length || 0}</p>
                                {cluster.iotVerified && <span className="iot-tag">⚡ IoT Sensor Matched</span>}
                                <button
                                    className="review-btn"
                                    disabled={locking}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleLockCluster(cluster._id);
                                    }}
                                >
                                    {selectedCluster?._id === cluster._id ? 'Reviewing...' : 'Inspect & Lock'}
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Right Column: Detailed Review & Verification Panel */}
                <div className="review-panel">
                    {selectedCluster ? (
                        <VerificationErrorBoundary key={selectedCluster._id}>
                            <div className="cluster-details">
                                <h3>Cluster Inspection: {selectedCluster._id}</h3>

                                {/* Web GIS Map */}
                                <ClusterMap cluster={selectedCluster} />

                                <div className="meta-box" style={{ marginTop: '16px' }}>
                                    <p><strong>Hazard Type:</strong> {selectedCluster.hazardType}</p>
                                    <p><strong>District:</strong> {selectedCluster.district}</p>
                                    <p><strong>Confidence Score:</strong> {selectedCluster.confidenceScore}</p>
                                    <p><strong>IoT Verified:</strong> {selectedCluster.iotVerified ? 'Yes' : 'No'}</p>
                                </div>

                                {/* Matched IoT Sensors Section */}
                                {Array.isArray(selectedCluster.matchedSensors) && selectedCluster.matchedSensors.length > 0 && (
                                    <div className="iot-sensors-box">
                                        <h4>⚡ Matched Telemetry Sensors</h4>
                                        <ul>
                                            {selectedCluster.matchedSensors.map((sensor, idx) => (
                                                <li key={idx}>
                                                    <strong>{sensor?.name || 'Sensor'}</strong> ({sensor?.sensorCode || 'N/A'}): {sensor?.currentValue} {sensor?.unit} — Status: {sensor?.status}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <h4>Attached Citizen Reports ({selectedCluster.reports?.length || 0})</h4>
                                <div className="media-gallery">
                                    {Array.isArray(selectedCluster.reports) && selectedCluster.reports.length > 0 ? (
                                        selectedCluster.reports.map((report, idx) => {
                                            if (!report) return null;
                                            const isObject = typeof report === 'object';
                                            return (
                                                <div key={isObject ? report._id || idx : idx} className="report-item">
                                                    <p>
                                                        <strong>Report #{idx + 1}:</strong> {isObject ? report.description || 'No notes provided' : `ID: ${report}`}
                                                    </p>
                                                    {isObject && report.reporter && typeof report.reporter === 'object' && (
                                                        <p style={{ fontSize: '11px', color: '#6B7280' }}>
                                                            Submitted by: {report.reporter.fullName || 'Citizen'} ({report.reporter.phoneNumber || 'N/A'})
                                                        </p>
                                                    )}
                                                    {isObject && Array.isArray(report.photoUrls) && report.photoUrls.length > 0 && (
                                                        <img
                                                            src={report.photoUrls[0]}
                                                            alt="Citizen Evidence"
                                                            className="evidence-img"
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p>No reports attached.</p>
                                    )}
                                </div>

                                {/* Action Form */}
                                <div className="action-form-box" style={{ marginTop: '20px', borderTop: '1px solid #ccc', paddingTop: '15px' }}>
                                    <h4>Officer Verification Action</h4>

                                    <label style={{ display: 'block', margin: '8px 0' }}>
                                        <strong>Officer Notes (Min 5 chars):</strong>
                                        <textarea
                                            rows="2"
                                            style={{ width: '100%', marginTop: '4px' }}
                                            value={officerNotes}
                                            onChange={(e) => setOfficerNotes(e.target.value)}
                                            placeholder="Enter review notes or verification findings..."
                                        />
                                    </label>

                                    <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                                        <label>
                                            <strong>Severity Level:</strong>
                                            <select
                                                value={severityLevel}
                                                onChange={(e) => setSeverityLevel(e.target.value)}
                                                style={{ marginLeft: '8px' }}
                                            >
                                                <option value="LOW">LOW</option>
                                                <option value="MODERATE">MODERATE</option>
                                                <option value="HIGH">HIGH</option>
                                                <option value="CRITICAL">CRITICAL</option>
                                            </select>
                                        </label>

                                        <label>
                                            <strong>Rejection Reason Code (If rejecting):</strong>
                                            <select
                                                value={reasonCode}
                                                onChange={(e) => setReasonCode(e.target.value)}
                                                style={{ marginLeft: '8px' }}
                                            >
                                                <option value="">-- Select Reason --</option>
                                                <option value="SPAM_OR_FALSE_REPORT">Spam / False Report</option>
                                                <option value="INSUFFICIENT_EVIDENCE">Insufficient Evidence</option>
                                                <option value="OUT_OF_BOUNDS">Out of Bounds</option>
                                                <option value="RESOLVED_INCIDENT">Already Resolved</option>
                                            </select>
                                        </label>
                                    </div>

                                    <div className="action-bar" style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            className="btn-approve"
                                            onClick={() => handleExecuteAction('VERIFY')}
                                            style={{ background: '#16A34A', color: '#fff', padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                                        >
                                            ✅ Verify & Broadcast
                                        </button>
                                        <button
                                            className="btn-flag"
                                            onClick={() => handleExecuteAction('FLAG')}
                                            style={{ background: '#CA8A04', color: '#fff', padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                                        >
                                            🚩 Flag for Senior Escalation
                                        </button>
                                        <button
                                            className="btn-reject"
                                            onClick={() => handleExecuteAction('REJECT')}
                                            style={{ background: '#DC2626', color: '#fff', padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                                        >
                                            ❌ Reject Incident
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </VerificationErrorBoundary>
                    ) : (
                        <div className="placeholder-panel">
                            <p>👈 Select a hazard cluster from the queue on the left to lock and inspect details.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}