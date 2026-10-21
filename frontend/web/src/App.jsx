import React, { useState } from 'react';
import './App.css';
import OfficerLogin from './components/OfficerLogin';
import VerificationQueue from './components/VerificationQueue';
import WarningCreationWizard from './components/WarningCreationWizard';
import DeliveryMonitoringDashboard from './components/DeliveryMonitoringDashboard';
import EmergencyCoordinationDashboard from './components/EmergencyCoordinationDashboard';
import PostEventAnalysisDashboard from './components/PostEventAnalysisDashboard';

function App() {
    // Session state
    const [session, setSession] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('INCIDENT_VERIFICATION');

    // Handover & Telemetry state
    const [handoverData, setHandoverData] = useState(null);
    const [activeWarningId, setActiveWarningId] = useState(null);

    const handleLoginSuccess = (token, user) => {
        setSession({ token, user });
    };

    const handleLogout = () => {
        setSession(null);
    };

    // Callback when a cluster is verified in Module 1 (Verification Queue)
    const handleHandoverVerifiedCluster = (payload) => {
        setHandoverData(payload);
        setActiveTab('WARNING_WIZARD');
    };

    // Callback when a warning is issued in Module 2 Wizard
    const handleDisseminatedSuccess = (warningRecord) => {
        if (warningRecord?._id) {
            setActiveWarningId(warningRecord._id);
            setActiveTab('DELIVERY_MONITORING');
        }
    };

    if (!session) {
        return <OfficerLogin onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <div className="App">
            {/* Top Navigation Header */}
            <header className="app-topbar">
                <div className="app-topbar-left">
                    <button
                        className="sidebar-toggle-btn"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        title="Toggle Sidebar Navigation"
                    >
                        {sidebarOpen ? '◀' : '☰'}
                    </button>
                    <span className="app-topbar-title">🛡️ Disaster Management Command Center</span>
                </div>
                <div className="app-topbar-right">
                    <span className="app-topbar-user">
                        {session.user?.fullName || session.user?.email || 'Officer'} &nbsp;·&nbsp;
                        <strong>{session.user?.role}</strong>
                    </span>
                    <button className="app-logout-btn" onClick={handleLogout}>
                        Sign Out
                    </button>
                </div>
            </header>

            {/* Layout Container: Side Panel + Main Workspace */}
            <div className="app-layout">
                {/* Side Navigation Panel */}
                <aside className={`app-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                    <div className="sidebar-header">
                        <p className="sidebar-subtitle">DMC Operational Navigation</p>
                    </div>

                    <nav className="sidebar-nav">
                        <button
                            className={`nav-item ${activeTab === 'INCIDENT_VERIFICATION' ? 'active' : ''}`}
                            onClick={() => setActiveTab('INCIDENT_VERIFICATION')}
                        >
                            <span className="nav-icon">🛡️</span>
                            <span className="nav-text">Incident Verification</span>
                            <span className="nav-badge">LIVE</span>
                        </button>

                        <button
                            className={`nav-item ${activeTab === 'WARNING_WIZARD' ? 'active' : ''}`}
                            onClick={() => setActiveTab('WARNING_WIZARD')}
                        >
                            <span className="nav-icon">📢</span>
                            <span className="nav-text">Early Warning Creation</span>
                            {handoverData && <span className="nav-badge yellow">PRE-FILLED</span>}
                        </button>

                        <button
                            className={`nav-item ${activeTab === 'DELIVERY_MONITORING' ? 'active' : ''}`}
                            onClick={() => setActiveTab('DELIVERY_MONITORING')}
                        >
                            <span className="nav-icon">📡</span>
                            <span className="nav-text">Multi-Channel Telemetry</span>
                        </button>

                        <button
                            className={`nav-item ${activeTab === 'IOT_SENSORS' ? 'active' : ''}`}
                            onClick={() => setActiveTab('IOT_SENSORS')}
                        >
                            <span className="nav-icon">⚡</span>
                            <span className="nav-text">IoT Telemetry Sensors</span>
                        </button>

                        <button
                            className={`nav-item ${activeTab === 'EMERGENCY_RESPONSE' ? 'active' : ''}`}
                            onClick={() => setActiveTab('EMERGENCY_RESPONSE')}
                        >
                            <span className="nav-icon">🚒</span>
                            <span className="nav-text">Emergency Response</span>
                        </button>

                        <button
                            className={`nav-item ${activeTab === 'POST_EVENT_ANALYSIS' ? 'active' : ''}`}
                            onClick={() => setActiveTab('POST_EVENT_ANALYSIS')}
                        >
                            <span className="nav-icon">📊</span>
                            <span className="nav-text">Post-Event Analysis</span>
                        </button>
                    </nav>

                    <div className="sidebar-footer">
                        <p>DMC Platform v2.0</p>
                        <small>Connected to Backend Port 5001</small>
                    </div>
                </aside>

                {/* Main Content Workspace Area */}
                <main className="app-main-content">
                    {activeTab === 'INCIDENT_VERIFICATION' && (
                        <VerificationQueue
                            officerToken={session.token}
                            onHandoverVerifiedCluster={handleHandoverVerifiedCluster}
                        />
                    )}

                    {activeTab === 'WARNING_WIZARD' && (
                        <WarningCreationWizard
                            officerToken={session.token}
                            prefillData={handoverData}
                            onDisseminatedSuccess={handleDisseminatedSuccess}
                        />
                    )}

                    {activeTab === 'DELIVERY_MONITORING' && (
                        <DeliveryMonitoringDashboard
                            officerToken={session.token}
                            warningId={activeWarningId}
                            onBackToWizard={() => setActiveTab('WARNING_WIZARD')}
                        />
                    )}

                    {activeTab === 'IOT_SENSORS' && (
                        <div className="tab-placeholder-card">
                            <h2>⚡ IoT Telemetry Sensors</h2>
                            <p>Real-time telemetry stream from river water gauges, rain gauges, and soil movement sensors.</p>
                            <button className="placeholder-switch-btn" onClick={() => setActiveTab('INCIDENT_VERIFICATION')}>
                                Open Incident Verification Queue →
                            </button>
                        </div>
                    )}

                    {activeTab === 'EMERGENCY_RESPONSE' && (
                        <EmergencyCoordinationDashboard
                            officerToken={session.token}
                        />
                    )}

                    {activeTab === 'POST_EVENT_ANALYSIS' && (
                        <PostEventAnalysisDashboard officerToken={session.token} />
                    )}
                </main>
            </div>
        </div>
    );
}

export default App;