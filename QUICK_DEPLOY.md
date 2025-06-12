# Quick Deployment Instructions

## Bước 1: Deploy Backend lên Render

1. **Tạo GitHub repository** (nếu chưa có):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/username/repository-name.git
   git push -u origin main
   ```

2. **Đăng nhập Render**:
   - Vào https://render.com
   - Đăng nhập bằng GitHub

3. **Tạo Web Service**:
   - Chọn "New" > "Web Service"
   - Connect repository từ GitHub
   - Cấu hình:
     - **Name**: web-btn-backend
     - **Branch**: main
     - **Root Directory**: backend
     - **Build Command**: `npm install`
     - **Start Command**: `npm run start:prod`
     - **Plan**: Free

4. **Thêm Environment Variables**:
   ```
   NODE_ENV=production
   PORT=8000
   MONGODB_URL=mongodb+srv://tranngoclinh:22072005@cluster0.701nyvv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   JWT_ACCESS_KEY=my_super_secret_key
   JWT_REFRESH_KEY=my_refresh_key
   FRONTEND_URL=https://your-app.vercel.app
   ```

5. **Deploy** - Nhấn "Create Web Service"

## Bước 2: Deploy Frontend lên Vercel

1. **Đăng nhập Vercel**:
   - Vào https://vercel.com
   - Đăng nhập bằng GitHub

2. **Import Project**:
   - Chọn "Add New" > "Project"
   - Import repository từ GitHub

3. **Cấu hình**:
   - **Framework Preset**: Create React App
   - **Root Directory**: frontend
   - **Build Command**: `npm run build`
   - **Output Directory**: build

4. **Thêm Environment Variables**:
   ```
   REACT_APP_API_URL=https://your-backend.onrender.com
   REACT_APP_SOCKET_URL=https://your-backend.onrender.com
   REACT_APP_ENVIRONMENT=production
   GENERATE_SOURCEMAP=false
   ```

5. **Deploy** - Nhấn "Deploy"

## Bước 3: Cập nhật URLs

1. **Lấy URL Backend từ Render**:
   - Vào dashboard Render
   - Copy URL của web service (vd: https://web-btn-backend.onrender.com)

2. **Cập nhật Frontend Environment Variables**:
   - Vào Vercel project settings
   - Cập nhật `REACT_APP_API_URL` và `REACT_APP_SOCKET_URL`
   - Redeploy frontend

3. **Cập nhật Backend Environment Variables**:
   - Vào Render service settings
   - Cập nhật `FRONTEND_URL` với URL từ Vercel
   - Redeploy backend

## Bước 4: Test

1. **Kiểm tra Backend Health**:
   - Truy cập: https://your-backend.onrender.com/health
   - Truy cập: https://your-backend.onrender.com/v1/health

2. **Kiểm tra Frontend**:
   - Truy cập: https://your-app.vercel.app
   - Test đăng nhập
   - Test socket connection (chat, notifications)

## Troubleshooting

### Backend Issues:
- Kiểm tra logs trong Render dashboard
- Verify environment variables
- Check MongoDB Atlas whitelist (set to 0.0.0.0/0)

### Frontend Issues:
- Kiểm tra build logs trong Vercel
- Verify environment variables
- Check browser console for CORS errors

### CORS Issues:
- Backend phải có frontend URL trong environment variables
- Check network tab để xem request headers

## URLs Mẫu:
- Backend: https://web-btn-backend.onrender.com
- Frontend: https://web-btn-app.vercel.app
- Health check: https://web-btn-backend.onrender.com/health
