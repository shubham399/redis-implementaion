'use strict';

const net = require("net");
const mem = {};
const options = {};

// Iterate through the command-line arguments and create a map
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  // Check if the argument is in the format "--key=value"
  if (arg.startsWith('--')) {
    const key = arg.slice(2).toLowerCase();
    const value = process.argv[i + 1]
    options[key] = value || true; // If there's no value, set it to true
  }
}

const getSimpleString = str => "+" + str + "\r\n"
const getBulkStringReply = str => str ? `\$${str.length}\r\n${str}\r\n` : "$-1\r\n"
const getArrayReply = (arr) => {
  const processed = arr.map(getBulkStringReply);
  return `*${processed.length}\r\n${processed.join("")}`

}
const getErrorString = str => "-" + str + "\r\n"
const getIntegerResponse = str => ":" + str + "\r\n"



const pingHandler = (socket) => {
  socket.write(getSimpleString("PONG"))
}
const echoHandler = (socket, data) => {
  socket.write(getBulkStringReply(data.join(" ")))
}

const setHandler = (socket, data) => {
  mem[data[0]] = data[1];
  if (data[2] && data[2].toUpperCase() === "PX") {
    setTimeout(() => {
      mem[data[0]] = null;
    }, data[3])
  }
  socket.write(getSimpleString("OK"))
}
const getHandler = (socket, data) => {
  socket.write(getBulkStringReply(mem[data[0]]))
}

const getConfigHandler = (socket, data) => {
  const command = data[0].toUpperCase();
  const option = data[1].toLowerCase();
  console.log('Config Handler', command);
  switch (command) {
    case 'GET':
      const val = options[option]
      socket.write(getArrayReply([option, val]))
  }
}
const keysHandler = (socket, data) => {
  const keys = Object.keys(mem);
  socket.write(getBulkStringReply("LOL"))
}


const server = net.createServer((socket) => {
  const dataHandler = (buffer) => {
    const data = buffer.toString('utf-8').trim().split(/\s/).filter(a => a !== "").filter(a => a[0] !== "$");
    console.log("🚀 ~ file: main.js:69 ~ dataHandler ~ data:", data)
    const command = data[1].toUpperCase()
    console.log('Request from', socket.remoteAddress, 'port', socket.remotePort, command);
    switch (command) {
      case 'PING':
        pingHandler(socket)
        break;
      case 'ECHO':
        echoHandler(socket, data.slice(2))
        break;
      case 'SET':
        setHandler(socket, data.slice(2))
        break;
      case 'KEYS':
        keysHandler(socket, data.slice(2))
        break;
      case 'GET':
        getHandler(socket, data.slice(2))
        break;
      case 'CONFIG':
        getConfigHandler(socket, data.slice(2))
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