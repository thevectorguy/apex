import { useEffect, useState } from 'react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { Screen } from './types';
import { TopAppBar } from './components/TopAppBar';
import { BottomNavBar } from './components/BottomNavBar';
import { FloatingActionButton } from './components/FloatingActionButton';
import { DashboardScreen } from './screens/DashboardScreen';
import { CatalogScreen } from './screens/CatalogScreen';
import { BrochuresScreen } from './screens/BrochuresScreen';
import { CommunicationsScreen } from './screens/CommunicationsScreen';
import { PitchPracticeScreen } from './screens/PitchPracticeScreen';
import { LiveScenarioScreen } from './screens/LiveScenarioScreen';
import { StudioConfigScreen } from './screens/StudioConfigScreen';
import { MyCoachScreen } from './screens/MyCoachScreen';
import { MyCoachRecommendationsScreen } from './screens/MyCoachRecommendationsScreen';
import { MyCoachRecordingScreen } from './screens/MyCoachRecordingScreen';
import { MyCoachProcessingScreen } from './screens/MyCoachProcessingScreen';
import { MyCoachReportsScreen } from './screens/MyCoachReportsScreen';
import { MyCoachReportDetailScreen } from './screens/MyCoachReportDetailScreen';
import { MyCoachReportSectionScreen } from './screens/MyCoachReportSectionScreen';
import { MyCoachReportSpeedScreen } from './screens/MyCoachReportSpeedScreen';
import { MyCoachCustomersScreen } from './screens/MyCoachCustomersScreen';
import { MyCoachStepsScreen } from './screens/MyCoachStepsScreen';
import { MyCoachTranscriptScreen } from './screens/MyCoachTranscriptScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { AIAssistantSheet } from './components/AIAssistantSheet';
import { AppSidebar } from './components/AppSidebar';
import { getScreenFromLocation, navigateToScreen } from './lib/appRouter';

const pageVariants = {
  initial: { opacity: 0, x: 20, scale: 0.98 },
  animate: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 30 } },
  exit: { opacity: 0, x: -20, scale: 0.98, transition: { duration: 0.2 } }
} satisfies Variants;

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>(() =>
    typeof window === 'undefined' ? 'dashboard' : getScreenFromLocation(window.location),
  );
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncRoute = () => {
      setCurrentScreen(getScreenFromLocation(window.location));
      setIsSidebarOpen(false);
    };
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('app:navigation', syncRoute);

    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('app:navigation', syncRoute);
    };
  }, []);

  function handleNavigate(screen: Screen) {
    const preserveSearch =
      screen.startsWith('my_coach') || screen === 'studio_config' || screen === 'live_scenario';
    navigateToScreen(screen, { preserveSearch });
    setCurrentScreen(screen);
    setIsSidebarOpen(false);
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard': return <DashboardScreen onNavigate={handleNavigate} />;
      case 'profile': return <ProfileScreen onNavigate={handleNavigate} />;
      case 'my_coach': return <MyCoachScreen onNavigate={handleNavigate} />;
      case 'my_coach_recommendations': return <MyCoachRecommendationsScreen onNavigate={handleNavigate} />;
      case 'my_coach_recording': return <MyCoachRecordingScreen onNavigate={handleNavigate} />;
      case 'my_coach_processing': return <MyCoachProcessingScreen onNavigate={handleNavigate} />;
      case 'my_coach_reports': return <MyCoachReportsScreen onNavigate={handleNavigate} />;
      case 'my_coach_report_detail': return <MyCoachReportDetailScreen onNavigate={handleNavigate} />;
      case 'my_coach_report_section': return <MyCoachReportSectionScreen onNavigate={handleNavigate} />;
      case 'my_coach_report_speed': return <MyCoachReportSpeedScreen onNavigate={handleNavigate} />;
      case 'my_coach_customers': return <MyCoachCustomersScreen onNavigate={handleNavigate} />;
      case 'my_coach_steps': return <MyCoachStepsScreen onNavigate={handleNavigate} />;
      case 'my_coach_transcript': return <MyCoachTranscriptScreen onNavigate={handleNavigate} />;
      case 'catalog': return <CatalogScreen onNavigate={handleNavigate} />;
      case 'brochures': return <BrochuresScreen onNavigate={handleNavigate} />;
      case 'communications': return <CommunicationsScreen onNavigate={handleNavigate} />;
      case 'pitch_practice': return <PitchPracticeScreen onNavigate={handleNavigate} />;
      case 'live_scenario': return <LiveScenarioScreen onNavigate={handleNavigate} />;
      case 'studio_config': return <StudioConfigScreen onNavigate={handleNavigate} />;
      default: return <DashboardScreen onNavigate={handleNavigate} />;
    }
  };

  const isImmersive =
    currentScreen === 'live_scenario' ||
    currentScreen === 'studio_config' ||
    currentScreen === 'my_coach_customers' ||
    currentScreen === 'my_coach_recording' ||
    currentScreen === 'my_coach_processing' ||
    currentScreen === 'my_coach_report_detail' ||
    currentScreen === 'my_coach_report_section' ||
    currentScreen === 'my_coach_report_speed' ||
    currentScreen === 'my_coach_steps' ||
    currentScreen === 'my_coach_transcript';
  const showSidebarTrigger = !isImmersive && currentScreen !== 'dashboard';

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body selection:bg-primary/30 overflow-x-hidden relative">
      {!isImmersive && (
        <TopAppBar
          onNavigate={handleNavigate}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          showMenuButton={showSidebarTrigger}
        />
      )}

      {!isImmersive && (
        <AppSidebar
          currentScreen={currentScreen}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onNavigate={handleNavigate}
        />
      )}
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="w-full h-full"
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>

      {!isImmersive && <FloatingActionButton onClick={() => setIsAssistantOpen(true)} />}
      {!isImmersive && <BottomNavBar currentScreen={currentScreen} onNavigate={handleNavigate} />}

      <AIAssistantSheet
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        currentScreen={currentScreen}
      />
    </div>
  );
}
