import { Router, Request, Response } from "express";
import { DEMO_WALLETS, DEMO_WALLET_BALANCES, getDemoWallet, isDemoWallet } from "../demo-data";
import { mockDonationsRef } from "./donations";

const router = Router();

// Get all demo accounts (wallets)
router.get('/accounts', (_req: Request, res: Response) => {
  const accounts = DEMO_WALLETS.map(wallet => ({
    publicKey: wallet.publicKey,
    name: wallet.name,
    type: wallet.type,
    balance: DEMO_WALLET_BALANCES.get(wallet.publicKey) || parseFloat(wallet.balance),
  }));
  
  res.json({
    accounts,
    total: accounts.length,
    donors: accounts.filter(a => a.type === 'donor').length,
    ngos: accounts.filter(a => a.type === 'ngo').length,
  });
});

// Get wallet balance
router.get('/balance/:publicKey', (req: Request, res: Response) => {
  const { publicKey } = req.params;
  
  if (!isDemoWallet(publicKey)) {
    return res.status(404).json({ error: 'Not a demo wallet' });
  }
  
  const balance = DEMO_WALLET_BALANCES.get(publicKey);
  const wallet = getDemoWallet(publicKey);
  
  if (!wallet) {
    return res.status(404).json({ error: 'Wallet not found' });
  }
  
  res.json({
    publicKey,
    name: wallet.name,
    type: wallet.type,
    balance: balance !== undefined ? balance.toFixed(7) : wallet.balance,
    balanceXLM: balance !== undefined ? balance : parseFloat(wallet.balance),
  });
});

// Process demo donation (updates balances)
router.post('/donate', (req: Request, res: Response) => {
  const { donor_wallet, ngo_wallet, amount, message, location } = req.body;
  
  // Validate
  if (!donor_wallet || !ngo_wallet || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  if (!isDemoWallet(donor_wallet) || !isDemoWallet(ngo_wallet)) {
    return res.status(400).json({ error: 'Invalid demo wallets' });
  }
  
  const donorBalance = DEMO_WALLET_BALANCES.get(donor_wallet);
  const ngoBalance = DEMO_WALLET_BALANCES.get(ngo_wallet);
  
  if (donorBalance === undefined || ngoBalance === undefined) {
    return res.status(404).json({ error: 'Wallet balance not found' });
  }
  
  const donationAmount = parseFloat(amount);
  
  if (donorBalance < donationAmount) {
    return res.status(400).json({ 
      error: 'Insufficient balance',
      available: donorBalance,
      required: donationAmount,
    });
  }
  
  // Update balances
  DEMO_WALLET_BALANCES.set(donor_wallet, donorBalance - donationAmount);
  DEMO_WALLET_BALANCES.set(ngo_wallet, ngoBalance + donationAmount);
  
  // Create donation record
  const donation = {
    id: mockDonationsRef.length + 1,
    donor_public_key: donor_wallet,
    ngo_wallet: ngo_wallet,
    amount: donationAmount,
    status: 'completed',
    chain_create_tx: `demo_tx_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    donor_lat: location?.lat || null,
    donor_lng: location?.lng || null,
    message: message || null,
    created_at: new Date().toISOString(),
  };
  
  mockDonationsRef.push(donation);
  
  res.json({
    success: true,
    donation,
    newBalances: {
      donor: DEMO_WALLET_BALANCES.get(donor_wallet),
      ngo: DEMO_WALLET_BALANCES.get(ngo_wallet),
    },
    transaction: donation.chain_create_tx,
  });
});

// Get demo wallet by public key
router.get('/wallet/:publicKey', (req: Request, res: Response) => {
  const { publicKey } = req.params;
  const wallet = getDemoWallet(publicKey);
  
  if (!wallet) {
    return res.status(404).json({ error: 'Demo wallet not found' });
  }
  
  const currentBalance = DEMO_WALLET_BALANCES.get(publicKey);
  
  res.json({
    publicKey: wallet.publicKey,
    name: wallet.name,
    type: wallet.type,
    balance: currentBalance !== undefined ? currentBalance.toFixed(7) : wallet.balance,
    balanceXLM: currentBalance !== undefined ? currentBalance : parseFloat(wallet.balance),
  });
});

// Reset all demo wallet balances to original amounts
router.post('/reset', (_req: Request, res: Response) => {
  DEMO_WALLETS.forEach(wallet => {
    DEMO_WALLET_BALANCES.set(wallet.publicKey, parseFloat(wallet.balance));
  });
  
  res.json({
    success: true,
    message: 'All demo wallet balances reset to original amounts',
    balances: Array.from(DEMO_WALLET_BALANCES.entries()).map(([key, value]) => ({
      publicKey: key,
      balance: value,
    })),
  });
});

// Get demo mode status
router.get('/status', (_req: Request, res: Response) => {
  res.json({
    demoMode: true,
    totalWallets: DEMO_WALLETS.length,
    donors: DEMO_WALLETS.filter(w => w.type === 'donor').length,
    ngos: DEMO_WALLETS.filter(w => w.type === 'ngo').length,
    totalBalance: Array.from(DEMO_WALLET_BALANCES.values()).reduce((sum, bal) => sum + bal, 0).toFixed(7),
    activeDonations: mockDonationsRef.length,
  });
});

export default router;
