# ConstructPro Backend

Node.js + Express + TypeScript backend for the AI Site Inspection Report tool.

- **Auth** — Firebase Admin SDK (verifies ID tokens from the app)
- **Database** — Supabase Postgres (reports + report_steps tables)
- **Storage** — Supabase Storage (inspection photos)
- **AI** — OpenAI GPT-4o Vision (auto-describes construction site images)

---

## Local Development

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Create `.env` file
```env
PORT=8080
ALLOWED_ORIGIN=*

SUPABASE_URL=https://zkorsfkokutttcbkuqke.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Supabase → Settings → API → service_role
SUPABASE_STORAGE_BUCKET=inspection-images

OPENAI_API_KEY=sk-...
OPENAI_VISION_MODEL=gpt-4o
```

Firebase credentials are loaded automatically from the JSON key file in the backend root:
```
constructpro-ee587-firebase-adminsdk-fbsvc-04b978f75c.json
```

### 3. Run the Supabase schema
In Supabase Dashboard → **SQL Editor** → paste and run `supabase/schema.sql`.

Then go to **Storage** → **New bucket**:
- Name: `inspection-images`
- Public: **OFF**

### 4. Start the dev server
```bash
npm run dev
```

### 5. Test
```bash
# Health check
curl http://localhost:8080/health

# Create a report (dev-test bypasses Firebase auth)
curl -X POST http://localhost:8080/api/v1/reports \
  -H "Authorization: Bearer dev-test" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Report","author":"Shahzeb"}'
```

---

## Deploy to Render

### Step 1 — Push to GitHub
Make sure the backend folder is committed. The Firebase JSON key file is gitignored — you will set its contents as env vars on Render.

```bash
git add backend/
git commit -m "feat: add site inspection backend"
git push
```

### Step 2 — Create a new Web Service on Render

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo
3. Set the following:

| Setting | Value |
|---------|-------|
| **Root Directory** | `backend` |
| **Environment** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `node dist/index.js` |
| **Instance Type** | Free (or Starter) |

### Step 3 — Add environment variables on Render

In the Render dashboard → your service → **Environment** tab, add:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `ALLOWED_ORIGIN` | `*` (or your app's origin) |
| `SUPABASE_URL` | `https://zkorsfkokutttcbkuqke.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | your service role key |
| `SUPABASE_STORAGE_BUCKET` | `inspection-images` |
| `OPENAI_API_KEY` | your OpenAI key |
| `OPENAI_VISION_MODEL` | `gpt-4o` |
| `FIREBASE_PROJECT_ID` | `constructpro-ee587` |
| `FIREBASE_CLIENT_EMAIL` | from your Firebase JSON key file |
| `FIREBASE_PRIVATE_KEY` | from your Firebase JSON key file (include `-----BEGIN...` with `\n` for newlines) |

> **Tip:** Open `constructpro-ee587-firebase-adminsdk-fbsvc-04b978f75c.json` locally.
> Copy `client_email` → paste as `FIREBASE_CLIENT_EMAIL`.
> Copy `private_key` → paste as `FIREBASE_PRIVATE_KEY` (keep all `\n` as-is, Render handles it).

### Step 4 — Deploy

Click **Deploy**. Render will run `npm install && npm run build` then start the server.

Once deployed, your URL will be something like:
```
https://constructpro-backend.onrender.com
```

Test it:
```
https://constructpro-backend.onrender.com/health
```
Expected: `{"status":"ok","version":"1.0.0"}`

### Step 5 — Update the app

Add to your app's `.env` (in the project root, not backend/):
```env
EXPO_PUBLIC_BACKEND_URL=https://constructpro-backend.onrender.com
```

Then rebuild the app with `eas build`.

---

## API Reference

All routes (except `/health`) require `Authorization: Bearer <firebase-id-token>`.

### Reports
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/reports` | List all reports for the user |
| `POST` | `/api/v1/reports` | Create a new report |
| `GET` | `/api/v1/reports/:id` | Get report + steps |
| `PATCH` | `/api/v1/reports/:id` | Update report title/author |
| `DELETE` | `/api/v1/reports/:id` | Delete report + all steps |

### Steps
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/reports/:id/steps` | Add step (multipart: `image` file + optional fields) |
| `PATCH` | `/api/v1/reports/:id/steps/:stepId` | Update description/location/notes |
| `DELETE` | `/api/v1/reports/:id/steps/:stepId` | Delete step |

### Export
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/reports/:id/export` | Returns HTML report for PDF generation |

---

## Supabase Schema

Run `supabase/schema.sql` in the Supabase SQL Editor to create the `reports` and `report_steps` tables.
