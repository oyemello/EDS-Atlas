import { Router } from 'express';
import { generalChat } from '../services/openai-service.js';
import { analyzeFigmaFrame } from '../services/figma-service.js';
import { insertChatMessage, getRecentChatMessages } from '../database/db.js';

const router = Router();

/**
 * GET /api/chat/history
 * Get recent chat history
 */
router.get('/history', (req, res) => {
  try {
    const history = getRecentChatMessages(50);
    // Transform for frontend
    const messages = history.map(msg => ({
      role: msg.role,
      content: msg.content,
      type: msg.type,
      ...msg.meta
    }));
    res.json(messages);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * DELETE /api/chat/history
 * Clear chat history
 */
router.delete('/history', async (req, res) => {
  try {
    const { clearChatHistory } = await import('../database/db.js');
    clearChatHistory();
    res.json({ success: true, message: 'Chat history cleared' });
  } catch (error) {
    console.error('Error clearing chat history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/chat
 * Lightweight general chat endpoint (design/dev focused)
 */
router.post('/', async (req, res) => {
  try {
    const { message, context } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    // Save user message
    insertChatMessage('user', message);

    let enrichedContext = context || '';
    let figmaData = null;

    // Check for Figma URL in message
    const figmaUrlMatch = message.match(/https:\/\/(www\.)?figma\.com\/(file|design)\/[a-zA-Z0-9]+(\/[^?]*)?(\?.*)?/);

    if (figmaUrlMatch) {
      const figmaUrl = figmaUrlMatch[0];
      console.log('Detected Figma URL in chat:', figmaUrl);

      try {
        // Analyze the Figma frame
        const analysis = await analyzeFigmaFrame(figmaUrl);

        if (analysis.success) {
          figmaData = analysis;
          enrichedContext += `\n\n[System]: User provided a Figma design. 
          Analysis Results:
          - Frame: ${analysis.frameName}
          - Compliance Score: ${analysis.complianceScore}/100
          - Violations: ${JSON.stringify(analysis.violations)}
          - Summary: ${analysis.summary}
          
          Please refer to this analysis in your response.`;
        } else {
          enrichedContext += `\n\n[System]: User provided a Figma design but analysis failed: ${analysis.error}`;
        }
      } catch (err) {
        console.error('Error analyzing Figma in chat:', err);
        enrichedContext += `\n\n[System]: Error analyzing Figma design: ${err.message}`;
      }
    }

    const response = await generalChat(message, enrichedContext);

    // Attach Figma data to response if available
    let msgType = 'text';
    let meta = null;

    if (figmaData) {
      response.figmaData = figmaData;
      msgType = 'figma-snapshot';
      meta = {
        imageUrl: figmaData.imageUrl,
        frameName: figmaData.frameName,
        summary: figmaData.summary
      };

      // Save Figma snapshot message
      insertChatMessage('assistant', '', 'figma-snapshot', meta);
    }

    // Save text response
    insertChatMessage('assistant', response.reply);

    res.json(response);
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate response' });
  }
});

export default router;
