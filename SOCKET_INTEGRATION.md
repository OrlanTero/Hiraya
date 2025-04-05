# Socket.io Integration

This documentation explains how to connect the Balanghay Member Client to the Socket.io server implemented in the Balanghay application.

## Server Implementation

The Balanghay application now includes a Socket.io server that runs on port 3000. This server facilitates real-time communication between the main Balanghay application and any connected Member Clients.

### Socket.io Server Features

The Socket.io server implementation:

- Runs alongside the main Electron application
- Handles client connections and disconnections
- Tracks connected clients
- Broadcasts events to all connected clients or specific clients
- Responds to test messages
- Notifies clients of library events (book borrowing, returning, etc.)

## Connecting Member Client to the Server

The Member Client should be configured to connect to the Socket.io server running on the Balanghay application. The connection URL should be the same as the HTTP API endpoint, typically:

```
http://[SERVER_IP]:3000
```

### Connection Process

1. In the Member Client, enter the server address in the connection screen
2. When HTTP connection is successful, the Socket.io connection will be established automatically
3. Once connected, the Member Client can send and receive real-time events

## Supported Events

### Events from Client to Server

| Event Name | Data Structure | Description |
|------------|----------------|-------------|
| `identify` | `{ clientType: 'member', memberId: 'number' }` | Identifies the client to the server |
| `test_message` | `{ message: 'string' }` | Sends a test message to verify connection |
| `member_login` | `{ memberId: 'number' }` | Notifies server that a member has logged in |
| `book_borrowed` | `{ memberId: 'number', bookIds: 'array' }` | Notifies server that books were borrowed |
| `book_returned` | `{ loanIds: 'array' }` | Notifies server that books were returned |

### Events from Server to Client

| Event Name | Data Structure | Description |
|------------|----------------|-------------|
| `client_count` | `number` | Number of clients connected to the server |
| `notification` | Varies based on notification type | General notification channel for various events |

#### Notification Types

The `notification` event includes a `type` field that indicates the specific notification:

- `test_response`: Response to a test message
- `book_borrowed`: Notification that books were borrowed
- `book_returned`: Notification that books were returned
- `book_returned_qr`: Notification that books were returned via QR code
- `member_login`: Notification that a member logged in

## Example Usage in Member Client

The Member Client has already been updated to use Socket.io. Here's how it works:

1. The `ServerContext` component manages the Socket.io connection
2. When connected to the server, it automatically establishes a Socket.io connection
3. Events can be sent using the `sendSocketMessage` function
4. Incoming events are stored in the `notifications` state

## Testing the Connection

You can test the Socket.io connection using the ServerSetup page in the Member Client:

1. Connect to the server using the connection form
2. When connected, a Socket.io test panel will appear
3. Enter a message and click send
4. You should receive a response from the server

## Troubleshooting

If the Member Client cannot connect to the Socket.io server:

1. Ensure the Balanghay application is running
2. Check that the server address is correct
3. Verify that port 3000 is not blocked by a firewall
4. Check server logs for any connection errors

## Advanced Configuration

The Socket.io server can be configured by modifying the `socket-server.js` file:

- Change the port number (default is 3000)
- Modify CORS settings
- Add custom event handlers
- Implement authentication requirements 