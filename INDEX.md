# CampusSkillShare: code index

FastAPI + SQLAlchemy (MySQL) backend serving a vanilla HTML/CSS/JS single-page frontend from `public/`.
Line numbers refer to the files as supplied in the zip.

## Files

| File | Lines | Role |
|---|---|---|
| `main.py` | 831 | FastAPI app: helpers, all API routes, static mount of `public/` |
| `auth.py` | 116 | bcrypt password hashing, JWT creation, `get_current_user` dependency |
| `database.py` | 34 | Reads `DATABASE_URL` from `.env`, creates engine, `SessionLocal`, `Base`, `get_db` |
| `models.py` | 159 | SQLAlchemy tables: `User`, `Profile`, `Swipe`, `Match`, `Message` |
| `schemas.py` | 33 | Pydantic request bodies |
| `seed_data.py` | 163 | Inserts 7 test users (`*@test.edu`) with profiles; skips existing emails |
| `public/index.html` | 469 | Page shell: auth forms plus discover / matches / profile / chat sections |
| `public/app.js` | 1865 | All frontend state, API calls and rendering |
| `public/style.css` | 725 | Styles (the only stylesheet `index.html` loads) |
| `public/profile.css` | 58 | Not referenced anywhere |
| `public/sound/match.mp3` | - | Not referenced; the match sound is synthesised with `AudioContext` |
| `data/db.json` | 148 | Not referenced; leftover from an earlier JSON-store version |
| `requirements.txt` | 9 | Pinned dependencies |
| `.env` | - | `DATABASE_URL`, `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` |
| `README.md` | - | Describes the earlier JSON-store/demo-login version, not this code |

## API routes (`main.py`)

All routes except health, signup and login require `Authorization: Bearer <JWT>`.

| Method and path | Function | Line | What it does |
|---|---|---|---|
| GET `/api/health` | `health` | 237 | Static status |
| POST `/api/auth/signup` | `signup` | 249 | Rejects duplicate or non-`.edu` email, creates `User` + empty `Profile`, returns token |
| POST `/api/auth/login` | `login` | 318 | Verifies password, returns token + user |
| GET `/api/users/me` | `get_me` | 358 | Current user with profile |
| PUT `/api/users/me/profile` | `update_profile` | 369 | Saves bio, skills, interests, availability |
| GET `/api/profiles` | `get_profiles` | 420 | Same-college users not yet swiped, sorted by `matchScore` |
| GET `/api/users/{user_id}` | `get_user` | 484 | Any user by id |
| POST `/api/swipes` | `swipe` | 509 | Upserts swipe; on reciprocal like creates `Match` and returns `matchId` |
| GET `/api/matches` | `get_matches` | 626 | Current user's matches, newest first |
| GET `/api/chats/{match_id}/messages` | `get_messages` | 681 | Messages for a match, oldest first |
| POST `/api/chats/{match_id}/messages` | `send_message` | 723 | Adds a message |
| PATCH `/api/chats/{match_id}/read` | `mark_messages_as_read` | 802 | Marks the other user's messages read (see Issues) |
| `/` (mount) | `StaticFiles` | 789 | Serves `public/` |

### Helpers (`main.py`)

| Function | Line | Purpose |
|---|---|---|
| `serialize_profile` | 59 | `Profile` row to camelCase dict; splits comma-separated skill strings |
| `user_to_dict` | 82 | `User` row plus profile |
| `get_authorized_match` | 98 | Loads a match; 404 if missing, 403 if caller is not in it |
| `calculate_match_score` | 127 | +30 per skill the candidate offers that I want, +30 per skill I offer that they want, +10 same availability, +10 per shared project interest |

## Auth (`auth.py`)

| Name | Line | Purpose |
|---|---|---|
| `hash_password` / `verify_password` | 47 / 51 | bcrypt via passlib |
| `create_access_token` | 61 | JWT with `sub` = user id and `exp` |
| `get_current_user` | 78 | Decodes bearer token, loads `User`, 401 on failure |

## Database tables (`models.py`)

| Model (table) | Line | Columns | Constraints |
|---|---|---|---|
| `User` (`users`) | 22 | id, name, email, password_hash, college, branch, year, created_at | email unique |
| `Profile` (`profiles`) | 42 | id, user_id, bio, skills_offered, skills_wanted, project_interests, availability, avatar | one per user; lists stored as comma-separated text |
| `Swipe` (`swipes`) | 62 | id, from_user_id, to_user_id, liked, created_at | unique (from, to) |
| `Match` (`matches`) | 96 | id, user1_id, user2_id, created_at | unique (user1, user2); user1 is the lower id |
| `Message` (`messages`) | 128 | id, match_id, sender_id, message, is_read, created_at | index on match_id |

Tables are created at import by `Base.metadata.create_all` (`main.py:29`).

## Request schemas (`schemas.py`)

`SignupRequest` (6), `LoginRequest` (15), `ProfileUpdate` (20), `SwipeRequest` (28), `MessageCreate` (33).

## Frontend (`public/app.js`)

| Function / block | Line | Purpose |
|---|---|---|
| `getToken` / `saveToken` / `removeToken` | 29 / 34 / 42 | JWT in `localStorage` key `campusSkillShareToken` |
| `apiRequest` | 49 | `fetch` wrapper adding the bearer header |
| login/signup toggle listeners | 99, 119 | Switch between the two forms |
| signup submit | 141 | POST `/auth/signup` |
| login submit | 233 | POST `/auth/login` |
| `showApp` | 296 | Hides auth, shows app |
| logout and nav listeners | 318, 367 | Logout; nav buttons call `showSection` |
| `showSection` | 413 | Switches discover / matches / profile / chat |
| `loadCurrentUser` | 465 | GET `/users/me` |
| `logoutAutomatically` | 486 | Clears session on auth failure |
| `loadDiscover` | 506 | GET `/profiles` |
| `renderDiscoverProfile` | 559 | Renders the swipe card |
| `handleSwipe` | 752 | POST `/swipes`; triggers match notification |
| `loadMatches` | 802 | GET `/matches`, plus messages per match for the inbox |
| `createInboxCard` | 934 | One match row |
| `showMatchNotification` | 1045 | "It's a match" popup |
| `openMatchesFromNotification` | 1195 | Jumps to matches |
| `playMatchSound` | 1222 | Synthesised chime |
| `loadProfile` | 1316 | Fills the profile form |
| profile form submit | 1401 | PUT `/users/me/profile` |
| `openChat` | 1531 | Opens chat and starts a polling `setInterval` |
| `markMessagesAsRead` | 1584 | PATCH `/chats/{id}/read` |
| `loadMessages` | 1615 | GET `/chats/{id}/messages` |
| message form submit | 1703 | POST `/chats/{id}/messages` |
| `getInitials`, `escapeHtml`, `escapeJsString` | 1768, 1789, 1807 | Utilities |
| `initializeApp` | 1835 | Startup: restore session from stored token |

### Page sections (`public/index.html`)

`#auth-section` (21) with `#login-form` (36) and `#signup-form` (85); `#app-section` (196) containing `#discover-section` (247), `#matches-section` (276), `#profile-section` (304) and `#chat-section` (417).

## Issues found while indexing

1. **Mark-as-read is unreachable.** `PATCH /api/chats/{match_id}/read` (`main.py:802`) is declared after the `/` static mount (`main.py:789`), so the mount catches the request first. A minimal reproduction of that ordering returns 405. Moving the route above the mount fixes it.
2. **README and `data/db.json` describe a different app** (JSON store, `/api/auth/demo`, `/api/contact-requests`); none of that exists in the code.
3. **Scoring differs from the README** (README: 55/25/10/10 capped; code: uncapped 30/30/10/10 per item).
4. **`get_profiles` runs one swipe query per candidate**, and `GET /api/users/{user_id}` returns any user's email regardless of college or match.
5. **`.env` with real credentials is in the zip**, and CORS allows every origin with credentials.
