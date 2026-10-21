import React, { useState } from 'react';
import WelcomeScreen from '../screens/WelcomeScreen';
import AuthScreen from '../screens/AuthScreen';
import ExpressReportScreen from '../screens/ExpressReportScreen';
import DetailedReportScreen from '../screens/DetailedReportScreen';
import LiveMapScreen from '../screens/LiveMapScreen';
import MyReportsScreen from '../screens/MyReportsScreen';

export default function AppNavigator() {
    const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
    // null = not logged in → shows AuthScreen
    const [userSession, setUserSession] = useState(null);
    const [currentScreen, setCurrentScreen] = useState('EXPRESS_REPORT');

    const handleLoginSuccess = (token, user) => {
        setUserSession({ token, user, isGuest: false });
    };

    const handleContinueAsGuest = () => {
        setUserSession({ token: null, user: null, isGuest: true });
    };

    const handleLogout = () => {
        setUserSession(null);
        setCurrentScreen('EXPRESS_REPORT');
    };

    const handleNavigate = (screen) => {
        setCurrentScreen(screen);
    };

    // Show WelcomeScreen first
    if (!hasSeenWelcome) {
        return <WelcomeScreen onContinue={() => setHasSeenWelcome(true)} />;
    }

    // Show login/register screen until user authenticates or continues as guest
    if (!userSession) {
        return (
            <AuthScreen
                onLoginSuccess={handleLoginSuccess}
                onContinueAsGuest={handleContinueAsGuest}
            />
        );
    }

    return (
        <>
            {currentScreen === 'EXPRESS_REPORT' && (
                <ExpressReportScreen
                    userSession={userSession}
                    onBackToAuth={handleLogout}
                    onSwitchToDetailed={() => handleNavigate('DETAILED_REPORT')}
                    onOpenLiveMap={() => handleNavigate('LIVE_MAP')}
                    onOpenMyReports={() => handleNavigate('MY_REPORTS')}
                />
            )}

            {currentScreen === 'DETAILED_REPORT' && (
                <DetailedReportScreen
                    userSession={userSession}
                    onBackToAuth={handleLogout}
                    onSwitchToExpress={() => handleNavigate('EXPRESS_REPORT')}
                    onOpenLiveMap={() => handleNavigate('LIVE_MAP')}
                    onOpenMyReports={() => handleNavigate('MY_REPORTS')}
                />
            )}

            {currentScreen === 'LIVE_MAP' && (
                <LiveMapScreen
                    onBackToReport={() => handleNavigate('EXPRESS_REPORT')}
                />
            )}

            {currentScreen === 'MY_REPORTS' && (
                <MyReportsScreen
                    userSession={userSession}
                    onBackToReport={() => handleNavigate('EXPRESS_REPORT')}
                />
            )}
        </>
    );
}