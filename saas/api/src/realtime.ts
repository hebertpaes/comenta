import { Server as SocketServer } from "socket.io";
import type { Server } from "node:http";
import { verifyAccessToken } from "./lib/auth.js";
import { corsOrigins } from "./config.js";

let io: SocketServer | null = null;

export function initRealtime(server: Server) {
  io = new SocketServer(server, { cors: { origin: corsOrigins } });
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string;
      const p = verifyAccessToken(token);
      socket.data.companyId = p.companyId;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });
  io.on("connection", (socket) => {
    socket.join(`company:${socket.data.companyId}`);
  });
  return io;
}

/** Emite um evento em tempo real para todos os usuários conectados da empresa. */
export function emitToCompany(companyId: string, event: string, payload: unknown) {
  io?.to(`company:${companyId}`).emit(event, payload);
}
