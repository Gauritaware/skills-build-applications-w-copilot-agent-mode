git status# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Add React routes and components for activities, teams, leaderboard, and workout suggestions. Use the shared API client, render loading, empty, and failure states accessibly, and keep UI state separate from API and data access.
- Logic tier decision: Use Express routes to validate `/api/*` requests and delegate model operations to typed service functions. Return deliberate 4xx responses for bad input or missing resources and a consistent 5xx response for unexpected failures.
- Data tier decision: Implement Mongoose models with required fields and ObjectId references in `src/models`, then add an idempotent seed script that creates representative users, teams, activities, and workouts without removing unrelated records.
- Activity tracking approach: Validate user and team ObjectIds and verify that both referenced records exist before creating an activity. Store the submitted references and type, require positive minutes, compute positive points and set `occurredAt`; return `201` for creation and list activities through `GET`.
- Team management approach: Require a team name and mascot, default members to an empty ObjectId array, and preserve submitted member references. Reject missing names with `400` and expose created and listed teams with their members.
- Leaderboard approach: Aggregate activity points by team, sort descending, name each team with its summed points, and assign a consecutive 1-based rank. Use the Team records so teams with no activities can be included consistently with the seed and contract.
- Workout suggestions approach: Find the user by the encoded email route parameter, inspect recent activities and the user's fitness goal, and select seeded workouts whose focus matches that pattern. Include an explanatory reason and return a 4xx response when no user matches.

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend` - Establishes Mongoose validation and idempotent seed behavior. The baseline data suite has 4 model/seed failures and 1 passing seed-independent check; failures mean required fields, references, or seed persistence are not implemented.
- API command: `npm run test:api --prefix octofit-tracker/backend` - Verifies activity and team contracts, leaderboard ordering, workout matching, and deliberate 4xx responses. The baseline API suite has 4 failures: incomplete routes/models are returning 501 or no data and are missing workout reasons.
- Frontend command: `npm test --prefix octofit-tracker/frontend` - Verifies data rendering, route-specific fetching, loading, empty, and accessible error states. The baseline frontend suite has 15 failures because the starter pages still show "Implementation pending" instead of fetching and rendering contract data.
- Backend build command: `npm run build --prefix octofit-tracker/backend` - Confirms Express, Mongoose, and TypeScript compile cleanly after the data and API implementation.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend` - Confirms React routes, components, and types compile and the Vite bundle succeeds after the presentation implementation.
- Full baseline command: `npm test --prefix octofit-tracker/backend` - Confirmed the red baseline: 8 of 9 backend tests fail, with 4 data-contract failures and 4 API-contract failures.
- Smallest safe implementation order: complete and pass data-tier tests first, then API route/service tests, then frontend contract tests. Finish with both build commands so data, logic, presentation, and types are each verified independently.
