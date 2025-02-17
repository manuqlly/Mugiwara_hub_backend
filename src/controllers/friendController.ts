import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

interface FriendRequest {
    senderId: number;  // Changed from userId
    receiverId: number;  // Changed from friendId
}

export const addFriend = async (req: Request<{}, {}, FriendRequest>, res: Response): Promise<void> => {
    const senderId = req.user.id;
    const receiverId = Number(req.body.receiverId);
   
    try {
        const checkFriendship = await prisma.friend.findFirst({
            where: {
                senderId,
                receiverId
            }
        });

        if (checkFriendship) {
            res.status(400).json({ message: 'Friendship request already exists' });
            return;
        }

        const newFriendship = await prisma.friend.create({
            data: {
                senderId,
                receiverId,
                status: 'PENDING'  // Added to match schema default
            }
        });

        res.status(201).json({
            message: 'Friendship request sent',
            friendship: newFriendship
        });
        console.log('Friendship request sent');
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error', error });
    }
};

export const getFriends = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user.id;
    try {
        const friend = await prisma.friend.findMany({
            where:{
                OR:[
                    {senderId: userId},
                    {receiverId: userId}
                ],
                status: 'ACCEPTED'
            },
            include: {
                sender: {
                    select:{
                        id: true,
                        name: true,
                        email: true,
                        profile: true,
                        
                    }
                },
                receiver: {
                    select:{
                        id: true,
                        name: true,
                        email: true,
                        profile: true,
                       
                    }
                }
            }
        });

        const formattedFriends = friend.map(fri=>{
            if(fri.senderId === userId){
                return {...fri.receiver,friendshipCreatedAt: fri.createdAt};
            }else{
                return {...fri.sender,friendshipCreatedAt: fri.createdAt};
            }
        });

        res.status(200).json(formattedFriends);
        
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error', error });
    }
};