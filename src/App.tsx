import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Screen } from './types';
import { TopAppBar } from './components/TopAppBar';
import { BottomNavBar } from './components/BottomNavBar';
import { FloatingActionButton } from './components/FloatingActionButton';
import { DashboardScreen } from './screens/DashboardScreen';
import { CatalogScreen } from './screens/CatalogScreen';
import { CommunicationsScreen } from './screens/CommunicationsScreen';
import { PitchPracticeScreen } from './screens/PitchPracticeScreen';
import { LiveScenarioScreen } from './screens/LiveScenarioScreen';
import { StudioConfigScreen } from './screens/StudioConfigScreen';
import { AIAssistantSheet } from './components/AIAssistantSheet';

const pageVariants = {
  initial: { opacity: 0, x: 20, scale: 0.98 },
  animate: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 30 } },
  exit: { opacity: 0, x: -20, scale: 0.98, transition: { duration: 0.2 } }
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  if (typeof window !== 'undefined') {
    (window as any).navigate = setCurrentScreen;
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard': return <DashboardScreen onNavigate={setCurrentScreen} />;
      case 'catalog': return <CatalogScreen onNavigate={setCurrentScreen} />;
      case 'communications': return <CommunicationsScreen onNavigate={setCurrentScreen} />;
      case 'pitch_practice': return <PitchPracticeScreen onNavigate={setCurrentScreen} />;
      case 'live_scenario': return <LiveScenarioScreen onNavigate={setCurrentScreen} />;
      case 'studio_config': return <StudioConfigScreen onNavigate={setCurrentScreen} />;
      default: return <DashboardScreen onNavigate={setCurrentScreen} />;
    }
  };

  const isImmersive = currentScreen === 'live_scenario' || currentScreen === 'studio_config';

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body selection:bg-primary/30 overflow-x-hidden relative">
      {!isImmersive && <TopAppBar />}
      
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
      {!isImmersive && <BottomNavBar currentScreen={currentScreen} onNavigate={setCurrentScreen} />}

      <AIAssistantSheet isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} />
    </div>
  );
}
