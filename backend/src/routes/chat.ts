import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// System context for the chatbot
const SYSTEM_CONTEXT = `You are GeoLedger AI Assistant, a helpful chatbot for the GeoLedger blockchain donation platform.

Platform Overview:
- GeoLedger is a transparent donation platform built on Stellar blockchain using Soroban smart contracts
- Donors can make cryptocurrency donations (XLM) to verified NGOs
- All donations are recorded on-chain for complete transparency
- NGOs upload work progress and evidence to prove impact
- Interactive map shows donation locations globally

Key Features:
1. Wallet Integration: Freighter, xBull, Albedo wallets supported
2. Donations: Send XLM to verified NGOs with location tracking
3. NGO Dashboard: NGOs upload work progress with photos and updates
4. Transaction History: View all blockchain transactions
5. Impact Tracking: See real progress from your donations

Your Role:
- Answer questions about how to use the platform
- Explain blockchain donation benefits (transparency, traceability, low fees)
- Guide users through donation process
- Help with wallet connection issues
- Explain NGO verification process
- Provide information about supported wallets
- Be friendly, professional, and concise

Guidelines:
- Keep responses under 150 words
- Use emojis appropriately (💝 for donations, 🔐 for security, 🌍 for global impact)
- If you don't know something, suggest checking the documentation or contacting support
- Never make up donation amounts or NGO names - use general examples
- Always emphasize transparency and blockchain benefits
`;

// Chat endpoint
router.post('/message', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: 'Gemini API key not configured',
        fallbackResponse: 'I apologize, but the AI assistant is not configured yet. Please add your GEMINI_API_KEY to the backend .env file.'
      });
    }

    // Get the generative model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Build conversation history
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: SYSTEM_CONTEXT }],
        },
        {
          role: 'model',
          parts: [{ text: 'I understand. I am GeoLedger AI Assistant, ready to help users with the blockchain donation platform. I will provide helpful, concise answers about donations, wallets, NGOs, and blockchain transparency.' }],
        },
        ...conversationHistory.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
      ],
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.7,
      },
    });

    // Send message and get response
    const result = await chat.sendMessage(message);
    const response = result.response;
    const text = response.text();

    res.json({
      response: text,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Gemini API error:', error);
    res.status(500).json({ 
      error: 'Failed to get AI response',
      details: error.message,
      fallbackResponse: 'I apologize, but I encountered an error. Please try asking your question again, or check out our documentation for help.'
    });
  }
});

// Get suggested questions
router.get('/suggestions', (req, res) => {
  const suggestions = [
    '💝 How do I make a donation?',
    '🔐 Which wallets are supported?',
    '🌍 How does blockchain ensure transparency?',
    '📊 How can I see my donation impact?',
    '🏢 How do I register as an NGO?',
    '💰 What are the transaction fees?',
    '📍 Why do you need my location?',
    '✅ How are NGOs verified?',
  ];

  res.json({ suggestions });
});

// Health check for Gemini API
router.get('/health', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        status: 'unconfigured',
        message: 'Gemini API key not set',
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent('Say OK if you can respond');
    
    res.json({
      status: 'healthy',
      message: 'Gemini AI is operational',
      response: result.response.text(),
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

export default router;
