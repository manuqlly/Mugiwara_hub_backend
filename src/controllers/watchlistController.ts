import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

// Use process.env for Node.js environment variables
const openai = new OpenAI({
    apiKey: 'YOUR_OPENAI_API_KEY'
    // Note Paste your OpenAI API key here hardcoded for now. The env aint working for some diabolical reason
});

interface WatchlistRequest {
    AnimeId: number;
    English_Title: string;
    Japanese_Title: string;
    Image_url: string;
    synopsis: string;
}

export const addWatchlist = async (req: Request, res: Response): Promise<void> => {
    const watchlist: WatchlistRequest = req.body;
    const userId = req.user.id;
    try {
        const checkWatchlist = await prisma.watchList.findFirst({
            where: {
                userId: userId,
                AnimeId: watchlist.AnimeId
            }
        });

        if (checkWatchlist) {
            res.status(400).json({ message: 'Anime already in watchlist' });
            return;
        }

        const newWatchlist = await prisma.watchList.create({
            data: {
                AnimeId: watchlist.AnimeId,
                English_Title: watchlist.English_Title,
                Japanese_Title: watchlist.Japanese_Title,
                Image_url: watchlist.Image_url,
                synopsis: watchlist.synopsis,
                userId: userId,
            }
        });

        res.status(201).json(newWatchlist);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error', error });
    }
};

export const checkWatchlist = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user.id;
    const AnimeId = req.body.AnimeId;
    const id = Number(AnimeId);
    const watchlist = await prisma.watchList.findFirst({
        where: {
            userId: userId,
            AnimeId: id
        }
    });

    if (watchlist) {
        res.status(200).json("True");
    } else {
        res.status(404).json({ message: 'Anime not found in watchlist' });
    }
}

export const getWatchlist = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user.id;
    const userID = req.params.id;
    console.log(userId);

    if (userID) {
        const watchlist = await prisma.watchList.findMany({
            where: {
                userId: Number(userID)
            }
        });
        res.status(200).json(watchlist);
        return;
    }

    const watchlist = await prisma.watchList.findMany({
        where: {
            userId: userId
        }
    });

    res.status(200).json(watchlist);
};

export const deleteFromWatchlist = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user.id;
    const AnimeId = req.body.AnimeId;
    const id = Number(AnimeId);
    const checkWatchlist = await prisma.watchList.findFirst({
        where: {
            userId: userId,
            AnimeId: id
        }
    });
    if (!checkWatchlist) {
        res.status(404).json({ message: 'Anime not found in watchlist' });
        return;
    } else {
        await prisma.watchList.delete({
            where: {
                id: checkWatchlist.id
            }
        });
        res.status(200).json({ message: 'Anime removed from watchlist' });
    }

};

export const getRecommendation = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = Number(req.user.id);
        console.log(userId);

        const watchlist = await prisma.watchList.findMany({
            where: {
                userId: {
                    equals: userId
                }
            },
            select: {
                English_Title: true,
                Japanese_Title: true, 
                synopsis: true
            }
        });

        if (watchlist.length === 0) {
            res.status(404).json({ message: 'No anime in watchlist' });
            return;
        }

        const animeList = watchlist.map((anime) => anime.English_Title).join(', ');
        const prompt = `You are an anime recommendation system. Based on these anime: ${animeList}, recommend 5 similar anime. 
                       Return ONLY a valid JSON array of objects with these exact properties: 
                       {
                           "title": "English title",
                           "japanese_title": "Japanese title",
                           "synopsis": "Brief synopsis",
                           "image_url": "myanimelist image URL"
                       }`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{
                role: "system",
                content: `You are an anime recommendation system. Based on these anime: ${animeList}, recommend 5 similar anime. 
                        Return ONLY a valid JSON array of objects with these exact properties: 
                        {
                            "title": "English title",
                            "japanese_title": "Japanese title",
                            "synopsis": "Brief synopsis",
                            "image_url": "myanimelist image URL"
                        }`
            }],
            response_format: { type: "json_object" }
        });

        const recommendations = JSON.parse(completion.choices[0].message.content || "[]");
        console.log(recommendations);   
        res.status(200).json(recommendations);

    } catch (error) {
        console.error('Recommendation error:', error);
        res.status(500).json({ 
            message: 'Error generating recommendations', 
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
