// Socket.IO: autenticazione con JWT, stanze dei progetti e chat in tempo reale

const { Server } = require('socket.io');
const Project = require('../models/Project');
const Message = require('../models/Message');
const { getUserFromToken } = require('../middleware/authMiddleware');

// Nome della stanza Socket.IO di un progetto
function roomName(projectId) {
  return `project:${projectId}`;
}

// Crea il server Socket.IO collegato al server HTTP di Express
function setupSocket(httpServer) {
  const io = new Server(httpServer);

  // Ogni connessione deve presentare un token JWT valido
  io.use(async (socket, next) => {
    try {
      socket.user = await getUserFromToken(socket.handshake.auth.token);
      next();
    } catch (err) {
      next(new Error('Autenticazione non valida'));
    }
  });

  io.on('connection', (socket) => {
    // stanza personale: serve per togliere l'utente dalle chat se esce dal progetto
    socket.join(`user:${socket.user._id}`);

    // Il client chiede di entrare nella stanza di un progetto
    socket.on('joinProject', async (projectId) => {
      try {
        const isMember = await Project.exists({ _id: projectId, members: socket.user._id });
        if (!isMember) {
          socket.emit('errorMessage', 'Non sei membro di questo progetto');
          return;
        }
        socket.join(roomName(projectId));
        // conferma al client che ora riceve gli eventi del progetto
        socket.emit('joined', projectId);
      } catch (err) {
        socket.emit('errorMessage', 'Progetto non valido');
      }
    });

    // Il client invia un messaggio di chat: lo salviamo e lo giriamo a tutta la stanza
    socket.on('chatMessage', async ({ projectId, message }) => {
      try {
        const text = (message || '').trim();
        if (!text) {
          return;
        }
        const isMember = await Project.exists({ _id: projectId, members: socket.user._id });
        if (!isMember) {
          socket.emit('errorMessage', 'Non sei membro di questo progetto');
          return;
        }

        const saved = await Message.create({ project: projectId, user: socket.user._id, message: text });
        await saved.populate('user', 'name');
        io.to(roomName(projectId)).emit('newMessage', saved);
      } catch (err) {
        socket.emit('errorMessage', 'Messaggio non inviato');
      }
    });
  });

  return io;
}

// Toglie dalla stanza del progetto tutte le connessioni di un utente
async function removeUserFromRoom(io, projectId, userId) {
  const sockets = await io.in(`user:${userId}`).fetchSockets();
  sockets.forEach((socket) => socket.leave(roomName(projectId)));
}

module.exports = { setupSocket, roomName, removeUserFromRoom };
