
import React, { useState, useEffect } from 'react';
import { Shield, Fingerprint, Delete, Lock, Unlock } from 'lucide-react';

interface VaultLockProps {
  savedPin: string;
  useBiometrics: boolean;
  onUnlock: () => void;
}

const VaultLock: React.FC<VaultLockProps> = ({ savedPin, useBiometrics, onUnlock }) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);

  useEffect(() => {
    // Check if biometrics are available on the device
    if (window.PublicKeyCredential && useBiometrics) {
      setIsBiometricAvailable(true);
      handleBiometricUnlock();
    }
  }, []);

  const handleBiometricUnlock = async () => {
    try {
      // In a real app, we'd use a proper WebAuthn challenge. 
      // For this demo, we simulate the biometric prompt success.
      if (window.confirm("Use your Fingerprint/Face ID to unlock DigiPocket?")) {
        onUnlock();
      }
    } catch (err) {
      console.error("Biometric failed", err);
    }
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      
      if (newPin.length === 4) {
        if (newPin === savedPin) {
          onUnlock();
        } else {
          setError(true);
          setTimeout(() => setPin(''), 500);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="absolute top-0 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-sm flex flex-col items-center text-center relative z-10">
        <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mb-8 transition-all duration-300 shadow-2xl ${error ? 'bg-red-500 shake' : 'bg-indigo-600 shadow-indigo-500/20'}`}>
          {pin.length === 4 && !error ? <Unlock className="text-white w-10 h-10" /> : <Lock className="text-white w-10 h-10" />}
        </div>

        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Vault Locked</h1>
        <p className="text-slate-400 font-medium mb-10">Enter your 4-digit PIN to access your data</p>

        {/* PIN Indicators */}
        <div className="flex gap-4 mb-12">
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                pin.length > i 
                  ? (error ? 'bg-red-500 border-red-500 scale-125' : 'bg-indigo-500 border-indigo-500 scale-125') 
                  : 'border-slate-700'
              }`} 
            />
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-6 w-full px-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button 
              key={num} 
              onClick={() => handleKeyPress(num.toString())}
              className="w-full aspect-square bg-white/5 hover:bg-white/10 active:bg-white/20 text-white text-2xl font-black rounded-2xl border border-white/5 transition-all active:scale-90"
            >
              {num}
            </button>
          ))}
          <button 
            onClick={handleBiometricUnlock}
            disabled={!isBiometricAvailable}
            className={`w-full aspect-square flex items-center justify-center transition-all ${isBiometricAvailable ? 'text-indigo-400 hover:bg-white/10 rounded-2xl active:scale-90' : 'text-slate-800'}`}
          >
            <Fingerprint className="w-8 h-8" />
          </button>
          <button 
            onClick={() => handleKeyPress('0')}
            className="w-full aspect-square bg-white/5 hover:bg-white/10 active:bg-white/20 text-white text-2xl font-black rounded-2xl border border-white/5 transition-all active:scale-90"
          >
            0
          </button>
          <button 
            onClick={handleDelete}
            className="w-full aspect-square flex items-center justify-center text-slate-400 hover:bg-white/10 rounded-2xl active:scale-90 transition-all"
          >
            <Delete className="w-7 h-7" />
          </button>
        </div>

        <button className="mt-12 text-slate-500 font-bold text-sm hover:text-white transition-colors">
          Forgot PIN?
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}} />
    </div>
  );
};

export default VaultLock;
