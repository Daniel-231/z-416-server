import { Server as HttpServer } from 'node:http';
import { Server, Socket } from 'socket.io';

import { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../Middleware/requireAuth";
import { supabaseAdmin } from "../lib/supabase";

type LocationDataType = {
  coords: {
    accuracy: number;
    altitude: number;
    altitudeAccuracy: number;
    heading: number;
    latitude: number;
    longitude: number;
    speed: number;
  };
  timestamp: number;
};

let io: Server;
export const getIO = () => io; // so routes can emit

export function initSocket(server: HttpServer): Server {
  io = new Server(server);

  io.use(async (socket, next) => {
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(socket.handshake.auth?.token);
      if (error || !data.user) return next(new Error("Unauthorized"));

      const user = await prisma.user.findUnique({ where: { authId: data.user.id } });
      if (!user) return next(new Error("User not found"));

      socket.data.userId = user.id;
      next();
    } catch (error) {
      next(new Error("Unauthorized"));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log('connected:', socket.id);
    socket.join(`user:${socket.data.userId}`); // a private "inbox" room for this user
    console.log('connected:', socket.id, 'user:', socket.data.userId);

    socket.on('joinRoom', (roomId) => { // Both devices join the same room to share location updates
      socket.join(roomId);
      console.log("Joined Room:", roomId);
    });

    socket.on('getCurrentAvailableRooms', async () => {
      console.log("Current Rooms Available:", Array.from(socket.rooms).map(room => room));
    });


    socket.on('closeRoom', (roomId) => { // Client leaves the room
      socket.leave(roomId);
      console.log(`ClientId: ${socket.id} left Room: ${roomId}`);
    });
     
    // client sends their location to room
    socket.on('sendLocation', (payload) => {
      const { roomId, location } = payload ?? {};
      if (typeof roomId !== 'string' || typeof location?.coords?.latitude !== 'number' || typeof location?.coords?.longitude !== 'number') return;
      socket.to(roomId).emit("sendLocation", { from: socket.id, location });
    });



    socket.on('disconnect', (reason) => {
      console.log('disconnected:', socket.id, reason);
    });
  });

  return io;
}
