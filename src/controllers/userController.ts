import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/generateToken";
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface LoginRequest {
    email: string;
    password: string;
}

interface SignupRequest extends LoginRequest {
    name: string;
}

interface SearchRequest {
    name: string;
}

const findUserByEmail = async (email: string) => {
    return prisma.user.findUnique({
        where: { email }
    });
};

const getMaleProfiles = () => {
    const maleProfilesDir = path.join(process.cwd(), 'src', 'Assets', 'Male');
    return fs.readdirSync(maleProfilesDir);
};

const getFemaleProfiles = () => {
    const femaleProfilesDir = path.join(process.cwd(), 'src', 'Assets', 'Female');
    return fs.readdirSync(femaleProfilesDir);
};

const getRandomProfile = (gender?: string) => {
    if (gender === 'female') {
        const femaleProfiles = getFemaleProfiles();
        return `Female/${femaleProfiles[Math.floor(Math.random() * femaleProfiles.length)]}`;
    } else {
        const maleProfiles = getMaleProfiles();
        return `Male/${maleProfiles[Math.floor(Math.random() * maleProfiles.length)]}`;
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password }: LoginRequest = req.body;
        console.log(email, password);
        if (!email || !password) {
            res.status(400).json({ message: "Email and password are required" });
            return;
        }

        const user = await findUserByEmail(email);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            res.status(401).json({ message: "Invalid password" });
            return;
        }

        const token = generateToken(user.id);
        res.status(200).json({
            message: "Login successful",
            user: {
                name: user.name,
                email: user.email,
                token,
                isLoggedIn: true,
                profile: user.profile
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

export const signup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, gender }: SignupRequest & { gender?: string } = req.body;

        if (!name || !email || !password) {
            res.status(400).json({ message: "All fields are required" });
            return;
        }

        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            res.status(409).json({ message: "Email already registered" });
            return;
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const Profile = getRandomProfile(gender);

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                gender: gender || 'unspecified',
                profile: Profile
            }
        });

        const token = generateToken(newUser.id);
        res.status(201).json({
            message: "Registration successful",
            user: {
                name: newUser.name,
                email: newUser.email,
                token,
                isLoggedIn: true,
                profile: newUser.profile
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

export const getUsers = async(req: Request, res: Response): Promise<void> => {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            profile: true,
            createdAt: true,
        }
    });
    const filteredUsers = users.filter(user => user.id !== req.user.id);
    res.status(200).json(filteredUsers);
    
}

export const getMe = async(req: Request, res: Response): Promise<void> => {
    const user = await prisma.user.findUnique({
        where: {
            id: req.user.id
        },
        select: {
            id: true,
            name: true,
            email: true,
            profile: true,
            createdAt: true,
        }
    });
    res.status(200).json(user);
};

export const searchUsers = async(req: Request, res: Response): Promise<void> => {
    const { name }:SearchRequest = req.body;
    try{
        const users = await prisma.user.findMany({
            where: {
                name: {
                    contains: name,
                    mode: 'insensitive'
                }
            },
            select: {
                id: true,
                name: true,
                email: true,
                profile: true,
            }
        });

        const filteredUsers = users.filter(user => user.id !== req.user.id);

        if(filteredUsers.length === 0){
            res.status(404).json({ message: "No users found" });
            return;
        }
        res.status(200).json(filteredUsers);

    }catch(error){
        console.log(error);
        res.status(500).json({ message: "Server error", error });
    }
};

export const getUSerByID = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user.id;
    const id = Number(req.params.id);
    const user = await prisma.user.findUnique({
        where: {
            id
        },
        select: {
            id: true,
            name: true,
            email: true,
            profile: true,
            createdAt: true,
            
        }
    });

    if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
    }

    const isFriend = await prisma.friend.findFirst({
        where:{
            OR:[
                {senderId: userId, receiverId: id},
                {senderId: id, receiverId: userId}
            ]
        },select:{
            status: true
        }
    });

    res.status(200).json({
        user,
        isFriend
    });
};
