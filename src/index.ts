import express, { Application, Request, Response } from 'express';

import { createServer } from 'node:http';

import usersRouter from './Routes/usersRouter';
import authRouter from './Routes/authRouter';
import friendsRouter from './Routes/friendsRouter';
import locationSharesRouter from './Routes/locationSharesRouter';
import dotenv from 'dotenv';
import cors from 'cors';

import { initSocket } from './socket/socket';

dotenv.config();

const app: Application = express();
const server = createServer(app);
const PORT = process.env.PORT ?? 5000;


app.use(express.json());
app.use(cors());

// Routes
app.use('/users', usersRouter);
app.use('/auth', authRouter);
app.use('/friends', friendsRouter);
app.use('/location-share', locationSharesRouter);

 // Initialize WebSocket server
initSocket(server);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});


server.listen(PORT, () => {
  console.log(`Express Server is Listening On Port: ${PORT}`);
});
