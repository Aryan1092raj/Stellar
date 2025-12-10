# Deployment Guide

This document provides instructions for deploying the frontend and backend services.

## Frontend (Next.js) - Vercel

1.  **Connect your Git repository to Vercel.**
2.  **Configure the project:**
    *   Framework Preset: Next.js
    *   Build Command: `npm run build`
    *   Output Directory: `.next`
    *   Install Command: `npm install`
3.  **Add Environment Variables:**
    *   `NEXT_PUBLIC_BACKEND_URL`: The URL of your deployed backend (e.g., `https://your-backend.onrender.com`). This can be set as a Vercel environment variable.

## Backend (Node.js) - Render

1.  **Create a new Web Service on Render.**
2.  **Connect your Git repository.**
3.  **Configure the service:**
    *   **Name:** backend
    *   **Root Directory:** `backend`
    *   **Environment:** Node
    *   **Build Command:** `npm install && npm run build`
    *   **Start Command:** `npm start`
    *   **Plan:** Free
4.  **Add Environment Variables:**
    *   `PORT`: `4000`
    *   `FRONTEND_URL`: The URL of your deployed frontend (e.g., `https://your-frontend.vercel.app`).
    *   `DATABASE_URL`: Your database connection string.
    *   `JWT_SECRET`: A strong, unique secret for JWT signing.
    *   ... and other variables from `.env.example`.

## Local Development

1.  **Clone the repository.**
2.  **Backend:**
    *   Navigate to the `backend` directory: `cd backend`
    *   Create a `.env` file from `.env.example` and fill in the values.
    *   Install dependencies: `npm install`
    *   Run the server: `npm run dev`
3.  **Frontend:**
    *   Navigate to the `frontend` directory: `cd frontend`
    *   Create a `.env.local` file from `.env.example` and fill in the values.
    *   Install dependencies: `npm install`
    *   Run the development server: `npm run dev`

## Build Commands

*   **Backend:** `npm run build` (compiles TypeScript to JavaScript)
*   **Frontend:** `npm run build` (creates a production build of the Next.js app)

## Health Check Endpoints

*   **Backend:** `GET /api/health`
