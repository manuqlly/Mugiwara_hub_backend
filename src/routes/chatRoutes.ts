import express from 'express';

import { sendMessage, getMessages } from '../controllers/chatController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/send', authMiddleware ,sendMessage);
router.post('/' , authMiddleware ,getMessages);

export default router;