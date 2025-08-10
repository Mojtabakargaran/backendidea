# Deploying Samanin Backend to Render

This guide explains how to deploy your NestJS backend application to Render.

## Prerequisites

1. A Render account (sign up at [render.com](https://render.com))
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. A configured email service (Gmail, SendGrid, etc.)

## Deployment Steps

### Method 1: Using render.yaml (Recommended)

1. **Connect your repository:**
   - Go to your Render dashboard
   - Click "New" → "Blueprint"
   - Connect your Git repository containing this backend code
   - Render will automatically detect the `render.yaml` file and create the services

2. **Configure environment variables:**
   The following environment variables will be automatically set from `render.yaml`:
   - Database connection variables (from the PostgreSQL service)
   - JWT_SECRET (auto-generated)
   - NODE_ENV, PORT, API_PREFIX

   **You need to manually set these in the Render dashboard:**
   - `SMTP_HOST` - Your email provider's SMTP host (e.g., smtp.gmail.com)
   - `SMTP_PORT` - SMTP port (usually 587)
   - `SMTP_USER` - Your email address
   - `SMTP_PASS` - Your email app password or SMTP password
   - `EMAIL_FROM` - The "from" email address for system emails
   - `FRONTEND_URL` - Your frontend application URL

### Method 2: Manual Setup

1. **Create PostgreSQL Database:**
   - In Render dashboard: New → PostgreSQL
   - Choose a name (e.g., `samanin-backend-db`)
   - Select the Free plan
   - Note the connection details

2. **Create Web Service:**
   - In Render dashboard: New → Web Service
   - Connect your Git repository
   - Configure:
     - Name: `samanin-backend-api`
     - Environment: Docker
     - Build Command: `npm ci && npm run build`
     - Start Command: `npm run start:prod`
     - Health Check Path: `/api/health`

3. **Set Environment Variables:**
   Go to your web service settings and add all the environment variables listed above.

## Post-Deployment

### 1. Database Setup
Your application includes automatic database seeding. The first time it starts, it will:
- Run migrations to create all necessary tables
- Seed initial data (roles, permissions, etc.)

### 2. Access Your API
- Your API will be available at: `https://your-app-name.onrender.com`
- API documentation: `https://your-app-name.onrender.com/api/docs`
- Health check: `https://your-app-name.onrender.com/api/health`

### 3. Frontend Configuration
Update your frontend application to use the new backend URL:
- Production API URL: `https://your-app-name.onrender.com`
- Make sure to update CORS settings if needed

## Important Notes

### Free Tier Limitations
- **Database:** 1GB storage, expires after 90 days
- **Web Service:** Spins down after 15 minutes of inactivity
- **Cold Start:** First request after inactivity may take 10-30 seconds

### Production Considerations
- **Database Backups:** Consider upgrading to a paid plan for automatic backups
- **Environment Variables:** Never commit production secrets to your repository
- **Logging:** Monitor your application logs in the Render dashboard
- **Custom Domain:** You can add a custom domain in the service settings

### Security
- All environment variables are encrypted at rest
- Your JWT secret is auto-generated and secure
- Database connections use SSL by default
- Consider enabling additional security headers if needed

## Troubleshooting

### Common Issues

1. **Build Failures:**
   - Check that all dependencies are in `package.json`
   - Ensure TypeScript compiles without errors locally

2. **Database Connection Issues:**
   - Verify environment variables are set correctly
   - Check database service is running

3. **Email Issues:**
   - Verify SMTP credentials
   - For Gmail, use App Passwords, not your regular password
   - Check firewall settings

4. **CORS Issues:**
   - Add your frontend domain to `FRONTEND_URL` environment variable
   - Verify CORS configuration in `main.ts`

### Logs and Monitoring
- View real-time logs in the Render dashboard
- Use the health check endpoint to monitor uptime
- Check the Events tab for deployment history

## Updating Your Deployment

1. Push changes to your Git repository
2. Render will automatically rebuild and deploy
3. Monitor the deployment in the dashboard
4. Test the health endpoint to verify the deployment

## Support

- Render Documentation: [docs.render.com](https://docs.render.com)
- Render Community: [community.render.com](https://community.render.com)

## Next Steps

After successful deployment:
1. Deploy your frontend application
2. Configure your custom domain
3. Set up monitoring and alerts
4. Consider upgrading to paid plans for production use
