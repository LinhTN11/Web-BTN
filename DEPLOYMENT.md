# Web-BTN Deployment Guide

## Deployment Architecture
- **Frontend**: Deployed on Vercel
- **Backend**: Deployed on Render
- **Database**: MongoDB Atlas

## Environment Variables

### Frontend (Vercel)
Set these environment variables in your Vercel dashboard:

```bash
REACT_APP_API_URL=https://your-backend-app.onrender.com
REACT_APP_SOCKET_URL=https://your-backend-app.onrender.com
REACT_APP_ENVIRONMENT=production
GENERATE_SOURCEMAP=false
```

### Backend (Render)
Set these environment variables in your Render dashboard:

```bash
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_ACCESS_KEY=your_jwt_access_secret_key
JWT_REFRESH_KEY=your_jwt_refresh_secret_key
NODE_ENV=production
PORT=8000
FRONTEND_URL=https://your-app.vercel.app
```

## Deployment Steps

### 1. Deploy Backend to Render

1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Create a new "Web Service"
4. Connect your GitHub repository
5. Use these settings:
   - **Branch**: main
   - **Root Directory**: backend
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start:prod`
   - **Environment**: Node
6. Add environment variables listed above
7. Deploy

### 2. Deploy Frontend to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Import your GitHub repository
3. Use these settings:
   - **Framework Preset**: Create React App
   - **Root Directory**: frontend
   - **Build Command**: `npm run build`
   - **Output Directory**: build
4. Add environment variables listed above
5. Deploy

### 3. Update Frontend URLs

After backend deployment, update the frontend environment variables with your actual Render URL:

1. Go to your Vercel project settings
2. Update `REACT_APP_API_URL` with your Render backend URL
3. Update `REACT_APP_SOCKET_URL` with your Render backend URL
4. Redeploy frontend

### 4. Update Backend CORS

After frontend deployment, update your backend CORS settings:

1. Go to your Render service environment variables
2. Set `FRONTEND_URL` to your Vercel app URL
3. Redeploy backend

## Local Development

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Troubleshooting

### Common Issues

1. **CORS Error**: Make sure your Vercel URL is added to backend CORS settings
2. **Socket Connection Failed**: Check if REACT_APP_SOCKET_URL matches your backend URL
3. **Build Failed**: Check all environment variables are set correctly
4. **Database Connection**: Verify MongoDB Atlas whitelist includes Render IPs (0.0.0.0/0 for simplicity)

### Debug Commands

Check backend logs in Render dashboard
Check frontend build logs in Vercel dashboard

## Production Checklist

- [ ] Environment variables set correctly
- [ ] MongoDB Atlas configured with proper IP whitelist
- [ ] Backend CORS includes frontend URL
- [ ] Frontend API URLs point to backend
- [ ] SSL certificates working (automatic on both platforms)
- [ ] Socket.IO connection working
- [ ] Authentication flow working
- [ ] File uploads working (if applicable)
