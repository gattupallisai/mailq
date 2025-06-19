// import {WebSocketGateway,WebSocketServer,OnGatewayInit,OnGatewayConnection,OnGatewayDisconnect} from '@nestjs/websockets';
// import { Server } from 'socket.io';

// @WebSocketGateway({
//   cors: {
//     origin: '*',
//   },
// })
// export class EmailsGateway
//   implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
// {
//   @WebSocketServer()
//   server: Server;

//   private connectedUsers = new Map<string, string>(); // socketId -> userEmail

//   afterInit(server: Server) {
//     console.log('WebSocket Initialized');
//   }

//   handleConnection(socket: any) {
//     const userEmail = socket.handshake.query.email;
//     if (userEmail) {
//       this.connectedUsers.set(socket.id, userEmail);
//     }
//     console.log(`User connected: ${userEmail} (${socket.id})`);
//   }

//   handleDisconnect(socket: any) {
//     const userEmail = this.connectedUsers.get(socket.id);
//     this.connectedUsers.delete(socket.id);
//     console.log(`User disconnected: ${userEmail} (${socket.id})`);
//   }

//   // Emits to a specific email (if connected)
//   notifyUser(email: string, data: any) {
//     for (const [socketId, userEmail] of this.connectedUsers.entries()) {
//       if (userEmail === email) {
//         this.server.to(socketId).emit('new_email', data);
//       }
//     }
//   }

//   // Optional: Broadcast to multiple users
//   notifyMultipleUsers(emails: string[], data: any) {
//     for (const email of emails) {
//       this.notifyUser(email, data);
//     }
//   }
  
// }
import {WebSocketGateway,WebSocketServer,OnGatewayInit,OnGatewayConnection,OnGatewayDisconnect} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EmailsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // socketId -> userEmail

  afterInit(server: Server) {
    console.log('WebSocket Initialized');
  }

  handleConnection(socket: any) {
    const userEmail = socket.handshake.query.email;
    if (userEmail) {
      this.connectedUsers.set(socket.id, userEmail);
    }
    console.log(`User connected: ${userEmail} (${socket.id})`);
  }

  handleDisconnect(socket: any) {
    const userEmail = this.connectedUsers.get(socket.id);
    this.connectedUsers.delete(socket.id);
    console.log(`User disconnected: ${userEmail} (${socket.id})`);
  }

  // Emits to a specific email (if connected)
 notifyUser(email: string, event: string, data: any) {
  for (const [socketId, userEmail] of this.connectedUsers.entries()) {
    if (userEmail === email) {
      this.server.to(socketId).emit(event, data);
    }
  }
}


  // Optional: Broadcast to multiple users
  notifyMultipleUsers(emails: string[], event: string, data: any) {
  for (const email of emails) {
    this.notifyUser(email, event, data);
  }
}

  
}
