# Telegram Bot Setup Guide

## Overview
This system allows users to connect their Telegram account to receive price alerts and coupon notifications directly in Telegram.

## Setup Steps

### 1. Create a Telegram Bot
1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow the instructions to create your bot
4. Copy the **BOT_TOKEN** that BotFather gives you

### 2. Configure Environment Variables
Add your bot token to your `.env` file in the backend directory:

```env
BOT_TOKEN=your_bot_token_here
```

**Note:** The old `CHAT_ID` is no longer needed. Users will connect individually.

### 3. Set Up Webhook (Required for Production)
For the bot to receive messages from users, you need to set up a webhook.

#### Option A: Using the API Endpoint (Recommended)
Once your server is running and accessible via HTTPS, call:

```bash
curl -X POST http://localhost:3001/api/telegram-setup-webhook \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://your-domain.com/api/telegram-webhook"}'
```

#### Option B: Manual Setup
Visit this URL in your browser (replace `YOUR_BOT_TOKEN` and `YOUR_WEBHOOK_URL`):

```
https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=YOUR_WEBHOOK_URL
```

**Important:** 
- Your webhook URL must use HTTPS (not HTTP)
- For local development, use a tool like [ngrok](https://ngrok.com/) to expose your local server

### 4. For Local Development (Testing)
If you're testing locally, you can use polling instead of webhooks:

1. Install a polling script or use Telegram's getUpdates API
2. Or use ngrok to create an HTTPS tunnel:
   ```bash
   ngrok http 3001
   ```
3. Use the ngrok HTTPS URL as your webhook URL

## How It Works

### User Flow
1. User clicks "Connect Telegram" button on the website
2. Opens Telegram bot link (e.g., `https://t.me/your_bot`)
3. User sends `/start` or `/connect` command to the bot
4. Bot stores their chat ID and sends confirmation message
5. User now receives all price alerts and coupon notifications

### Bot Commands
- `/start` or `/connect` - Connect to receive alerts
- `/status` - Check connection status
- `/disconnect` - Stop receiving alerts

### Alert System
- When price or coupon status changes, alerts are sent to **all connected users**
- Each user's chat ID is stored in `db.json` under the `users` array
- Users can disconnect at any time using `/disconnect`

## Database Structure

The `db.json` file now includes a `users` array:

```json
{
  "products": [...],
  "users": [
    {
      "chatId": 123456789,
      "username": "john_doe",
      "connectedAt": "2025-12-18T10:00:00.000Z",
      "active": true
    }
  ]
}
```

## Testing

1. Start your backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Visit the frontend and click "Connect Telegram"

3. Open the bot in Telegram and send `/start`

4. You should receive a confirmation message

5. Add a product and wait for price changes to test alerts

## Troubleshooting

### Bot not responding
- Check that `BOT_TOKEN` is set correctly in `.env`
- Verify webhook is configured (check with `/api/telegram-bot-info`)
- Check server logs for errors

### Users not receiving alerts
- Verify user is connected (check `db.json` users array)
- Check that user's `active` field is `true`
- Verify bot token is valid
- Check server logs for Telegram API errors

### Webhook not working
- Ensure webhook URL uses HTTPS
- Check that your server is accessible from the internet
- Verify webhook URL is correct in Telegram (use `getWebhookInfo` API)

