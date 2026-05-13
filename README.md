# SmartSupply Connect

AI-powered complaint routing system for supply chain management.

## Features

- 🔐 User authentication with email verification
- 📝 Text and voice complaint submission
- 🤖 AI-powered complaint classification (OpenAI GPT-4 & Whisper)
- 📧 Automated email notifications (Resend)
- 📊 Admin dashboard with analytics
- 📱 Cross-platform (iOS, Android, Web)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Edit `app.json` and add your API keys in the `extra` section:

```json
{
  "expo": {
    "extra": {
      "SUPABASE_URL": "your_supabase_project_url",
      "SUPABASE_ANON_KEY": "your_supabase_anon_key",
      "OPENAI_API_KEY": "your_openai_api_key",
      "RESEND_API_KEY": "your_resend_api_key"
    }
  }
}
```





## License

MIT
