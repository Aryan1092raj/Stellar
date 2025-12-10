'use client';

import { useState, useEffect } from 'react';
import { enableDemoMode, disableDemoMode, isDemoMode, connectDemoWallet } from '@/lib/stellar/demo-wallet';

interface DemoAccount {
  publicKey: string;
  name: string;
  balance: string;
  type: string;
}

export default function DemoModeToggle() {
  const [isDemo, setIsDemo] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(0);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsDemo(isDemoMode());
    if (isDemoMode()) {
      fetchDemoAccounts();
    }
  }, []);

  const fetchDemoAccounts = async () => {
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await fetch(`${API_URL}/api/demo/accounts`);
      const data = await response.json();
      if (data.success && data.accounts) {
        setDemoAccounts(data.accounts);
      }
    } catch (error) {
      console.error('Failed to fetch demo accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!isDemo) {
      enableDemoMode();
      setIsDemo(true);
      setShowAccountPicker(true);
      await fetchDemoAccounts();
    } else {
      disableDemoMode();
      setIsDemo(false);
      setShowAccountPicker(false);
      setDemoAccounts([]);
    }
  };

  const handleSelectAccount = async (index: number) => {
    setSelectedAccount(index);
    const account = demoAccounts[index];
    const result = await connectDemoWallet(index);
    console.log('Connected to demo account:', result);
    setShowAccountPicker(false);
    
    // Trigger wallet connection event with full account details
    window.dispatchEvent(new CustomEvent('demo-wallet-connected', { 
      detail: {
        ...result,
        publicKey: account.publicKey,
        balance: account.balance,
        name: account.name,
      }
    }));
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-4 border-2 border-purple-500">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎭</span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-700">Demo Mode</span>
            <span className="text-xs text-gray-500">
              {isDemo ? 'Active' : 'Inactive'}
            </span>
          </div>
          <button
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isDemo ? 'bg-purple-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isDemo ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {isDemo && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <button
              onClick={() => setShowAccountPicker(!showAccountPicker)}
              className="w-full px-3 py-2 text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-md transition-colors"
            >
              {showAccountPicker ? 'Hide Accounts' : 'Select Demo Account'}
            </button>
          </div>
        )}
      </div>

      {showAccountPicker && isDemo && (
        <div className="mt-2 bg-white rounded-lg shadow-lg p-4 border-2 border-purple-500 max-w-md">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Choose Demo Account
          </h3>
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading accounts...</p>
            </div>
          ) : (
          <div className="space-y-2">
            {demoAccounts.map((account, index) => (
              <button
                key={account.publicKey}
                onClick={() => handleSelectAccount(index)}
                className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                  selectedAccount === index
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300 bg-white'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-sm text-gray-800">
                      {account.name}
                    </p>
                    <p className="text-xs text-gray-500 font-mono mt-1">
                      {account.publicKey.substring(0, 10)}...
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">
                      {parseFloat(account.balance).toFixed(2)} XLM
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          )}
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              ⚠️ <strong>Demo Mode:</strong> These are simulated wallets for demonstration purposes only. No real transactions will occur.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
