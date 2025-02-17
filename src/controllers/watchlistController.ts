import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { GoogleGenerativeAI } from '@google/generative-ai';

const prisma = new PrismaClient();



const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

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
                       }
                       Do not include any markdown formatting, code blocks, or additional text.`;

        // Get the generative model
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        // Generate content
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Clean the response text before parsing
        const cleanedText = text.replace(/^```json\s*|\s*```$/g, '').trim();

        // Parse the JSON response
        const recommendations = JSON.parse(cleanedText);
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
