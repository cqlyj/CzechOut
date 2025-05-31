# CzechOut Transfer API

A REST API for performing USDC transfers using CzechOut state channels.

## 🚀 Features

- ✅ Configurable transfer amounts
- ✅ Flexible sender/receiver addresses
- ✅ RESTful API endpoints
- ✅ Error handling and validation
- ✅ Real-time transfer status
- ✅ Environment variable configuration

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Valid Ethereum private key with USDC balance
- Access to ClearNode WebSocket

## 🛠️ Installation

1. Navigate to the API directory:

```bash
cd backend/api
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables (create `.env` file):

```bash
# CzechOut API Configuration
PORT=3001

# Wallet Configuration
WALLET_PRIVATE_KEY=your_private_key_here

# Default addresses (optional)
DEFAULT_SENDER=0x... # Leave empty to require sender in each request
DEFAULT_RECEIVER=0x8B20E8270a69A96a1030a893aA1be133BFd9b99e

# Token Configuration (already set to Polygon USDC)
USDC_TOKEN=0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359

# WebSocket Configuration
WEBSOCKET_URL=wss://clearnet.yellow.com/ws
```

## 🚀 Starting the API

```bash
npm start
```

The API will be available at `http://localhost:3001`

## 📚 API Endpoints

### Health Check

```http
GET /health
```

**Response:**

```json
{
  "status": "ok",
  "message": "CzechOut API is running"
}
```

### Transfer USDC

```http
POST /transfer
```

**Request Body:**

```json
{
  "amount": "0.1",
  "sender": "0x...", // Optional if DEFAULT_SENDER is set
  "receiver": "0x...", // Optional if DEFAULT_RECEIVER is set
  "privateKey": "0x..." // Optional if WALLET_PRIVATE_KEY is set in env
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Transfer completed successfully",
  "data": {
    "success": true,
    "appSessionId": "session_123",
    "allocations": [
      {
        "participant": "0x...",
        "role": "sender",
        "amount": 0,
        "usdcAmount": 0
      },
      {
        "participant": "0x...",
        "role": "recipient",
        "amount": 100000,
        "usdcAmount": 0.1
      }
    ],
    "transferAmount": "0.1",
    "sender": "0x...",
    "receiver": "0x...",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

**Response (Error):**

```json
{
  "success": false,
  "error": "Error message"
}
```

### Transfer Status (Coming Soon)

```http
GET /transfer/:transactionId
```

## 🧪 Testing the API

### Using curl:

```bash
# Health check
curl http://localhost:3001/health

# Transfer USDC
curl -X POST http://localhost:3001/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "0.1",
    "receiver": "0x8B20E8270a69A96a1030a893aA1be133BFd9b99e"
  }'
```

### Using JavaScript:

```javascript
// Health check
const healthResponse = await fetch("http://localhost:3001/health");
const health = await healthResponse.json();
console.log(health);

// Transfer
const transferResponse = await fetch("http://localhost:3001/transfer", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    amount: "0.1",
    receiver: "0x8B20E8270a69A96a1030a893aA1be133BFd9b99e",
  }),
});
const result = await transferResponse.json();
console.log(result);
```

## ⚙️ Configuration Variables

| Variable             | Description                  | Required | Default                                    |
| -------------------- | ---------------------------- | -------- | ------------------------------------------ |
| `PORT`               | API server port              | No       | 3001                                       |
| `WALLET_PRIVATE_KEY` | Private key for transactions | Yes\*    | -                                          |
| `DEFAULT_SENDER`     | Default sender address       | No       | -                                          |
| `DEFAULT_RECEIVER`   | Default receiver address     | No       | 0x8B20E8270a69A96a1030a893aA1be133BFd9b99e |
| `USDC_TOKEN`         | USDC token contract address  | No       | 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359 |
| `WEBSOCKET_URL`      | ClearNode WebSocket URL      | No       | wss://clearnet.yellow.com/ws               |

\*Required unless provided in request body

## 🔧 Development

### Project Structure

```
backend/api/
├── server.js          # Express.js server
├── czechout-api.js    # Core transfer logic
├── package.json       # Dependencies
├── README.md         # This file
└── .env              # Environment variables (create this)
```

### Key Features

1. **Configurable Parameters**: Amount, sender, and receiver can be set via API calls
2. **Environment Variables**: Secure configuration via environment variables
3. **Error Handling**: Comprehensive error handling and validation
4. **Timeout Protection**: 60-second timeout for transfers
5. **Detailed Logging**: Console logging for debugging and monitoring

## 🚨 Security Notes

- Never commit private keys to version control
- Use environment variables for sensitive data
- Consider implementing API authentication for production use
- Validate all input parameters
- Use HTTPS in production

## 📝 Examples

### Minimal Transfer (using defaults):

```json
{
  "amount": "0.05"
}
```

### Full Transfer Configuration:

```json
{
  "amount": "1.5",
  "sender": "0x1234567890abcdef1234567890abcdef12345678",
  "receiver": "0xabcdef1234567890abcdef1234567890abcdef12",
  "privateKey": "0x..."
}
```

## 🐛 Troubleshooting

1. **"No open USDC channel found"**: Ensure your wallet has an open state channel with USDC balance
2. **"Private key is required"**: Set `WALLET_PRIVATE_KEY` in environment or provide in request
3. **"Transfer timeout"**: Network issues or insufficient funds, check your wallet balance
4. **"Sender address does not match wallet"**: The sender address must match the wallet derived from the private key

## 📄 License

MIT
