import { useState, useRef } from 'react';
import { useAppStore } from './store/useAppStore';
import { MainScreen } from './screens/MainScreen';
import { AlertTriangle, X } from 'lucide-react';

function App() {
  const { location } = useAppStore();
  const [sosState, setSosState] = useState<'idle' | 'holding' | 'active'>('idle');
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<number | null>(null);

  const startHold = () => {
    if (sosState === 'active') return;
    setSosState('holding');
    setHoldProgress(0);
    
    let progress = 0;
    holdTimerRef.current = window.setInterval(() => {
      progress += 1.66; // 3 seconds total
      setHoldProgress((prev) => {
        const next = prev + 1.66;
        if (next >= 100) {
          clearInterval(holdTimerRef.current!);
          setSosState('active');
          return 100;
        }
        return next;
      });
    }, 50);
  };

  const cancelHold = () => {
    if (sosState === 'active') return;
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    setSosState('idle');
    setHoldProgress(0);
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-marine-900 selection:bg-marine-200 font-sans">
      <div className="h-full w-full relative max-w-md mx-auto bg-black shadow-2xl">
        
        {/* The single universal map experience */}
        <MainScreen />

        {/* Global Floating SOS Button */}
        <button 
          onPointerDown={startHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          className="fixed bottom-24 right-4 z-[60] bg-white/95 backdrop-blur border border-danger/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-full px-3 py-2 flex items-center space-x-2 active:scale-95 transition-transform select-none"
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-danger animate-pulse"></div>
          <span className="text-danger font-extrabold text-[10px] tracking-widest uppercase">SOS</span>
          
          {sosState === 'holding' && (
            <div 
              className="absolute inset-0 rounded-full border-2 border-danger transition-all duration-75"
              style={{ clipPath: `inset(0 ${100 - holdProgress}% 0 0)` }}
            ></div>
          )}
        </button>

        {/* SOS Active Overlay */}
        {sosState === 'active' && (
          <div className="absolute inset-0 z-[100] bg-danger text-white flex flex-col p-6 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-start mb-12 mt-8">
              <div className="flex items-center space-x-3">
                <AlertTriangle size={32} className="animate-pulse" />
                <h1 className="text-3xl font-black tracking-widest uppercase">SOS ACTIVE</h1>
              </div>
              <button 
                onClick={() => { setSosState('idle'); setHoldProgress(0); }}
                className="bg-white/20 p-2 rounded-full active:bg-white/30 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6 flex-1">
              <div className="bg-black/20 rounded-2xl p-5 backdrop-blur-sm">
                <h2 className="text-xs font-bold tracking-widest text-white/70 uppercase mb-1">Broadcasting Status</h2>
                <p className="text-xl font-bold animate-pulse">Transmitting via Satellite...</p>
              </div>

              <div className="bg-black/20 rounded-2xl p-5 backdrop-blur-sm space-y-4">
                <div>
                  <h2 className="text-xs font-bold tracking-widest text-white/70 uppercase mb-1">Your Coordinates</h2>
                  <p className="text-2xl font-bold font-mono">{location?.lat.toFixed(4)}° N, {location?.lng.toFixed(4)}° E</p>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <h2 className="text-xs font-bold tracking-widest text-white/70 uppercase mb-1">Nearest Rescue Hub</h2>
                  <p className="text-xl font-bold">Mangaluru Coast Guard Station</p>
                  <p className="text-sm font-medium mt-1 text-white/90">Distance: 12.4 km</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => { setSosState('idle'); setHoldProgress(0); }}
              className="w-full bg-white text-danger font-black text-lg py-5 rounded-full shadow-2xl active:scale-95 transition-transform uppercase tracking-wider mb-8"
            >
              Cancel Emergency
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
