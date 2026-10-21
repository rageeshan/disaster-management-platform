import React, { useState, useEffect } from 'react';
import './WarningCreationWizard.css';

const API_BASE = 'http://localhost:5001/api/warnings';

const HAZARD_TYPES = ['Flood', 'Tsunami', 'Landslide', 'Cyclone', 'Extreme Weather'];
const SEVERITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];
const AREA_TYPES = ['District', 'River Basin', 'Custom Geofence'];
const CHANNEL_OPTIONS = [
    { id: 'SMS', label: '📱 Emergency SMS Broadcast', desc: 'Cellular SMS push to all mobile towers in target zone' },
    { id: 'PUSH', label: '🔔 Mobile App Push Notification', desc: 'High-priority alert to citizen mobile applications' },
    { id: 'AUDIBLE', label: '🔊 Coastal & Community Siren Network', desc: 'Trigger high-decibel audible sirens & public address' },
];

export default function WarningCreationWizard({ officerToken, prefillData, onDisseminatedSuccess }) {
    const [step, setStep] = useState(1);

    // Form State
    const [hazardType, setHazardType] = useState('Flood');
    const [severity, setSeverity] = useState('High');
    const [warningMessage, setWarningMessage] = useState('');
    const [targetAreaType, setTargetAreaType] = useState('District');
    const [targetLocations, setTargetLocations] = useState(['Colombo']);
    const [locationInput, setLocationInput] = useState('');
    const [selectedChannels, setSelectedChannels] = useState(['SMS', 'PUSH']);
    const [estimatedRecipients, setEstimatedRecipients] = useState(null);

    // Loading & Modal State
    const [estimating, setEstimating] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showSafetyModal, setShowSafetyModal] = useState(false);

    // Auto Pre-fill when coming directly from Verified Cluster Handover Payload
    useEffect(() => {
        if (prefillData) {
            // Map hazard type format (e.g. FLOOD -> Flood)
            const mappedHazard = HAZARD_TYPES.find(
                (h) => h.toLowerCase() === (prefillData.hazardType || '').toLowerCase()
            ) || 'Flood';

            // Map severity level format (e.g. HIGH -> High)
            const mappedSeverity = SEVERITY_LEVELS.find(
                (s) => s.toLowerCase() === (prefillData.severityLevel || '').toLowerCase()
            ) || 'High';

            setHazardType(mappedHazard);
            setSeverity(mappedSeverity);

            if (prefillData.district) {
                setTargetLocations([prefillData.district]);
            }

            const initialMsg = `OFFICIAL DISASTER WARNING: Verified ${mappedHazard.toUpperCase()} threat in ${prefillData.district || 'target area'}. ${prefillData.officerNotes || 'Take immediate safety precautions and monitor official DMC broadcasts.'}`;
            setWarningMessage(initialMsg.slice(0, 500));
        }
    }, [prefillData]);

    // Step 2 Action: Call POST /api/warnings/estimate-recipients
    const handleEstimateRecipients = async () => {
        if (targetLocations.length === 0) {
            alert('Please specify at least one target location.');
            return;
        }

        setEstimating(true);
        try {
            const res = await fetch(`${API_BASE}/estimate-recipients`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${officerToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    targetAreaType,
                    targetLocations,
                }),
            });

            const data = await res.json();
            if (data.success) {
                setEstimatedRecipients(data.data?.estimatedRecipients || 0);
            } else {
                alert(data.message || 'Failed to estimate recipient coverage.');
            }
        } catch (err) {
            console.error('Estimate Recipients Error:', err);
            alert('Error connecting to recipient estimation service.');
        } finally {
            setEstimating(false);
        }
    };

    // Add target location tag
    const handleAddLocation = () => {
        if (locationInput.trim() && !targetLocations.includes(locationInput.trim())) {
            setTargetLocations([...targetLocations, locationInput.trim()]);
            setLocationInput('');
        }
    };

    // Remove location tag
    const handleRemoveLocation = (loc) => {
        setTargetLocations(targetLocations.filter((l) => l !== loc));
    };

    // Toggle Dissemination Channel Selection
    const toggleChannel = (channelId) => {
        if (selectedChannels.includes(channelId)) {
            if (selectedChannels.length === 1) {
                alert('At least one dissemination channel must be selected.');
                return;
            }
            setSelectedChannels(selectedChannels.filter((c) => c !== channelId));
        } else {
            setSelectedChannels([...selectedChannels, channelId]);
        }
    };

    // Step 3 Action: Call POST /api/warnings/disseminate
    const handleDisseminateWarning = async () => {
        if (warningMessage.trim().length === 0) {
            alert('Warning message cannot be empty.');
            return;
        }
        if (selectedChannels.length === 0) {
            alert('Select at least one dissemination channel.');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                hazardType,
                severity,
                warningMessage,
                targetAreaType,
                targetLocations,
                selectedChannels,
                issuedBy: 'DMC Duty Officer',
            };

            const res = await fetch(`${API_BASE}/disseminate`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${officerToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (data.success && data.data) {
                setShowSafetyModal(false);
                alert(`🚨 Official ${hazardType} Warning Disseminated Successfully!`);
                if (onDisseminatedSuccess) {
                    onDisseminatedSuccess(data.data);
                }
            } else {
                alert(data.message || 'Failed to issue hazard warning.');
            }
        } catch (err) {
            console.error('Disseminate Warning Error:', err);
            alert('Error submitting warning dissemination.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="wizard-container">
            <header className="wizard-header">
                <h2>📢 Official Early Warning Creation Wizard</h2>
                <p>Construct safety-gated hazard broadcasts for national multi-channel dissemination.</p>
            </header>

            {/* Stepper Progress Indicator */}
            <div className="wizard-stepper">
                <div className={`step-pill ${step >= 1 ? 'active' : ''}`} onClick={() => setStep(1)}>
                    <span>1</span> Hazard & Severity
                </div>
                <div className="step-connector" />
                <div className={`step-pill ${step >= 2 ? 'active' : ''}`} onClick={() => setStep(2)}>
                    <span>2</span> Target Geofence
                </div>
                <div className="step-connector" />
                <div className={`step-pill ${step >= 3 ? 'active' : ''}`} onClick={() => setStep(3)}>
                    <span>3</span> Channels & Broadcast
                </div>
            </div>

            {/* STEP 1: Hazard Details & Warning Message */}
            {step === 1 && (
                <div className="wizard-step-box">
                    <h3>Step 1: Hazard Classification & Message</h3>

                    <div className="form-group-row">
                        <div className="form-group">
                            <label>Hazard Type:</label>
                            <select value={hazardType} onChange={(e) => setHazardType(e.target.value)}>
                                {HAZARD_TYPES.map((h) => (
                                    <option key={h} value={h}>{h}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Severity Level:</label>
                            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={`severity-select ${severity}`}>
                                {SEVERITY_LEVELS.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '16px' }}>
                        <label>
                            Official Warning Message (Max 500 chars):
                            <span className="char-count">{warningMessage.length}/500</span>
                        </label>
                        <textarea
                            rows="4"
                            maxLength={500}
                            value={warningMessage}
                            onChange={(e) => setWarningMessage(e.target.value)}
                            placeholder="Enter clear, concise public emergency warning instructions..."
                        />
                    </div>

                    <div className="wizard-footer">
                        <button className="btn-next" onClick={() => setStep(2)}>
                            Next: Geofence Target →
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 2: Geofencing Target & Recipient Estimation */}
            {step === 2 && (
                <div className="wizard-step-box">
                    <h3>Step 2: Geofencing & Coverage Estimation</h3>

                    <div className="form-group">
                        <label>Target Area Type:</label>
                        <select value={targetAreaType} onChange={(e) => setTargetAreaType(e.target.value)}>
                            {AREA_TYPES.map((a) => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group" style={{ marginTop: '14px' }}>
                        <label>Target Locations / Zones:</label>
                        <div className="location-input-row">
                            <input
                                type="text"
                                value={locationInput}
                                onChange={(e) => setLocationInput(e.target.value)}
                                placeholder="Add district or basin (e.g. Gampaha)..."
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLocation())}
                            />
                            <button type="button" onClick={handleAddLocation} className="btn-add-loc">
                                ➕ Add
                            </button>
                        </div>

                        <div className="location-tags">
                            {targetLocations.map((loc) => (
                                <span key={loc} className="loc-tag">
                                    📍 {loc}
                                    <button type="button" onClick={() => handleRemoveLocation(loc)}>✕</button>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="estimation-card" style={{ marginTop: '20px' }}>
                        <div className="estimation-info">
                            <h4>👥 Estimated Citizen Coverage</h4>
                            <p>Calculates active subscribers & mobile towers within target geofence.</p>
                            {estimatedRecipients !== null && (
                                <p className="recipient-stat">
                                    Target Coverage: <strong>{estimatedRecipients.toLocaleString()} citizens</strong>
                                </p>
                            )}
                        </div>
                        <button onClick={handleEstimateRecipients} disabled={estimating} className="btn-estimate">
                            {estimating ? 'Calculating...' : '⚡ Estimate Coverage'}
                        </button>
                    </div>

                    <div className="wizard-footer">
                        <button className="btn-prev" onClick={() => setStep(1)}>
                            ← Back
                        </button>
                        <button className="btn-next" onClick={() => setStep(3)}>
                            Next: Channel Selection →
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: Multi-Channel Dissemination & Safety-Gated Confirmation */}
            {step === 3 && (
                <div className="wizard-step-box">
                    <h3>Step 3: Multi-Channel Dissemination</h3>

                    <div className="channels-grid">
                        {CHANNEL_OPTIONS.map((ch) => {
                            const isSelected = selectedChannels.includes(ch.id);
                            return (
                                <div
                                    key={ch.id}
                                    className={`channel-card ${isSelected ? 'selected' : ''}`}
                                    onClick={() => toggleChannel(ch.id)}
                                >
                                    <div className="ch-top">
                                        <strong>{ch.label}</strong>
                                        <span className="ch-checkbox">{isSelected ? '☑' : '☐'}</span>
                                    </div>
                                    <p>{ch.desc}</p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="summary-preview-box" style={{ marginTop: '20px' }}>
                        <h4>📋 Emergency Broadcast Summary</h4>
                        <p><strong>Hazard:</strong> {hazardType} ({severity} Severity)</p>
                        <p><strong>Geofence:</strong> {targetAreaType} ({targetLocations.join(', ')})</p>
                        <p><strong>Message:</strong> "{warningMessage}"</p>
                        <p><strong>Channels:</strong> {selectedChannels.join(', ')}</p>
                    </div>

                    <div className="wizard-footer">
                        <button className="btn-prev" onClick={() => setStep(2)}>
                            ← Back
                        </button>
                        <button className="btn-broadcast" onClick={() => setShowSafetyModal(true)}>
                            🚨 DISSEMINATE EMERGENCY WARNING
                        </button>
                    </div>
                </div>
            )}

            {/* Safety-Gated Confirmation Modal */}
            {showSafetyModal && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <header className="modal-header warning">
                            <h3>⚠️ Safety-Gated Dissemination Confirmation</h3>
                        </header>
                        <div className="modal-body">
                            <p>
                                You are about to initiate an official <strong>{severity} {hazardType} Emergency Warning</strong> across <strong>{selectedChannels.join(', ')}</strong>.
                            </p>
                            <p style={{ background: '#FEF3C7', padding: '10px', borderRadius: '6px', color: '#B45309', fontSize: '13px' }}>
                                🔔 This action will send immediate alerts to citizens and trigger sirens in the targeted areas.
                            </p>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowSafetyModal(false)} disabled={submitting}>
                                Cancel
                            </button>
                            <button className="btn-confirm-disseminate" onClick={handleDisseminateWarning} disabled={submitting}>
                                {submitting ? 'Broadcasting...' : '✅ CONFIRM & BROADCAST'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
