# Move from Render to Free Hosting (Koyeb + Neon)

This setup gives you always-available managed hosting without manually starting the server.

## 1) Create a free Postgres (Neon)

1. Create a Neon project (free tier).
2. Create database: `pokerledger_db`.
3. Copy the pooled connection string (must include SSL), e.g.:
   - `postgresql://USER:PASSWORD@HOST/pokerledger_db?sslmode=require`

### Optional: move existing Render data into Neon

Use the included helper script from project root:

- `RENDER_DB_URL="postgres://..." NEON_DB_URL="postgres://...?..." ./migrate-db-to-neon.sh`

This does `pg_dump` from Render, restores to Neon, then runs Prisma deploy migrations.

## 2) Create backend service on Koyeb (free web service)

1. In Koyeb, create a new **Web Service** from your GitHub repo.
2. Service root: `backend`.
3. Build method: **Dockerfile**.
4. Dockerfile path: `backend/Dockerfile`.
5. Exposed port: `3001`.
6. Add environment variables:
   - `NODE_ENV=production`
   - `PORT=3001`
   - `DATABASE_URL=<your Neon URL>`
   - `JWT_SECRET=<long random secret>`
   - `JWT_EXPIRES_IN=7d`
   - `CORS_ORIGINS=https://<your-frontend-domain>`
   - Optional messaging vars (`WHATSAPP_*`, `TWILIO_*`)

The container runs `backend/start.sh`, which automatically executes:
- `npx prisma migrate deploy`
- `npm start`

So no manual server start is needed.

## 3) Point frontend to the new backend

Set frontend env at build time:

- `VITE_API_URL=https://<your-koyeb-service-domain>/api`

Rebuild app/web after changing this.

## 4) Verify deployment

- Health: `https://<your-koyeb-service-domain>/health`
- Login: `POST https://<your-koyeb-service-domain>/api/auth/login`
- Check migrations: confirm tables `automations`, `messaging_consents` exist.

## 5) Optional: seed staging data once

Run from local backend directory with the same `DATABASE_URL`:

- `npm run db:seed`

---

## Notes

- Koyeb free instances may sleep when idle depending on current policy, but are auto-restarted on traffic.
- Neon free tier has storage/compute limits; monitor usage for production traffic.
