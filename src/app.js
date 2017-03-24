const http = require('http');
const socketio = require('socket.io');
const xxh = require('xxhashjs');
const fs = require('fs');

const avatar = fs.readFileSync(`${__dirname}/../client/coin.jpg`);
const groundImage = fs.readFileSync(`${__dirname}/../client/ground.png`);

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const handler = (request, response) => {
  if (request.url === '/ground.png') {
    response.writeHead(200, { 'Content-Type': 'image/png' });
    response.end(groundImage);
  } else if (request.url === '/coin.jpg') {
    response.writeHead(200, { 'Content-Type': 'image/jpg' });
    response.end(avatar);
  } else {
    fs.readFile(`${__dirname}/../client/index.html`, (err, data) => {
      if (err) {
        throw err;
      }
      response.writeHead(200);
      response.end(data);
    });
  }
};

const app = http.createServer(handler);
const io = socketio(app);

app.listen(port);

io.on('connection', (sock) => {
  const socket = sock;
  socket.join('room1');

  socket.player = {
    hash: xxh.h32(`${socket.id}${Date.now()}`, 0xCAFEBABE).toString(16),
    lastUpdate: new Date().getTime(),
    x: 0,
    y: 0,
    cx: 50,
    cy: 50,
    r: 100,
    prevX: 0,
    prevY: 0,
    destX: 0,
    destY: 0,
    alpha: 0,
    colliding: false,
    engaged: false,
  };

  socket.on('movementUpdate', (data) => {
    socket.player = data;
    socket.player.lastUpdate = Date.now();

    socket.broadcast.to('room1').emit('updatedMovement', socket.player);
  });
  
  socket.on('collideUpdate', (data) => {
    socket.broadcast.to('room1').emit('updatedCollision', data);
  });

  socket.on('disconnect', () => {
    io.sockets.in('room1').emit('disconnect', socket.player.hash);

    socket.leave('room1');
  });

  socket.emit('joined', socket.player);
});

console.log(`Listening on port: ${port}`);
