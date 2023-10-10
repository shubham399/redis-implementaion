'use strict';

const { readFileSync, existsSync } = require("fs");
const net = require("net");
const path = require("path");
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

if (options['dir'] && options['dbfilename'] && existsSync(path.join(options['dir'], options['dbfilename']))) {
  console.log(readFileSync(path.join(options['dir'], options['dbfilename'])).toString())
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
  if (data[0] === "*") {
    socket.write(getArrayReply(Object.values(keys)));
  }
  else {
    const pattern = new RegExp(`${data[0]}`)
    socket.write(getArrayReply(keys.filter(item => pattern.test(item))))
  }
}




const commandHandler = (socket, command, value) => {
  switch (command) {
    case 'PING':
      pingHandler(socket)
      break;
    case 'ECHO':
      echoHandler(socket, value)
      break;
    case 'SET':
      setHandler(socket, value)
      break;
    case 'KEYS':
      keysHandler(socket, value)
      break;
    case 'GET':
      getHandler(socket, value)
      break;
    case 'CONFIG':
      getConfigHandler(socket, value)
      break;
    default:
      socket.write("\n")
  }
}

const server = net.createServer((socket) => {
  const dataHandler = (buffer) => {
    const data = buffer.toString('utf-8').trim().split(/\s/).filter(a => a !== "").filter(a => a[0] !== "$");
    const command = data[1].toUpperCase()
    const value = data.slice(2);
    console.log('Request from', socket.remoteAddress, 'port', socket.remotePort, command);
    commandHandler(socket, command, value)
  }


  console.log('Connection from', socket.remoteAddress, 'port', socket.remotePort);
  socket.on('data', dataHandler);
  socket.on('end', () => {
    console.log('Closed', socket.remoteAddress, 'port', socket.remotePort);
  });
});

server.maxConnections = 20;
server.listen(6379);