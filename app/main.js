const net = require("net");

const pingHandler = (socket) => {
  socket.write("PONG\n")
}


const server = net.createServer((socket) => {
  const dataHandler = (buffer) => {
    const data = buffer.toString('utf-8').toUpperCase().trim().split(" ");
    const command = data[0]
    console.log('Request from', socket.remoteAddress, 'port', socket.remotePort, data);
    switch (command) {
      case 'PING':
        pingHandler(socket)
        break;
      default:
        socket.write("\n")
    }
  }


  console.log('Connection from', socket.remoteAddress, 'port', socket.remotePort);
  socket.on('data', dataHandler);
  socket.on('end', () => {
    console.log('Closed', socket.remoteAddress, 'port', socket.remotePort);
  });
});

server.maxConnections = 20;
server.listen(6379);