# AI Simplified News Platform

An intelligent, multilingual news platform powered by **FastAPI** (Python backend) and **React + Vite** (Tailwind CSS frontend). The platform ingests RSS feeds, simplifies news articles using AI (Groq Llama 3), generates quizzes, provides multi-language translations, and offers interactive text-to-speech.

---

## 🚀 Deploying to GitHub Pages

GitHub Pages hosts the **Frontend Single Page Application** for free directly at:
`https://<YOUR_GITHUB_USERNAME>.github.io/<REPO_NAME>/`

### How Full-Stack Works with GitHub Pages
- **Frontend**: Automatically built and published to GitHub Pages via our automated GitHub Actions workflow (`.github/workflows/deploy-pages.yml`).
- **Backend (FastAPI)**: Because GitHub Pages only serves static files and does not run Python or databases, the backend runs on a free cloud provider (such as [Render](https://render.com), Railway, or Fly.io). The frontend connects to your backend URL via the `VITE_API_URL` variable.
- **Guest / Demo Mode**: If your backend is not yet deployed, visitors on GitHub Pages can click **"Preview as Guest (Demo Mode)"** on the login page to preview the UI.

---

### Step 1: Push Your Code to GitHub

1. Create a new repository on [GitHub](https://github.com/new) (e.g. `ai-news-platform`).
   *(Do NOT check "Add a README" or ".gitignore".)*

2. In your local project directory, run:
   ```bash
   git branch -M main
   git add .
   git commit -m "feat: setup github pages and deployment configuration"
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<REPO_NAME>.git
   git push -u origin main
   ```

---

### Step 2: Enable GitHub Pages in Your Repository

1. Go to your repository on GitHub.
2. Click **Settings** (tab at the top) → **Pages** (in the left sidebar under *Code and automation*).
3. Under **Build and deployment**:
   - Change **Source** from *"Deploy from a branch"* to **"GitHub Actions"**.
4. Go to the **Actions** tab on your repo. You will see the **Deploy Frontend to GitHub Pages** workflow running automatically!
5. When complete (usually ~1 minute), your site is live at:
   `https://<YOUR_GITHUB_USERNAME>.github.io/<REPO_NAME>/`

---

### Step 3: Connect Live Backend to GitHub Pages (Optional but Recommended)

To enable live news feeds, AI summarization, audio text-to-speech, and full user accounts:

1. **Deploy the Backend to Render (Free):**
   - Go to [Render.com](https://render.com) and click **New +** → **Web Service**.
   - Select your GitHub repository.
   - Settings:
     - **Runtime**: Python 3
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - In Environment Variables, add:
     - `GROQ_API_KEY`: *(Your Groq API key from https://console.groq.com/keys)*
     - `FRONTEND_URL`: `https://<YOUR_GITHUB_USERNAME>.github.io`
   - Click **Create Web Service** and copy your live backend URL (e.g. `https://my-news-api.onrender.com`).

2. **Link the Backend URL in GitHub:**
   - In your GitHub repo, go to **Settings** → **Secrets and variables** → **Actions** → **Variables** tab.
   - Click **New repository variable**.
   - **Name**: `VITE_API_URL`
   - **Value**: `https://my-news-api.onrender.com`
   - Re-run the GitHub Pages workflow (or run `git push`), and your GitHub Pages frontend will now communicate directly with your live cloud backend!

---

## 🛠️ Alternative Deployment Options

### Single-Service Full-Stack on Render
If you prefer having **both frontend and backend served on a single URL** without separate hosting:
- Connect the repo to Render as a Web Service.
- Build Command: `./build.sh`
- Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- FastAPI will automatically serve the built React frontend at `/` and the REST APIs at `/api/*`.

### Containerized Docker
```bash
docker compose up --build
```
Runs backend and MongoDB together on `http://localhost:8000`.

---

## ⚙️ Environment Variables Reference

| Variable | Scope | Required | Description |
|---|---|---|---|
| `GROQ_API_KEY` | Backend | **Yes** | Required for AI article simplification and quizzes |
| `GROQ_MODEL` | Backend | No | AI model name (default: `llama-3.1-8b-instant`) |
| `JWT_SECRET` | Backend | Recommended | Secret key for auth tokens |
| `MONGO_URI` | Backend | No | MongoDB URI (falls back to local JSON data) |
| `DATABASE_URL` | Backend | No | PostgreSQL URL (falls back to SQLite) |
| `FRONTEND_URL` | Backend | No | CORS allowed origin for GitHub Pages |
| `VITE_API_URL` | Frontend | No | Points frontend to backend API URL |
