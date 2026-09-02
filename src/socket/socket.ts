import { Server as HttpServer } from 'node:http';
import { Server, Socket } from 'socket.io';

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

export function initSocket(server: HttpServer): Server {
  const io = new Server(server);

  io.on('connection', (socket: Socket) => {
    console.log('connected:', socket.id);

    socket.on('sendLocation', (location: LocationDataType) => {
      socket.broadcast.emit('sendLocation', {
        from: socket.id, location
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('disconnected:', socket.id, reason);
    });
  });

  return io;
}
