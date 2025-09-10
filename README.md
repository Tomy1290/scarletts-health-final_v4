# Scarletts Gesundheitstracking – Komplettes Repo

Dieses Repository enthält:
- backend/ (FastAPI + MongoDB)
- frontend/ (Expo + React Native mit expo-router)

Ziel: Ohne weitere Änderungen pushen, in Codemagic verbinden und APK bauen.

Schnellstart lokal
1) Backend vorbereiten
   - cd backend
   - Kopiere .env.example zu .env und setze Variablen
   - Optional: pip install -r requirements.txt
   - Start: uvicorn server:app --host 0.0.0.0 --port 8001
2) Frontend starten
   - cd ../frontend
   - yarn install
   - Kopiere .env.example zu .env und setze EXPO_PUBLIC_BACKEND_URL
   - yarn start

Build mit Codemagic (APK)
1) Neues GitHub-Repo erstellen (z. B. scarletts-health-final) und kompletten Inhalt pushen
2) In Codemagic das Repo verbinden und Projektverzeichnis auf frontend/ setzen
3) In Codemagic Umgebungsvariable EXPO_TOKEN hinterlegen (von https://expo.dev -> Profile -> Access Tokens)
4) Workflow wählen:
   - expo-android (Gradle assembleRelease)
   - expo-android-debug (Gradle assembleDebug, falls Signing-Probleme)
5) Build starten, APK unter android/app/build/outputs/** wird bereitgestellt

Wichtige Hinweise
- Alle Backend-Endpunkte sind mit /api prefixiert, keine Ports/URLs im Code ändern.
- Für KI-Chat Gugi wird EMERGENT_LLM_KEY serverseitig genutzt (backend/.env).
- Themes, Achievements, Erinnerungen, Gewichtsziel-Logik, Kalender, Charts sind enthalten.