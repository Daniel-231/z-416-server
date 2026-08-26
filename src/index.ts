import express, { Application, Request, Response } from 'express';

import { createServer } from 'node:http';
import { Server } from 'socket.io';

import usersRouter from './Routes/usersRouter';
import authRouter from './Routes/authRouter';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app: Application = express();
const server = createServer(app);
const io = new Server(server);
const PORT = process.env.PORT ?? 5000;


app.use(express.json());
app.use(cors());

app.use('/users', usersRouter);
app.use('/auth', authRouter);

app.get("/", (_req: Request, res: Response) => {
  res.json("Hello Worldd");
})

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

io.on('connection', (socket) => {
  console.log('connected:', socket.id);
  socket.on('disconnect', (reason) => {
    console.log('disconnected:', socket.id, reason);
  });
});



server.listen(PORT, () => {
  console.log(`Express Server is Listening On Port: ${PORT}`);
});
