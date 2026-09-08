import { useAppStore } from './store/useAppStore';
import { LoginGate } from './components/LoginGate';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './screens/HomeScreen';
import MapScreen from './screens/MapScreen'; import { AiScreen } from './screens/AiScreen';
import { ChatScreen } from './screens/ChatScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { WeatherScreen } from './screens/WeatherScreen';
import { SOSModal } from './components/SOSModal';

export function App() {
  const { activeTab } = useAppStore();

  return (
    <>
      <LoginGate />
      <div className="h-[100dvh] w-full overflow-hidden bg-[#0f1535] font-['Inter',sans-serif] flex flex-col relative text-slate-100">
      <main className="flex-1 w-full h-full overflow-y-auto custom-scrollbar relative">
        {activeTab === 'home' && <HomeScreen />}
        {activeTab === 'map' && <MapScreen />}
        {activeTab === 'ai' && <AiScreen />}
        {activeTab === 'chat' && <ChatScreen />}
        {activeTab === 'profile' && <ProfileScreen />}
        {activeTab === 'weather' && <WeatherScreen />}
      </main>

      <BottomNav />
      <SOSModal />
    </div>
    </>
  );
}

export default App;
