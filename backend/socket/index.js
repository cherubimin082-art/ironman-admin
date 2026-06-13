let _io = null;

function init(httpServer) {
  const { Server } = require('socket.io');
  _io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  _io.on('connection', (socket) => {
    // Vendor joins their personal room
    socket.on('join_vendor', (vendorId) => {
      socket.join(`vendor_${vendorId}`);
      socket.join('vendor_room');           // broadcast room for new orders
    });

    // Delivery agent joins their personal room
    socket.on('join_delivery', (agentId) => {
      socket.join(`delivery_${agentId}`);
    });

    // Admin joins the admin room
    socket.on('join_admin', () => {
      socket.join('admin_room');
    });

    socket.on('disconnect', () => {});
  });

  return _io;
}

function getIO() {
  if (!_io) throw new Error('Socket.io not initialised — call init() first');
  return _io;
}

module.exports = { init, getIO };
