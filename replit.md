# Nature's Grace - Replit Agent Guide

## Overview
Nature's Grace is a calm wellness mobile application built with React Native (Expo) and an Express backend. It is designed to be grounded, premium, and gentle, focusing on the philosophy "everything optional, nothing demanding." The platform supports iOS, Android, and web, with a backend providing an API layer and PostgreSQL database via Drizzle ORM. The project aims to provide a serene and non-intrusive wellness experience.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React Native with Expo SDK 54.
- **Navigation**: React Navigation with bottom tab navigation (Home, Wellness, Explore, Mood, Profile) and a Root Stack Navigator for authentication and modals.
- **State Management**: TanStack React Query for server state.
- **Styling**: Centralized StyleSheet-based theme constants (`client/constants/theme.ts`).
- **Path Aliases**: `@/` for `client`, `@shared/` for `shared`.
- **UI/UX Design**: Earthy olive-green color palette, rounded corners, minimal animations, no background images or scrolling on the Home screen. Specific color codes and button styles are defined.
- **Features**:
    - **Wellness Flow**: 6 categories (Healings, Spiritual Guidance, Counseling, Therapies, Financial Guidance, Diet & Nutrition) each with subtitles. Navigation: WellnessScreen → SubcategoryScreen (subcategory list) → CategoryDetailScreen (filtered practitioners) → PractitionerProfileScreen → BookSessionScreen. Practitioners have a `subcategory` field for filtering. Categories have `subtitle` and `subcategories` arrays. Uses mock data.
    - **Journal Feature**: Interactive journal with JournalContext (`client/context/JournalContext.tsx`) managing entries, mood selection, and streak calculation in-memory. Features: mood-entry connection (mood chips attach to entries), streak indicator (consecutive day count), guided reflection mode (3 prompts + breathing animation), editor with mood-aware placeholders/autosave/word count, recent entries with mood dots and press animations. Screens: MoodScreen (main), JournalEditorScreen, GuidedReflectionScreen, JournalEntriesListScreen, JournalEntryViewScreen. Gratitude log and monthly overview are UI-only.
    - **Settings & Session History**: UI-only screens for account settings, session history, reviews, favorites, payment methods, and support information. No data persistence.
    - **Resources**: UI-only sections for articles, audio sessions, and practices. No media playback or data persistence.
    - **NG Store**: UI-only product catalog with categories and product details. No checkout or payment functionality.
    - **Practitioner Interface**: Dedicated login and tab navigation for practitioners, including session management, profile editing, and configurable session offerings. Uses mock data. AddEditOfferingScreen includes a custom calendar picker for selecting available dates per offering (with "Always Available" toggle).
    - **App Logo**: Real Nature's Grace logo displayed in `AppHeader` center area (when no title); logo file at `assets/images/natures-grace-logo.png`.
    - **Seller Interface**: Dedicated login and tab navigation for sellers, including product management, listings configuration, and store overview. Uses mock data.

### Backend
- **Framework**: Express 5 with TypeScript.
- **API Routes**: All routes prefixed with `/api` and registered in `server/routes.ts`.
- **Storage**: Abstracted via `IStorage` interface, with an in-memory implementation (`MemStorage`) for development.
- **CORS**: Configured for Replit domains and localhost.

### Database
- **ORM**: Drizzle ORM with PostgreSQL dialect.
- **Schema**: Defined in `shared/schema.ts`, including a `users` table.
- **Migrations**: Output to `./migrations` directory.
- **Schema Validation**: Zod schemas generated via drizzle-zod.

### Project Structure
Organized into `client/` (frontend), `server/` (backend), and `shared/` (shared code like schema).

## External Dependencies

### Core Services
- **Database**: PostgreSQL (via `DATABASE_URL`).
- **Build System**: Expo CLI.

### Key Libraries
- **Navigation**: `@react-navigation/native`, `@react-navigation/bottom-tabs`, `@react-navigation/native-stack`.
- **Data Fetching**: `@tanstack/react-query`.
- **Database**: `drizzle-orm`, `pg`.
- **Animations**: `react-native-reanimated`.
- **Gestures**: `react-native-gesture-handler`.
- **Fonts**: `@expo-google-fonts/nunito`.

### Environment Variables
- `DATABASE_URL`
- `EXPO_PUBLIC_DOMAIN`
- `REPLIT_DEV_DOMAIN`
- `REPLIT_DOMAINS`