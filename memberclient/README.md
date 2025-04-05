# Balanghay Member Client

The Balanghay Member Client is an Electron-based desktop application for library members to interact with the Balanghay Library Management System.

## Socket.io Implementation

This project uses Socket.io for real-time communication between the client and the server. Here's how it's implemented:

### Architecture

The Socket.io implementation follows a layered architecture:

1. **Main Process (index.js)**: Sets up the Socket.io client connection at the Electron main process level
2. **Server Context (contexts/ServerContext.jsx)**: Manages the Socket.io connection state and provides React hooks for components
3. **UI Components**: Consume the Server Context to display connection status and interact with the socket

### Main Process Implementation

The main process (index.js) creates a Socket.io client connection when the HTTP connection to the server is successful. It:

- Establishes the socket connection
- Sets up event listeners for connect/disconnect events
- Forwards events from the server to the renderer process
- Exposes an IPC interface for the renderer to send messages

### React Context Implementation

The ServerContext provides a React context and hook for components to:

- Access the current server connection status
- Connect to the server
- Send messages through the socket
- Receive notifications and events from the server

### Using Socket.io in Components

To use Socket.io in a component:

```jsx
import { useServer } from '../contexts/ServerContext';

function MyComponent() {
  const { 
    serverStatus, 
    sendSocketMessage, 
    notifications 
  } = useServer();

  // Check if socket is connected
  const isConnected = serverStatus.socketConnected;

  // Send a message
  const handleSendMessage = () => {
    sendSocketMessage('my_event', { data: 'Hello world' });
  };

  return (
    <div>
      <p>Socket status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <button onClick={handleSendMessage}>Send Message</button>
    </div>
  );
}
```

### Server Implementation Guidance

On your server, you should implement Socket.io with corresponding event handlers:

```javascript
// Server-side Socket.io implementation
const io = require('socket.io')(server);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle test messages
  socket.on('test_message', (data) => {
    console.log('Received test message:', data);
    
    // Echo back to the same client
    socket.emit('notification', {
      type: 'test_response',
      message: `Received your message: ${data.message}`,
      timestamp: new Date()
    });
  });

  // Handle member login events
  socket.on('member_login', (data) => {
    // Broadcast to all other clients
    socket.broadcast.emit('notification', {
      type: 'member_login',
      memberId: data.memberId,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});
```

## Development

### Installation

```bash
npm install
```

### Running in Development Mode

```bash
npm start
```

### Building

```bash
npm run make
```

## License

MIT