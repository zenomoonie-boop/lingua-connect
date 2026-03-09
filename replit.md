# LinguaConnect — Language Learning App

A fully functional multilingual language learning mobile app built with Expo SDK 54 + Express backend.

## Architecture

**Frontend:** React Native (Expo SDK 54) with Expo Router file-based routing  
**Backend:** Express.js (TypeScript) on port 5000  
**AI:** Replit AI Integrations (OpenAI gpt-4o) for streaming chat
**Storage:** AsyncStorage for user data, progress, and auth  
**Font:** Nunito (Google Fonts) via @expo-google-fonts/nunito  

## Features

- **Auth:** Register/login/logout with email+password (stored in AsyncStorage)
- **Lessons:** 15+ lessons across 8 languages (Spanish, French, Japanese, German, Portuguese, Mandarin, Korean, Italian), organized by Beginner/Intermediate/Advanced
- **Quizzes:** Multiple-choice, true/false, and fill-in-the-blank after each lesson
- **Progress Tracking:** XP points, streaks, completion rates, per-language stats
- **AI Chat Practice:** Real-time GPT-4o streaming chat tutor in any language
- **Voice Rooms:** Simulated live voice practice rooms by language/topic
- **Theme:** Dark/light mode with custom coral+teal palette

## App Structure

```
app/
  _layout.tsx            # Root layout: fonts, providers (Auth, Progress, QueryClient)
  (tabs)/
    _layout.tsx          # NativeTabs (iOS 26 liquid glass) + ClassicTabs fallback
    index.tsx            # Learn tab — lessons list with language filter
    chat.tsx             # AI Chat tab — streaming GPT chat tutor
    voice.tsx            # Voice Rooms tab — room browser with join/leave
    progress.tsx         # Progress tab — XP, streak, stats, activity feed
  (auth)/
    _layout.tsx          # Auth modal stack
    login.tsx            # Login screen
    register.tsx         # Register screen
  lesson/[id].tsx        # Lesson detail — section-by-section reader
  quiz/[id].tsx          # Quiz screen — adaptive questions + result screen
context/
  AuthContext.tsx        # User auth state (AsyncStorage)
  ProgressContext.tsx    # XP, streaks, completed lessons (AsyncStorage)
data/
  lessons.ts             # 15+ lessons across 8 languages with content
  quizzes.ts             # Quiz banks for each lesson
server/
  index.ts               # Express server setup
  routes.ts              # POST /api/chat — streaming OpenAI chat endpoint
```

## Key Decisions

- Auth is local-only (AsyncStorage) — no backend auth needed
- Progress is persisted locally with AsyncStorage
- Chat uses SSE streaming from server to avoid mobile fetch limitations
- Lessons use a section-by-section reader (like Duolingo cards)
- Quiz score tracking with best-score persistence
- Language filter on Learn tab for personalized lesson feed
- Tabs use NativeTabs (liquid glass) on iOS 26+ and BlurView fallback otherwise

## Color Palette

- Primary: `#FF6B35` (coral orange)
- Secondary: `#4ECDC4` (teal)
- Background (dark): `#0F1117` (near black)
- Card (dark): `#1A1F2E` (dark navy)
- Gold: `#F7C948` (XP / stars)
- Mint: `#6BCB77` (completed / success)

## Running

- Backend: `npm run server:dev` (port 5000)
- Frontend: `npm run expo:dev` (port 8081)
