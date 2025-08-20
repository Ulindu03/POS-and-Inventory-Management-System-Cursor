# VoltZone POS System

A modern, comprehensive POS (Point of Sale) system built with the MERN stack.

## Features
- 🎨 Beautiful glassmorphic UI design
- 🌐 Multi-language support (English & Sinhala)
- 💰 LKR currency support
- 🚀 Real-time updates
- 📱 Responsive design
- 🔒 Secure authentication

## Tech Stack
- **Frontend**: React + Vite + TypeScript
- **Backend**: Node.js + Express + TypeScript
- **Database**: MongoDB
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Animations**: Framer Motion

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   # Frontend
   cd client && npm install

   # Backend
   cd server && npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env` in both client and server directories
   - Update with your configuration

4. Start development servers:
   ```bash
   # Frontend (Terminal 1)
   cd client && npm run dev

   # Backend (Terminal 2)
   cd server && npm run dev
   ```

### Using Docker for MongoDB
```bash
docker-compose up -d
```

## Project Structure
```
voltzone-pos/
├── client/          # Frontend React application
├── server/          # Backend Node.js application
└── docker-compose.yml
```

## License
© 2024 VoltZone. All rights reserved.
