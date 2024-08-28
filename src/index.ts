import express from 'express';
import MeasureController from './controllers/measure_controller';
import dotenv from "dotenv";
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from "@google/generative-ai/server"

import db from "better-sqlite3"
const connection = db("db.sqlite");

const PORT = 8080;
dotenv.config({
    path: "arquivo.env"
})


const app = express(); 


app.use(express.json({
    limit: "10mb"
}))

MeasureController.INSTANCE.map(app);


app.listen(PORT, ()=> {
    console.log(`Running at http://localhost:${PORT}`)
})

export const Gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
export const GeminiFileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY as string);
export { connection };