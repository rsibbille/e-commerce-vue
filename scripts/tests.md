# Tests utiles

Depuis la racine :

```bash
./scripts/run-tests.sh
```

Par service :

```bash
cd frontend && npm ci && npm test
cd services/auth-service && npm ci && npm test
cd services/product-service && npm ci && npm test
cd services/order-service && npm ci && npm test
```

Les tests backend utilisent `mongodb-memory-server` par défaut. Les instances
MongoDB Compose ne publient volontairement aucun port sur l'hôte.

Healthchecks en dev :

```bash
curl http://localhost:8080/health
curl http://localhost:3001/api/health
curl http://localhost:3000/api/health
curl http://localhost:3002/api/health
```
