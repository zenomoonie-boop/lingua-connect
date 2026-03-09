# TODO: Add Map Background to Profile Avatar

- [x] 1. Analyze project structure and understand requirements
- [x] 2. Update User type in AuthContext to add location fields (latitude, longitude, locationName)
- [x] 3. Modify progress.tsx to add map view as background behind avatar in profile header
- [x] 4. Add location picker in Edit Profile modal (option to use current location or select from map)
- [x] 5. Add expo-location plugin in app.json with permissions
- [x] 6. Add Google Maps API key config for iOS and Android

## Implementation Details:
- Add location, latitude, longitude to User type in AuthContext
- Add MapView component behind avatar in profile header
- Style the map to be semi-transparent or cropped nicely
- Add "Set Location" button in Edit Profile
- Use expo-location to get current position
- Use react-native-maps for location selection

## Status: COMPLETED ✅

## Next Steps for User to Test:
1. **Replace Google Maps API Key** - Open `app.json` and replace `"YOUR_GOOGLE_MAPS_API_KEY"` with your actual Google Maps API key
2. **Generate Native Folders** - Run `npx expo prebuild` to generate iOS/Android folders
3. **Test on Device** - Run `npx expo run:ios` or `npx expo run:android`

## How it Works:
1. Go to Profile tab
2. You will see a map background behind your avatar (default: San Juan, Philippines)
3. Click on the location text below your name to set your current location
4. The app will request location permission
5. After getting location, it saves to your profile and updates the map

---

# TODO: Fix AI Chat Response

- [x] 1. Update server/routes.ts - Change model from invalid "gpt-5.2" to "gpt-4o"
- [x] 2. Update server/replit_integrations/chat/routes.ts - Change model from invalid "gpt-5.1" to "gpt-4o-mini"
- [x] 3. Improve AI prompt for better multilingual responses
- [x] 4. Update documentation (replit.md) to reflect correct model names

## Implementation Details:
- The AI chat uses Replit AI Integrations (OpenAI)
- Changed invalid model names to valid ones: gpt-5.2 → gpt-4o, gpt-5.1 → gpt-4o-mini
- Enhanced the system prompt to be more flexible and support any language
- AI now responds in the selected language and encourages language practice

## Status: COMPLETED ✅

## How to Test:
1. Deploy to Replit (where AI Integrations are configured)
2. Go to Messages tab
3. Click on "AI English Tutor"
4. Send a message in any language
5. The AI should respond properly in the selected language

---

# TODO: Custom OpenAI API Key Setup

- [x] 1. Install dotenv package
- [x] 2. Create .env file with OPENAI_API_KEY
- [x] 3. Update server/routes.ts to use custom env vars
- [x] 4. Update server/replit_integrations/chat/routes.ts to use custom env vars
- [x] 5. Update server/replit_integrations/audio/client.ts to use custom env vars
- [x] 6. Update .replit with OPENAI_API_KEY env var
- [x] 7. Add dotenv/config to server/index.ts

## Implementation Details:
- Added dotenv package for loading .env files
- Created .env file with user's OpenAI API key
- Modified all server files to use OPENAI_API_KEY with fallback to AI_INTEGRATIONS_OPENAI_API_KEY
- Updated .replit to support OPENAI_API_KEY environment variable

## Status: COMPLETED ✅

## How to Use:
### Local Development:
1. API key is already configured in .env file
2. Run: `npm run server:dev`
3. Run: `npm run expo:dev`
4. Test AI chat in the app

### Replit Deployment:
1. Set OPENAI_API_KEY in Replit secrets/secrets tab
2. Deploy and run normally
3. AI will use the configured API key

### Important Security Note:
- The .env file contains your API key - keep it secret!
- .env is already in .gitignore so it won't be committed
- If you want to share the project, delete .env and use .env.example as template

