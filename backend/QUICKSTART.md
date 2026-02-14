# ⚡ MOVZZ Backend - Quick Start (No Docker)

**5-minute setup guide** for getting the backend running locally.

---

## 🚀 Super Quick Setup

### **Prerequisites**
- Node.js 18+ installed
- PostgreSQL 14+ installed

### **Option 1: Automated Setup (Recommended)**

**macOS/Linux:**
```bash
cd backend
chmod +x setup.sh
./setup.sh
```

**Windows:**
```cmd
cd backend
setup.bat
```

The script will:
- ✅ Check prerequisites
- ✅ Install dependencies
- ✅ Generate JWT secrets
- ✅ Create .env file
- ✅ Guide you through database setup
- ✅ Run migrations

---

### **Option 2: Manual Setup (5 commands)**

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env and update DATABASE_URL

# 3. Create database (in PostgreSQL)
psql postgres
# Then run:
# CREATE DATABASE movzz_dev;
# CREATE USER movzz WITH PASSWORD 'your_password';
# GRANT ALL PRIVILEGES ON DATABASE movzz_dev TO movzz;
# \c movzz_dev
# GRANT ALL ON SCHEMA public TO movzz;
# \q

# 4. Run migrations
npm run prisma:migrate dev --name initial_schema

# 5. Start server
npm run dev
```

---

## ✅ Verify It's Working

```bash
# Test health endpoint
curl http://localhost:5000/health

# Should return:
# {"success":true,"status":"healthy",...}
```

---

## 🎯 Essential Commands

```bash
# Start development server
npm run dev

# View database (GUI)
npm run prisma:studio

# Check logs
tail -f logs/combined.log

# Reset database (⚠️ deletes data)
npx prisma migrate reset
```

---

## 🔧 Common Issues

### "Cannot connect to database"
```bash
# Check PostgreSQL is running
pg_isready

# If not, start it:
brew services start postgresql@14  # macOS
sudo systemctl start postgresql    # Linux
```

### "Port 5000 already in use"
```bash
# Change port in .env
PORT=5001
```

### "Prisma Client not generated"
```bash
npm run prisma:generate
```

---

## 📚 Full Documentation

- **Detailed Setup:** `MANUAL_SETUP.md`
- **API Documentation:** `README.md`
- **Complete Summary:** `../BACKEND_COMPLETE.md`

---

## 🆘 Need Help?

1. Check `MANUAL_SETUP.md` for detailed troubleshooting
2. View logs: `tail -f logs/error.log`
3. Check database: `npm run prisma:studio`

---

**That's it! You're ready to build MOVZZ! 🚀**
