# Campus SkillShare

Campus SkillShare is a college-only, Tinder-inspired platform for finding complementary skills. Instead of trying to learn everything alone, a frontend developer can discover a backend developer, mutually connect, and start a focused project conversation.

> **Demo scope:** the app uses a verified-campus-email demo login and seeded data. It is deliberately scoped as an MVP for a college hackathon, not a production social network.

## Problem statement

College students often have strong but narrow skills: one student can create polished frontend screens, while another understands APIs, databases, or cloud deployment. Finding the right collaborator is currently informal—WhatsApp groups, class chats, and word-of-mouth—so opportunities are missed and hackathon teams are often assembled too late.

**How might we help verified students quickly find trustworthy peers with complementary skills, while giving both people control over who can contact them?**

## Solution

Students make a compact profile with skills they offer and skills they want. The discovery deck presents potential collaborators. A student can pass or connect. Only after both people choose Connect does the platform create a match and permit a connection request. This reduces unsolicited messages while keeping the interaction fast and familiar.

## Features

- College-only gate using `.edu` email validation (demo implementation)
- Skill-first profiles: offered skills, desired skills, availability and short bio
- Swipe-style pass/connect discovery flow
- Mutual-like matching logic
- Contact is unlocked only for a matched pair
- Persistent API data stored in `data/db.json`
- Editable profile with transparent, skill-first recommendations
- Responsive frontend that works on mobile and desktop

## Tech stack

| Area | Choice | Why it fits the MVP |
|---|---|---|
| Frontend | Vanilla HTML, CSS, JavaScript | Fast to demo; no build step or framework overhead |
| Backend | Python + FastAPI | Fast, typed REST API with automatic interactive documentation |
| Persistence | JSON file | Zero setup and easy seeded demo data |
| API style | REST + JSON | Clear, testable frontend/backend contract |
| Production upgrade | React, PostgreSQL, Prisma, JWT/SSO | Better maintainability, relational integrity, secure auth |

## Architecture

```text
Browser UI (public/)  →  FastAPI REST API (main.py)  →  data/db.json
       ↑                         │
       └── render cards/matches ─┴── validates + persists swipes, matches, requests
```

The frontend never creates a match itself. It sends a swipe to the API; the server checks whether a reciprocal positive swipe exists, creates the match if required, and returns that outcome.

## Data model

```text
User 1 ──< Swipe >── 1 User
User 1 ──< Match >── 1 User
User 1 ──< ContactRequest >── 1 User
```

Key fields:

- `User`: identity, college, course/year, bio, skills offered/wanted, availability
- `Swipe`: `fromUserId`, `toUserId`, `liked`, timestamp
- `Match`: two user IDs and creation time; exists only when likes are reciprocal
- `ContactRequest`: sender, recipient, message, status and timestamp

## API contract

| Method / route | Purpose |
|---|---|
| `POST /api/auth/demo` | Accepts demo `.edu` email and returns the seeded current user |
| `GET /api/profiles?currentUserId=1` | Returns unseen discovery profiles |
| `PUT /api/users/:id` | Saves skills, interests, availability and bio, then refreshes ranking |
| `POST /api/swipes` | Stores pass/connect; returns a match if reciprocal |
| `GET /api/matches/:userId` | Gets a user’s matched partners |
| `POST /api/contact-requests` | Sends a request only if the users match |

Example swipe body:

```json
{ "fromUserId": 1, "toUserId": 2, "liked": true }
```

## Run locally

Prerequisite: Python 3.10 or later.

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Open `http://127.0.0.1:8000`. In the seeded data, Aarav has already liked the current demo user. Click Connect on Aarav to demonstrate the full match and contact-request flow. Interactive API documentation is at `http://127.0.0.1:8000/docs`.

To reset the demo, restore `data/db.json` to its original contents from source control, or delete the added swipe/match entries manually.

## Project structure

```text
Campus SkillShare/
├── public/
│   ├── index.html       # application shell
│   ├── style.css        # responsive visual design
│   └── app.js           # UI state and API calls
├── data/db.json         # seeded MVP persistence
├── main.py              # FastAPI routes and matching rules
├── requirements.txt     # Python packages
└── README.md            # product and interview documentation
```

## Development difficulties and how they were handled

### 1. Preventing one-sided or unwanted contact

**Challenge:** a simple directory could let anyone message anyone, which is noisy and can feel unsafe.

**Decision:** use a two-sided match. The server—not the browser—checks for a reciprocal positive swipe. The contact endpoint repeats the match check before saving a request. This protects the core rule even if someone manually calls the API.

### 2. Avoiding duplicate swipes and matches

**Challenge:** a user may change their decision or double-click a button; naïvely appending rows creates duplicates.

**Decision:** each incoming swipe first removes the existing decision for the same directed pair, then saves the new decision. Match creation searches for an existing unordered pair before creating one. In production, use composite unique indexes.

### 3. Keeping a polished demo simple to run

**Challenge:** cloud databases and authentication configuration can consume hackathon time and break a live demo.

**Decision:** use a JSON data store and seeded profiles for the MVP. The API boundaries mirror a real system, so storage can be swapped for Prisma/PostgreSQL without rewriting the UI.

### 4. Matching relevance instead of random browsing

**Challenge:** showing every student makes discovery slow and low-signal.

**Current solution:** recommendations are transparent and deterministic. Each card shows a fit score and explanation. The ranking is: up to **55 points** for skills the candidate can teach the viewer, **25 points** for skills the viewer can offer them, **10 points** for compatible availability, and **10 points** for shared project interests. College membership is a required filter, not a score booster. A student can edit their profile to refresh the order.

**Next iteration:** learn from accepted collaborations and explicit feedback, while keeping the explanation visible and avoiding sensitive attributes (such as gender, caste, or social popularity) in ranking.

## Security and privacy considerations

- Verify college membership using institution SSO, or email magic links restricted to approved domains—not a client-provided email string.
- Replace the demo token with short-lived signed JWTs or secure server sessions.
- Store password/session secrets in environment variables; never commit them.
- Validate request bodies with Zod/Joi, rate-limit authentication/swipe endpoints, and add CSRF protection if using cookies.
- Use database authorization checks so a user can access only their own matches and messages.
- Add report/block controls, moderation workflow, consent-based contact sharing, audit logs, and a data deletion policy.
- Serve over HTTPS and use a managed database backup policy.

## Production roadmap

1. **Authentication:** college SSO / verified campus email and onboarding.
2. **Database:** PostgreSQL with Prisma migrations; indexes on `Swipe(fromUserId,toUserId)` and canonical match pairs.
3. **Messaging:** real-time chat with Socket.IO, moderation and read receipts.
4. **Discovery:** ranked recommendations, filters by skill/project/availability, saved searches.
5. **Trust:** profile verification, reporting/blocking, admin dashboard.
6. **Deployment:** React/Vite frontend on Vercel; FastAPI service on Render/Railway; Neon/Supabase PostgreSQL; CI tests via GitHub Actions.

## Interview talking points

**Why Tinder-like interaction?** It makes evaluating a short profile low-friction while the mutual-match model gives both students agency over contact.

**Why REST instead of GraphQL?** The MVP has small, resource-oriented needs. REST is easier to explain, cache, test, and build quickly. GraphQL becomes useful if the app develops many client-specific query shapes.

**How do you ensure a match is valid?** The server persists a positive swipe and looks for the reciprocal positive swipe. A contact request is permitted only if an unordered match pair exists.

**How would you scale it?** Move persistence to PostgreSQL, add indexes and pagination/cursor discovery, cache frequently accessed profiles, run stateless API instances behind a load balancer, and use WebSockets plus a message queue for notifications.

**What would you measure?** Profile completion rate, discovery-to-like rate, mutual-match rate, contact-request acceptance rate, time to first collaboration, reports/block rate, and retention by campus.

**What is the business model?** Keep core matching free for students; colleges can sponsor verified communities or career/hackathon programs. Avoid pay-to-contact mechanics because trust and equal access matter for this audience.

## Suggested hackathon pitch (30 seconds)

“Campus SkillShare solves the teammate gap in college. Students already have valuable skills, but frontend developers, backend developers, designers, and data enthusiasts struggle to find one another beyond noisy group chats. Our college-verified matching flow shows complementary skills, requires mutual interest before contact, and turns ‘I have an idea but need a backend developer’ into a safe, actionable connection.”

## Known MVP limitations

- JSON persistence is single-server only and not appropriate for concurrent production traffic.
- Demo authentication validates the email suffix only; it does not prove ownership.
- Contact requests are stored but there is no inbox or real-time chat yet.
- Discovery is seeded and not yet algorithmically ranked.
