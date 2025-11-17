# Database URLs Reference

## 🟢 Development Database

**Public URL:**
```
postgresql://postgres:kWGqYPjEgJLKSmDroFFSsnVjKsUFcnmv@shuttle.proxy.rlwy.net:25662/railway
```

**Details:**
- Host: `shuttle.proxy.rlwy.net`
- Port: `25662`
- Database: `railway`
- Access: Public (accessible from local machine)

**Reset Command:**
```bash
DATABASE_URL='postgresql://postgres:kWGqYPjEgJLKSmDroFFSsnVjKsUFcnmv@shuttle.proxy.rlwy.net:25662/railway' node scripts/reset-railway-database.js
```

---

## 🔴 Production Database

**Public URL:**
```
postgresql://postgres:rcoiKvDAztXzqINtiUYlxZaPDpqrtRLg@maglev.proxy.rlwy.net:46280/railway
```

**Details:**
- Host: `maglev.proxy.rlwy.net`
- Port: `46280`
- Database: `railway`
- Access: Railway network only (not accessible from local)

**Reset Command (on Railway):**
```bash
# Via Railway Dashboard:
# Settings → Deploy → Add command: yarn db:reset-railway

# Via Railway CLI:
railway run --service <production-service-name> yarn db:reset-railway
```

---

## ⚠️ Important Notes

1. **Never use the same database for production and development**
2. **Production database should have separate backups**
3. **Development database can be reset frequently**
4. **Production database is only accessible from Railway network**

---

## 🔑 Default Login Credentials (after reset)

- **Super Admin:** `admin@rentalshop.com` / `admin123`
- **Merchant 1:** `merchant1@example.com` / `merchant123`
- **Merchant 2:** `merchant2@example.com` / `merchant123`

