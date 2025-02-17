import express from 'express';
import { addFriend, getFriends } from '../controllers/friendController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/add', authMiddleware, addFriend);
router.get('/list', authMiddleware, getFriends);

export default router;