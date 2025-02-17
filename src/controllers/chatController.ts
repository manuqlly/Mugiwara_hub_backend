import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const sendMessage = async (req: Request, res: Response): Promise<void> => {
    const senderId = req.user.id;
    const { receiverId, message } = req.body;
    const receiver = Number(receiverId);

    console.log(senderId, receiver, message);

    try {
        const checkReceiver = await prisma.user.findUnique({
            where: { id: receiver }
        });

        if (!checkReceiver) {
            res.status(404).json({ message: 'Receiver not found' });
            return;
        }

        const newMessage = await prisma.directMessage.create({
            data: {
                senderId,
                receiverId: receiver,
                content: message,
            }
        });

        // Socket.IO will handle real-time delivery
        res.status(201).json(newMessage);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const getMessages = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user.id;
    const { receiverId } = req.body;
    const receiver = Number(receiverId);
    
    try {
        const messages = await prisma.directMessage.findMany({
            where: {
                OR: [
                    { senderId: userId, receiverId: receiver },
                    { senderId: receiver, receiverId: userId }
                ]
            },
            orderBy: {
                createdAt: 'asc'
            }
        });
    
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
   
};
