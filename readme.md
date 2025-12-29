# ✨ Aura Tic-Tac-Toe

[![Build Status](https://img.shields.io/github/actions/workflow/status/your-username/your-repo/ci.yml?style=for-the-badge&logo=github)](https://github.com/your-username/your-repo/actions)
[![License](https://img.shields.io/github/license/your-username/your-repo?style=for-the-badge)](./LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/your-username/your-repo?style=for-the-badge&logo=git)](https://github.com/your-username/your-repo/commits/main)

A modern, feature-rich Tic-Tac-Toe web application designed with a stunning glassmorphism UI, fluid animations, and a comprehensive suite of gameplay modes. This project is a full-stack application showcasing a production-ready architecture with a React frontend and a Node.js/Socket.IO backend.

[➡️ **View Live Demo**](https://your-deployment-url.com) _(link to your deployed application)_

---

## Table of Contents

- [🚀 Key Features](#-key-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [📂 Project Structure](#-project-structure)
- [🏛️ Architecture & Design](#️-architecture--design)
- [🛡️ Security Features](#️-security-features)
- [⚙️ Local Development Setup](#️-local-development-setup)
- [🔑 Environment Variables](#-environment-variables)
- [📡 API & WebSockets](#-api--websockets)
- [📦 Deployment](#-deployment)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## 🚀 Key Features

-   **Stunning Visuals**: Sleek glassmorphism UI with smooth, responsive animations powered by Framer Motion.
-   **Dynamic Theming**: Switch between beautiful custom light and dark themes.
-   **Multiple Game Modes**:
    -   **Solo vs. Computer**: Challenge a sophisticated computer opponent with multiple difficulty levels (Easy, Medium, Hard, and a near-unbeatable Boss).
    -   **Local Pass & Play**: Classic two-player mode on the same device.
    -   **Online Multiplayer**: Real-time PvP with a lobby, room codes, and spectating.
    -   **Campaign Mode**: Progress through 10 unique levels, each with a challenging boss and distinct rules.
-   **Advanced Gameplay**:
    -   **Customizable Rules**: Set board size (3x3 to 10x10), win length, and enable special game variants.
    -   **Misère Mode**: An inverted variant where the goal is to *force* your opponent to complete a line.
    -   **Obstacles**: Randomly placed unplayable squares to challenge traditional strategies.
    -   **Blitz Mode**: A fast-paced online mode with a chess-style timer.
-   **In-Game Power-Ups**: Turn the tide of battle with strategic power-ups like Undo, Destroy, Fortify, and Double Strike.
-   **Progression & Economy**:
    -   **Aura Coins**: Earn coins by winning matches, completing quests, and clearing campaign levels.
    -   **Daily Quests**: Complete three new challenges every day for bonus rewards.
    -   **Marketplace**: Spend coins to unlock cosmetic items like new avatars, board skins, and color themes.
-   **Social Hub**:
    -   **Friends System**: Add friends via unique friend codes, see their online status, and send challenges.
    -   **In-Game & Direct Messaging**: Real-time chat with emojis and quick-chat options in online matches and DMs.
    -   **Leaderboards**: Compete for the top spot on the global ELO-based leaderboard.
-   **User Authentication & History**:
    -   Secure JWT-based authentication for user profiles.
    -   **Match History**: All games are saved, allowing you to review and replay past matches move-by-move.

## 🛠️ Tech Stack

| Area       | Technology                                                                                                       |
| :--------- | :--------------------------------------------------------------------------------------------------------------- |
| **Frontend**   | [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/) |
| **Backend**    | [Node.js](https://nodejs.org/), [Express](https://expressjs.com/), [Socket.IO](https://socket.io/), [TypeScript](https://www.typescriptlang.org/) |
| **Database**   | [PostgreSQL](https://www.postgresql.org/) with [Prisma](https://www.prisma.io/) ORM                               |
| **Auth**       | JSON Web Tokens (JWT)                                                                                            |
| **Deployment** | [Render](https://render.com/) (Configured via `render.yaml`)                                                     |

## 📂 Project Structure

```
aura-tic-tac-toe/
├── server/                   # Backend Node.js/Express/Socket.IO application
│   ├── prisma/               # Prisma schema and migrations
│   ├── src/                  # Backend TypeScript source
│   │   ├── api.ts            # REST API routes
│   │   ├── auth.ts           # JWT and password hashing logic
│   │   ├── db.ts             # Prisma client initialization
│   │   ├── gameLogic.ts      # Server-side game rules, ELO, etc.
│   │   ├── middleware.ts     # Express middleware (auth, rate limiting)
│   │   ├── sockets.ts        # Socket.IO connection and event handling
│   │   ├── socketService.ts  # Singleton for managing socket connections
│   │   ├── types.ts          # Shared types for the backend
│   │   └── index.ts          # Main server entry point
│   ├── .env                  # Environment variables (local, not committed)
│   ├── package.json
│   └── tsconfig.json
├── components/               # React components
├── contexts/                 # React contexts
├── hooks/                    # Custom React hooks
├── services/                 # Frontend services (API calls, Socket client)
├── utils/                    # Utility functions
├── App.tsx                   # Root React component
├── index.css                 # Global styles
├── index.html                # HTML entry point for Vite
├── index.tsx                 # React entry point
├── package.json
├── readme.md                 # This file
├── render.yaml               # Deployment configuration for Render
├── tsconfig.json
├── types.ts                  # Shared types for the frontend
└── vite.config.ts            # Vite configuration
```

## 🏛️ Architecture & Design

### Frontend Component Architecture

The frontend follows a modern, component-based architecture. `App.tsx` serves as the main controller, managing screens and global state, while specialized components handle specific views and logic.

```mermaid
classDiagram
    direction LR
    class App {
      +useState() screen
      +useState() room
      +useContext() auth
      +renderScreen()
    }
    class Game {
      +useState() board
      +useState() winner
      +handleSquareClick()
    }
    class MainMenu {
      +onStartGame()
      +onGoToOnlineLobby()
    }
    class OnlineLobby {
      +handleJoinGame()
      +handleCreateRoom()
    }
    class Board {
      +squares: BoardState
      +onSquareClick()
    }
    class Square {
      +value: SquareValue
      +onClick()
    }
    class AuthProvider {
      +currentUser: User
      +login()
      +logout()
    }
    class AuthScreen {
        +Login
        +Register
    }

    App "1" -- "1" AuthProvider
    App "1" -- "0..1" Game
    App "1" -- "0..1" MainMenu
    App "1" -- "0..1" OnlineLobby
    App "1" -- "0..1" AuthScreen
    Game "1" -- "1" Board
    Board "1" -- "*" Square
```

### Backend Architecture

The backend is a monolithic service combining a REST API (for auth, profiles, history) and a WebSocket server (for real-time gameplay and social features). This provides a single, easy-to-manage deployment unit.

-   **`Express.js`**: Handles RESTful API endpoints for user management, match history, and progression.
-   **`Socket.IO`**: Manages real-time, low-latency communication for multiplayer rooms, chat, and friend status updates.
-   **`Prisma`**: Acts as a type-safe ORM for all database interactions with PostgreSQL.

### Database Schema (ERD)

The database schema is designed to be relational and scalable, connecting users to their matches, friends, and clans.

```mermaid
erDiagram
    USER {
        string id PK
        string email UK
        string passwordHash
        string displayName
        string avatar
        int elo
        int coins
        string[] inventory
        int campaignLevel
        json campaignProgress
        json questData
        string friendCode UK
        string equippedTheme
        string equippedSkin
        string clanId FK
    }

    MATCH {
        string id PK
        string userId FK
        string gameMode
        string winner
        string opponentName
        json gameSettings
        json initialBoard
        string playerRole
        datetime date
    }

    MOVE {
        string id PK
        string matchId FK
        string player
        int index
        int moveNumber
    }

    CLAN {
        string id PK
        string name UK
        string tag UK
        string ownerId FK
    }

    FRIENDSHIP {
        string id PK
        string senderId FK
        string receiverId FK
        string status
    }

    USER ||--o{ MATCH : "has"
    MATCH ||--|{ MOVE : "contains"
    USER ||--o{ CLAN : "is member of"
    CLAN ||--|| USER : "is owned by"
    USER ||--o{ FRIENDSHIP : "sends"
    USER ||--o{ FRIENDSHIP : "receives"
```

## 🛡️ Security Features

This application is built with security as a core principle. Multiple layers of protection are implemented across the frontend, backend, and database to ensure data integrity, prevent unauthorized access, and mitigate common web vulnerabilities.

### Backend & API Security

-   **JWT Authentication**: All sensitive REST API endpoints are protected by a JSON Web Token (JWT) authentication middleware. The server validates the token on every request, ensuring only authenticated users can access protected resources.
-   **Rate Limiting**: Authentication routes (`/login`, `/register`) are rate-limited to mitigate brute-force and denial-of-service attacks.
-   **Strict CORS Policy**: The server is configured with a strict Cross-Origin Resource Sharing (CORS) policy, allowing requests only from the whitelisted frontend URL, preventing unauthorized domains from interacting with the API.
-   **Security Headers**: Essential security headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Strict-Transport-Security`) are set on all API responses to protect against common attacks like clickjacking and cross-site scripting (XSS).
-   **Input Sanitization**: All user-generated content, such as chat messages, is sanitized and validated on the server before being processed or broadcasted, preventing XSS and other injection attacks.
-   **Server-Side Validation**: All critical business and game logic is executed exclusively on the server. The client's version of the game state is never trusted. For example, when a match is saved, the server re-validates the entire move history to confirm the reported winner is correct, preventing cheating.

### Database Security

-   **ORM Protection**: The use of the Prisma ORM prevents SQL injection vulnerabilities by design. All database queries are constructed through the ORM's type-safe methods, which automatically parameterize inputs.
-   **Data Ownership Enforcement**: The server **never** trusts user-provided IDs from URL parameters or request bodies to fetch data. Instead, it exclusively uses the `userId` securely embedded within the authenticated user's JWT. This ensures users can only ever access their own data (e.g., their match history or profile).

### Frontend & Session Security

-   **Secure Token Storage**: The JWT is stored in `sessionStorage`, not `localStorage`. This is a more secure choice as `sessionStorage` is cleared automatically when the browser tab is closed, significantly reducing the window of opportunity for token theft via XSS attacks.
-   **Auto-Logout on Inactivity**: The application automatically logs out users after 15 minutes of inactivity, reducing the risk of unauthorized access on shared or unattended devices.

### Real-time & Gameplay Security

-   **Socket.IO Authentication**: Every WebSocket connection is authenticated using the same JWT middleware as the REST API. Unauthenticated clients are immediately disconnected.
-   **Room & Data Isolation**: All real-time communication is scoped to specific, randomly-generated room IDs on the server. A client connected to one room has no possible way to send or receive data from another room, ensuring game sessions are completely isolated.
-   **Server-Authoritative Gameplay**: The server is the single source of truth for all game state. Client actions (like making a move) are treated as requests, which the server validates against the current game state (e.g., checking if it's the player's turn, if the square is empty) before applying the change and broadcasting the new state to all clients in the room.

## ⚙️ Local Development Setup

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later)
-   [npm](https://www.npmjs.com/) or a compatible package manager
-   [PostgreSQL](https://www.postgresql.org/) database running locally or on a cloud service.

### 1. Backend Setup

```bash
# 1. Navigate to the server directory
cd server

# 2. Install dependencies
npm install

# 3. Create a .env file in the `server/` directory
#    (You can copy the contents from the "Environment Variables" section below)
touch .env

# 4. Add your PostgreSQL connection string and a JWT secret to the .env file
#    Example: DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"

# 5. Sync the database schema with Prisma
npx prisma db push

# 6. Start the backend development server
npm run dev
```

The backend server will start on `http://localhost:3000`.

### 2. Frontend Setup

```bash
# 1. Open a new terminal and navigate to the project root directory
#    (If you are in `server/`, run `cd ..`)

# 2. Install frontend dependencies
npm install

# 3. Start the frontend development server
npm run dev
```

The frontend application will be available at `http://localhost:5173`. The Vite server is pre-configured to proxy API and WebSocket requests to the backend.

## 🔑 Environment Variables

The backend requires a `.env` file in the `server/` directory with the following variables:

| Variable         | Description                                                                                                   | Example                                                              |
| :--------------- | :------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------- |
| `DATABASE_URL`   | **Required.** The connection string for your PostgreSQL database.                                               | `postgresql://user:pass@localhost:5432/aura?schema=public`           |
| `JWT_SECRET`     | **Required.** A long, random string used to sign authentication tokens. Generate one for production.              | `a-very-long-and-random-secret-key-for-jwt`                          |
| `FRONTEND_URL`   | The URL of the deployed frontend. Used for CORS configuration in production. Not strictly needed for local dev. | `http://localhost:5173`                                              |
| `PORT`           | Optional. The port for the backend server to run on.                                                          | `3000`                                                               |

## 📡 API & WebSockets

### REST API Endpoints

All endpoints are prefixed with `/api`. Authentication is required for routes marked with `🔒`.

| Method | Endpoint                    | Description                                       |
| :----- | :-------------------------- | :------------------------------------------------ |
| `POST` | `/register`                 | Create a new user account.                        |
| `POST` | `/login`                    | Authenticate a user and receive a JWT.            |
| `GET`  | `/me` 🔒                    | Get the profile of the currently logged-in user.  |
| `PUT`  | `/me` 🔒                    | Update the current user's profile.                |
| `DELETE`| `/me` 🔒                    | Delete the current user's account.                |
| `GET`  | `/friends` 🔒               | Get the user's friends list and pending requests. |
| `POST` | `/friends/request` 🔒       | Send a friend request to another user.            |
| `POST` | `/friends/respond` 🔒       | Accept or reject a friend request.                |
| `GET`  | `/matches` 🔒               | Get the user's match history.                     |
| `POST` | `/matches` 🔒               | Save a completed local or campaign match.         |
| `POST` | `/shop/buy` 🔒              | Purchase an item from the shop.                   |
| `GET`  | `/leaderboard`              | Get the global top 50 player leaderboard.         |

### WebSocket Events

Real-time communication is handled via Socket.IO.

**Client-to-Server Events:**

| Event              | Payload                                       | Description                               |
| :----------------- | :-------------------------------------------- | :---------------------------------------- |
| `createRoom`       | `{ settings: Partial<GameSettings> }`         | Creates a new private online match room.  |
| `joinRoom`         | `{ roomId: string, asSpectator: boolean }`    | Joins an existing room.                   |
| `leaveRoom`        | `{ roomId: string }`                          | Leaves the current room.                  |
| `makeMove`         | `{ roomId: string, index: number }`           | Submits a move to the board.              |
| `requestRematch`   | `{ roomId: string }`                          | Requests a rematch after a game ends.     |
| `sendChat`         | `{ roomId: string, text: string }`            | Sends a chat message to the room.         |
| `sendInvite`       | `{ friendId: string, roomId: string }`        | Sends a match invite to a friend.         |

**Server-to-Client Events:**

| Event               | Payload                                  | Description                                            |
| :------------------ | :--------------------------------------- | :----------------------------------------------------- |
| `roomUpdate`        | `Room`                                   | Sends the complete, updated state of the current room. |
| `chatMessage`       | `ChatMessage`                            | A new chat message has been received in the room.      |
| `friendStatus`      | `{ userId: string, status: string }`     | A friend's online status has changed.                  |
| `inviteReceived`    | `{ hostName: string, roomId: string }`   | An invite to a match has been received.                |
| `rematchDeclined`   | `void`                                   | The opponent declined the rematch offer.               |

## 📦 Deployment

This project includes a `render.yaml` file for one-click deployment on [Render](https://render.com/).

1.  **Fork this repository** to your GitHub account.
2.  On the Render dashboard, click **New +** and select **Blueprint**.
3.  Connect the forked repository.
4.  Render will automatically detect the `render.yaml` file and configure two services:
    -   A **Web Service** for the Node.js backend.
    -   A **Static Site** for the React frontend.
5.  Render will also provision a PostgreSQL database and automatically inject the `DATABASE_URL` and `FRONTEND_URL` environment variables.
6.  You will need to manually add the `JWT_SECRET` environment variable to your backend service on Render for security.
7.  Click **Apply** to deploy.

## 🤝 Contributing

Contributions are welcome! If you'd like to help improve Aura Tic-Tac-Toe, please follow these steps:

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** to your local machine: `git clone https://github.com/your-username/aura-tic-tac-toe.git`
3.  **Create a new branch** for your feature or bug fix: `git checkout -b feature/your-feature-name`
4.  **Make your changes** and commit them with a clear and descriptive message.
5.  **Push your changes** to your fork: `git push origin feature/your-feature-name`
6.  **Create a pull request** from your branch to the main repository.

Please ensure your code follows the existing style and that your changes are well-tested.

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.