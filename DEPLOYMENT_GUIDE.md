# Matrix Deployment & Local Development Guide

This guide explains how to:
1. **Run the Matrix application locally** for verification.
2. **Deploy the complete stack on Render** (including PostgreSQL, Redis, Backend, and Frontend).

---

## 💻 Part 1: How to Run Matrix Locally

You have two options to run the application locally. **Option A** is the simplest and recommended way.

### Option A: Running via Docker Compose (Recommended)
This option starts all services (Postgres, Redis, Backend API, and Next.js Frontend) in containers and pre-wires them.

1. **Verify Docker**: Make sure Docker Desktop is open and running on your system.
2. **Create the Environment File**: We have created the `backend/.env` file. Open it and add your keys:
   - `GROQ_API_KEY`: Your Groq API key (from [console.groq.com](https://console.groq.com)).
   - `GOOGLE_API_KEY`: Your Gemini API key (optional/if used).
3. **Build and Run**: Open your terminal in the project root folder and run:
   ```bash
   docker compose up --build
   ```
4. **Access the Services**:
   - **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
   - **Backend API**: [http://localhost:8000](http://localhost:8000)
   - **API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Option B: Running Natively (Without Docker)
This option runs Python and Node.js directly on your local machine and uses **SQLite** as the database to avoid installing Postgres.

#### 1. Setup Backend
1. Open `backend/.env` and modify the Database and Redis settings to use the local native defaults:
   ```env
   # Comment out the Postgres URL:
   # DATABASE_URL=postgresql+asyncpg://matrix:matrix_secure_pass@postgres:5432/matrix

   # Uncomment the SQLite URL:
   DATABASE_URL=sqlite+aiosqlite:///./matrix.db

   # Comment out the Docker Redis URL:
   # REDIS_URL=redis://redis:6379

   # Uncomment the Local Redis URL:
   REDIS_URL=redis://localhost:6379
   ```
2. Make sure you have a local Redis server running on port `6379`.
   - *Quick Docker command for Redis*: If you don't have Redis installed, run: `docker run -d -p 6379:6379 redis:alpine`
3. Install dependencies and start the backend:
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   # source venv/bin/activate  # Mac/Linux
   pip install -r requirements.txt
   uvicorn main:app --port 8000 --reload
   ```
4. Start the background worker (in a new terminal):
   ```bash
   cd backend
   venv\Scripts\activate  # Windows
   python rq_worker.py
   ```

#### 2. Setup Frontend
1. Open a new terminal and run:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. Access the dashboard at [http://localhost:3000](http://localhost:3000).

---

## ☁️ Part 2: Deploying to Render (Full Infrastructure)

Since all previous resources are out, we will set up the database, cache, backend, and frontend from scratch on Render.

### Step 1: Deploy a Managed PostgreSQL Database
1. Log in to [Render](https://render.com).
2. Click **New** (top right) ➔ **PostgreSQL**.
3. Configure the database:
   - **Name**: `matrix-db`
   - **Database Name**: `matrix`
   - **User**: `matrix_user`
   - **Region**: Select the region closest to you (e.g., `Oregon (US West)` or `Frankfurt (EU Central)`). *Note: Keep all services in the same region!*
   - **Instance Type**: Select **Free** (or a paid tier if you want it to persist indefinitely; Render's free tier DBs expire after 90 days).
4. Click **Create Database**.
5. Once active, find the **Connection Details** section:
   - Copy the **Internal Database URL** (e.g., `postgresql://matrix_user:xyz@dpg-abc-123:5432/matrix`).
   - *Important*: Render databases do not automatically prefix the async driver. You must replace the protocol `postgresql://` with `postgresql+asyncpg://` when setting the environment variable in Step 3.

---

### Step 2: Deploy a Managed Redis Instance
1. In the Render Dashboard, click **New** ➔ **Redis**.
2. Configure Redis:
   - **Name**: `matrix-redis`
   - **Region**: *Must be the same region you selected for the PostgreSQL database!*
   - **Instance Type**: Select **Free**.
3. Click **Create Redis**.
4. Once active, copy the **Internal Redis Connection String** (e.g., `redis://red-1234567890:6379`).

---

### Step 3: Deploy the Backend (Docker Web Service)
Render will run both the FastAPI server and the Background Task Worker inside a single service using Docker, saving you service limits.

1. Click **New** ➔ **Web Service**.
2. Connect your GitHub repository (`Zahid-Ham/Matrix-Cyber`).
3. Configure the Web Service:
   - **Name**: `matrix-backend`
   - **Region**: *Same region as Database and Redis!*
   - **Runtime**: Select **Docker**.
   - **Root Directory**: `backend`
   - **Instance Type**: Select **Free**.
4. Scroll down and click **Advanced** to add **Environment Variables**:
   - `DATABASE_URL`: Your **Internal** Postgres URL with the async driver prefix (e.g., `postgresql+asyncpg://matrix_user:xyz@dpg-abc-123:5432/matrix`).
   - `REDIS_URL`: Your **Internal** Redis URL (e.g., `redis://red-1234567890:6379`).
   - `GOOGLE_API_KEY`: Your Gemini API Key.
   - `GROQ_API_KEY`: Your Groq API Key.
   - `SECRET_KEY`: A random secure string for JWT generation.
   - `ENVIRONMENT`: `production`
   - `ALLOWED_ORIGINS`: The URL of your deployed frontend (e.g., `https://matrix.onrender.com` or `https://matrix-frontend.vercel.app`).
   - `PORT`: `8000` (Render maps this automatically, but we set it explicitly to match the Dockerfile).
5. Click **Create Web Service**. 
6. Once deployed, verify it works by visiting `https://<your-backend-subdomain>.onrender.com/health`. You should see `{"status": "ok", "message": "Matrix API is operational"}`.

---

### Step 4: Deploy the Frontend
You have two great options for deploying the frontend.

#### Option A: Vercel (Recommended - Free & Fast)
Next.js works best on Vercel and builds extremely fast.
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New** ➔ **Project**.
3. Import your GitHub repository (`Zahid-Ham/Matrix-Cyber`).
4. Configure the Project:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Next.js`
5. Expand the **Environment Variables** section and add:
   - `NEXT_PUBLIC_API_URL`: Your Render backend service URL (e.g., `https://matrix-backend.onrender.com`). *Do not include a trailing slash.*
6. Click **Deploy**. Vercel will build your frontend and assign a public URL.

#### Option B: Render (Web Service)
If you prefer to keep all services inside Render:
1. Click **New** ➔ **Web Service**.
2. Connect your GitHub repository (`Zahid-Ham/Matrix-Cyber`).
3. Configure the Web Service:
   - **Name**: `matrix-frontend`
   - **Region**: Same region as backend.
   - **Runtime**: `Node`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL`: Your Render backend service URL (e.g., `https://matrix-backend.onrender.com`).
5. Click **Create Web Service**.

---

## 🛠️ Diagnostics & Verification

### 1. Database Migrations
The backend has auto-migration logic built into its startup lifespan. When it boots up on Render for the first time, it will automatically connect to your PostgreSQL database and initialize the tables and schema modifications. No manual schema import is required!

### 2. Testing Your Setup
Once deployed, log in to your frontend URL, register an account, launch a scan against an authorized target, and check the live logs. If logs stream in and findings appear in the summary cards, the entire communication bridge between Frontend ➔ Backend ➔ Redis Queue ➔ Postgres is fully operational!
