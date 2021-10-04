const net = require("net");

const getSimpleString = str => "+" + str + "\r\n"
const getBulkStringReply = str => str ? `\$${str.length}\r\n${str}\r\n` : "$-1\r\n"
const getErrorString = str => "-" + str + "\r\n"
const getIntegerResponse = str => ":" + str + "\r\n"

const pingHandler = (socket) => {
  socket.write(getSimpleString("PONG"))
}
const echoHandler = (socket, data) => {
  console.log(data.join(" "))
  socket.write(getBulkStringReply(data.join(" ")))
}


const server = net.createServer((socket) => {
  const dataHandler = (buffer) => {
    // Do it in stream instead of Buffering it.
    const data = buffer.toString('utf-8').trim().split(/\s/).filter(a => a !== "").filter(a => a[0] !== "$");
    const command = data[1].toUpperCase()
    console.log('Request from', socket.remoteAddress, 'port', socket.remotePort, command);
    switch (command) {
      case 'PING':
        pingHandler(socket)
        break;
      case 'ECHO':
        echoHandler(socket, data.slice(2))
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