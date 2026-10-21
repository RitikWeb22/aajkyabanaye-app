# AajKyaBanaye 🍲

> **"Aaj kya banega? Let's find out!"**  
> *Your next delicious meal starts here.*

AajKyaBanaye is an Indian recipe recommendation and meal planning application designed to eliminate daily cooking indecision. Select the ingredients you have at home, discover authentic recipes, customize servings and quantities, and export/shop for only what you actually need.

---

## 🛠️ Tech Stack

- **Mobile Client:** React Native, Expo SDK 57, Expo Router, React 19.2.3, TypeScript (Strict)
- **Styling:** NativeWind (Tailwind CSS v3) + Custom Design System
- **Authentication:** Clerk Expo SDK (`@clerk/clerk-expo`) + `expo-secure-store`
- **State Management:** TanStack Query (server state), Zustand (client checklist & preferences)
- **Forms & Validation:** React Hook Form + Zod
- **Backend API:** Node.js, Express 5, TypeScript, Mongoose
- **Database:** MongoDB Atlas
- **AI Integration:** Google Gemini AI (`gemini-3.8-flash` via `@google/genai`)
- **Recipe Data:** TheMealDB API (primary)

---

## 📂 Project Architecture

```
AajKyaBanaye/
├── .env                  # Environment secrets (never committed)
├── .env.example          # Template for required environment variables
├── .gitignore
├── package.json          # Root scripts
├── scripts/
│   └── generate_assets.ps1 # Icon & splash generator from master logo
├── public/assets/        # Original brand logo & design mockups
├── app/                  # Expo SDK 57 mobile application
│   ├── app.json          # Expo configuration & plugins
│   ├── tailwind.config.js# Design token mappings
│   ├── assets/images/    # Generated icons, splash, and branding
│   └── src/
│       ├── app/          # Expo Router file-based pages
│       ├── constants/    # Theme tokens (Colors, Typography, Spacing)
│       ├── lib/          # SecureStore token cache & client utilities
│       ├── store/        # Zustand client state stores
│       └── services/     # API client
└── server/               # Express + Mongoose Backend API
    ├── src/
    │   ├── config/env.ts # Zod-validated environment config
    │   ├── lib/db.ts     # MongoDB connection with DNS fallback
    │   ├── routes/       # API endpoints (health, recipes, auth, ai)
    │   └── index.ts      # Server entry point
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js:** v20+ (tested on Node v22.22.2)
- **npm:** v10+
- **Expo Go** or an Android/iOS emulator

### 2. Environment Setup
Copy `.env.example` to `.env` and fill in your keys:

```dotenv
# Client
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_API_BASE_URL=http://localhost:5000

# Server
PORT=5000
NODE_ENV=development
MONGODB_URL=mongodb+srv://...
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.8-flash
```

### 3. Running the Project

From the project root:

```bash
# Start both server and Expo mobile app concurrently
npm start

# Or run them individually:
npm run server      # Starts the backend API at http://localhost:5000
npm run app         # Starts Expo Metro bundler
```

### 4. Quality Verification Commands

```bash
npm run typecheck   # Typecheck both client and server
npm run --prefix app run lint
npx --prefix app expo-doctor
```

---

## 📜 Third-Party Integrations & Notes

- **MongoDB Atlas:** Uses DNS fallback (`8.8.8.8`, `1.1.1.1`) to reliably resolve Atlas `mongodb+srv://` connection strings across varied Windows ISP resolvers.
- **Recipe Data:** Integrated with TheMealDB test tier (`key=1`).
- **AI Generator:** Uses server-side Google Gemini SDK with strict schema output validation.
- **Grocery Shopping:** Compliant `copy_list` provider enabled by default. Official Swiggy Instamart integration remains stubbed until commercial API authorization is granted.
