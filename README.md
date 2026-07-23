# E-Commerce Microservices

Application e-commerce pédagogique composée d'un frontend Vue/Vite et de trois backends Node.js/Express/Mongoose, déployée avec Docker Compose en local et Docker Swarm en dev, staging et production.

## Sommaire

- [Architecture](#architecture)
- [Base de donnees MongoDB](#base-de-donnees-mongodb)
- [Ports](#ports)
- [Variables](#variables)
- [Demarrage local](#demarrage-local)
- [Tests](#tests)
- [Build Docker](#build-docker)
- [Dev, staging et production Swarm](#dev-staging-et-production-swarm)
- [CI/CD GitLab](#cicd-gitlab)
- [Scripts](#scripts)
- [Depannage](#depannage)
- [Documentation complementaire](#documentation-complementaire)

## Architecture

Services applicatifs :

| Service | Role | Port interne |
| --- | --- | ---: |
| `frontend` | Interface Vue/Vite et proxy API Node (`frontend/server.cjs`) | `8080` |
| `auth-service` | Authentification JWT | `3001` |
| `product-service` | Produits et panier | `3000` |
| `order-service` | Commandes | `3002` |
| `mongo-auth` | Base MongoDB dédiée à l'authentification | `27017` |
| `mongo-product` | Base MongoDB dédiée aux produits et paniers | `27017` |
| `mongo-order` | Base MongoDB dédiée aux commandes | `27017` |

Routes API exposees par le frontend :

| Route publique | Service cible |
| --- | --- |
| `/api/auth` | `auth-service:3001` |
| `/api/products` | `product-service:3000` |
| `/api/cart` | `product-service:3000` |
| `/api/orders` | `order-service:3002` |

En Swarm, seul le frontend publie un port public. Les backends et MongoDB restent internes au reseau Docker/Swarm.

## Base de donnees MongoDB

MongoDB tourne uniquement dans Docker. Il n'est pas necessaire, ni recommande pour ce projet, d'installer MongoDB directement sur l'hote.

Image utilisee :

```text
mongo:4.4.18
```

Ce choix est volontaire. MongoDB 5/6 peut echouer sur certaines machines sans support CPU AVX. L'image `mongo:4.4.18` evite ce probleme et fonctionne mieux sur les environnements de type Debian 12, VM et machines de cours.

### Instances dédiées

Chaque backend utilise sa propre instance MongoDB, son propre volume persistant et
son propre réseau de données interne :

| Service | Instance | URI | Réseau |
| --- | --- | --- | --- |
| `auth-service` | `mongo-auth` | `mongodb://mongo-auth:27017/auth` | `data-auth` |
| `product-service` | `mongo-product` | `mongodb://mongo-product:27017/products` | `data-product` |
| `order-service` | `mongo-order` | `mongodb://mongo-order:27017/orders` | `data-order` |

Les stacks Swarm dev et staging utilisent des bases suffixees (`auth_dev`,
`products_dev`, `orders_dev`, puis `auth_staging`, `products_staging`,
`orders_staging`). Les trois instances MongoDB restent séparées dans chaque
environnement.

Les hostnames viennent des noms de services Docker Compose/Swarm. Les backends ne
doivent pas utiliser `localhost` pour se connecter à MongoDB dans Docker.

### Persistance

Les instances MongoDB stockent leurs données dans trois volumes Docker :

```text
mongo_auth_data:/data/db
mongo_product_data:/data/db
mongo_order_data:/data/db
```

En local, ces volumes sont créés par `docker-compose.yml`.

En Swarm, chaque volume est local au nœud qui héberge la tâche MongoDB
correspondante. Chaque service MongoDB est configuré avec :

```yaml
deploy:
  replicas: 1
```

Point important : ce ne sont pas des clusters MongoDB répliqués. Si une tâche est
redéployée sur un autre nœud Swarm, elle peut retrouver un volume local différent.
Pour une production réelle, utiliser un stockage partagé, une contrainte de
placement ou des services MongoDB managés.

### Healthcheck

Le healthcheck MongoDB accepte `mongosh` ou l'ancien shell `mongo` :

```bash
mongosh --quiet --eval 'db.adminCommand("ping").ok' || mongo --quiet --eval 'db.adminCommand("ping").ok'
```

Cela permet de garder la compatibilite entre les images MongoDB et les shells disponibles.

### Reinitialiser la base en local

Attention : cette commande supprime les donnees locales MongoDB.

```bash
docker-compose down -v
docker-compose up --build
```

### Nettoyer la stack Swarm

Sur le manager Swarm :

```bash
docker stack rm e-commerce
docker stack rm e-commerce-staging
docker stack rm e-commerce-dev
docker service ls
docker volume ls
```

Supprimer un volume MongoDB Swarm efface les donnees. A faire uniquement si l'objectif est de repartir de zero.

### Sauvegarde simple

Exemple de sauvegarde depuis un conteneur MongoDB local ou Swarm :

```bash
docker exec <mongodb-container-id> mongodump --archive=/tmp/mongodb.archive
docker cp <mongodb-container-id>:/tmp/mongodb.archive ./mongodb.archive
```

Exemple de restauration :

```bash
docker cp ./mongodb.archive <mongodb-container-id>:/tmp/mongodb.archive
docker exec <mongodb-container-id> mongorestore --archive=/tmp/mongodb.archive --drop
```

## Ports

| Service | Dev local | Dev Swarm | Staging/Production |
| --- | ---: | --- | --- |
| frontend | `8080` | `8082` | public : `8081` en staging, `8080` en production |
| product-service | `3000` | interne | interne |
| auth-service | `3001` | interne | interne |
| order-service | `3002` | interne | interne |
| mongo-auth | interne | interne | interne |
| mongo-product | interne | interne | interne |
| mongo-order | interne | interne | interne |

## Variables

Copier `.env.example` vers `.env` seulement pour des surcharges locales. Ne jamais commiter de `.env`.

Variables principales :

| Variable | Usage |
| --- | --- |
| `JWT_SECRET` | Secret JWT. Obligatoire hors dev. |
| `MONGODB_URI` | URI MongoDB de chaque backend. |
| `AUTH_SERVICE_URL` | Cible auth utilisee par le frontend serveur. |
| `PRODUCT_SERVICE_URL` | Cible produits/panier utilisee par le frontend serveur et `order-service`. |
| `ORDER_SERVICE_URL` | Cible commandes utilisee par le frontend serveur. |
| `APP_ENV` | `development`, `staging`, `production` ou `test`. |
| `CORS_ORIGIN` | Origine frontend autorisee par les backends. |
| `CI_REGISTRY_IMAGE` | Namespace des images GitLab Container Registry. |
| `IMAGE_TAG` | Tag d'image deploye, en general `CI_COMMIT_SHA`. |
| `DEPLOY_HOST` | IP/hostname public du manager Swarm pour les probes HTTP. Si absent, la CI utilise l'adresse du node Docker courant. |
| `DEV_FRONTEND_PORT` | Port public de la stack dev, defaut `8082`. |
| `DEV_CORS_ORIGIN` | Origine frontend autorisee en dev Swarm. Defaut calcule depuis `DEPLOY_HOST` et `DEV_FRONTEND_PORT` dans la CI. |
| `DEV_JWT_SECRET` | Secret JWT dev Swarm. Optionnel, fallback non sensible pour l'environnement dev. |
| `STAGING_JWT_SECRET` | Secret JWT staging. Optionnel si `JWT_SECRET` est deja defini. |
| `STAGING_FRONTEND_PORT` | Port public staging, defaut `8081`. |
| `STAGING_CORS_ORIGIN` | Origine frontend autorisee en staging. Defaut calcule depuis `DEPLOY_HOST` et `STAGING_FRONTEND_PORT` dans la CI. |

En dev Docker Compose, des valeurs non sensibles sont fournies. En staging/production, `JWT_SECRET` doit venir de GitLab CI/CD ou de l'environnement de deploiement.

## Demarrage local

Prerequis :

- Docker
- Docker Compose

Lancer toute l'application :

```bash
docker-compose up --build
```

Application :

```text
http://localhost:8080
```

Initialiser les produits de demo :

```bash
./scripts/init-products.sh
```

Si seul le frontend est expose, par exemple via Swarm, passer par le proxy du frontend :

```bash
PRODUCT_API_URL=http://localhost:8080/api ./scripts/init-products.sh
```

Healthchecks :

```bash
curl http://localhost:8080/health
curl http://localhost:3001/api/health
curl http://localhost:3000/api/health
curl http://localhost:3002/api/health
```

Arreter sans supprimer les donnees MongoDB :

```bash
docker-compose down
```

Arreter et supprimer les donnees MongoDB locales :

```bash
docker-compose down -v
```

## Tests

Chaque service possede son propre `package.json`.

```bash
cd frontend && npm ci && npm test
cd services/auth-service && npm ci && npm test
cd services/product-service && npm ci && npm test
cd services/order-service && npm ci && npm test
```

Depuis la racine :

```bash
./scripts/run-tests.sh
```

Les tests backend utilisent `mongodb-memory-server` par defaut. En CI, ils peuvent utiliser un MongoDB Docker externe avec :

```text
USE_EXTERNAL_MONGODB=true
MONGODB_URI=mongodb://mongo:27017/<db>
```

## Build Docker

Images applicatives :

```bash
docker build --target production -t ecommerce/frontend:local frontend
docker build --target production -t ecommerce/auth-service:local services/auth-service
docker build --target production -t ecommerce/product-service:local services/product-service
docker build --target production -t ecommerce/order-service:local services/order-service
```

Les Dockerfiles utilisent :

- `npm ci`
- un runtime `NODE_ENV=production`
- un utilisateur non-root
- un healthcheck HTTP
- des targets `development`, `staging` et `production`

## Dev, staging et production Swarm

Le deploiement Swarm utilise :

- `docker-compose.dev.yml` pour construire/tagger des images dev puis deployer une stack dev image-based ;
- `docker-compose.staging.yml` pour staging
- `docker-compose.prod.yml` pour production
- un reseau overlay `ecommerce_net`
- `--with-registry-auth` pour transmettre les credentials registry aux nodes

Important : `docker stack deploy` ne build pas les images. Les stacks dev/staging/prod utilisent donc les images deja construites et poussees dans le registry par la pipeline. Le compose dev contient aussi des blocs `build` pour un usage manuel avec `docker-compose -f docker-compose.dev.yml build`, mais le deploiement Swarm repose toujours sur les champs `image`.

### Dev Swarm manuel

```bash
export CI_REGISTRY_IMAGE=registry.gitlab.com/groupe/projet
export IMAGE_TAG=<commit-sha-ou-tag>
export DEV_FRONTEND_PORT=8082
export DEV_CORS_ORIGIN=http://192.168.1.100:8082

docker-compose -f docker-compose.dev.yml build
docker stack deploy -c docker-compose.dev.yml e-commerce-dev --with-registry-auth
docker stack services e-commerce-dev
```

### Staging manuel

```bash
export CI_REGISTRY_IMAGE=registry.gitlab.com/groupe/projet
export IMAGE_TAG=<commit-sha-ou-tag>
export JWT_SECRET=<secret-staging>
export STAGING_FRONTEND_PORT=8081
export STAGING_CORS_ORIGIN=http://192.168.1.100:8081

docker stack deploy -c docker-compose.staging.yml e-commerce-staging --with-registry-auth
docker stack services e-commerce-staging
```

### Production manuelle

```bash
export CI_REGISTRY_IMAGE=registry.gitlab.com/groupe/projet
export IMAGE_TAG=<commit-sha-ou-tag>
export JWT_SECRET=<secret-production>
export CORS_ORIGIN=http://192.168.1.100:8080

docker stack deploy -c docker-compose.prod.yml e-commerce --with-registry-auth
docker stack services e-commerce
```

Le frontend production est expose sur :

```text
http://<DEPLOY_HOST>:8080
```

### Environnements Swarm

| Environnement | Branche | Compose | Stack | Port public | Replicas applicatifs |
| --- | --- | --- | --- | ---: | ---: |
| Dev | `develop` | `docker-compose.dev.yml` | `ecommerce-dev` | `8082` | `1` |
| Staging / preprod | `release/*` | `docker-compose.staging.yml` | `ecommerce-staging` | `8081` | `2` |
| Production | `main` | `docker-compose.prod.yml` | `e-commerce` | `8080` | `2` |

### Rolling update

En staging et production, les services applicatifs ont `replicas: 2` et un rolling update avec `parallelism: 1`. Il est donc normal de voir temporairement `1/2 running replicas` pendant un deploiement.

Les healthchecks et le temps de demarrage MongoDB peuvent rallonger la convergence. La pipeline attend la convergence Swarm puis teste :

- `GET /health`
- `GET /api/products`

## CI/CD GitLab

La pipeline `.gitlab-ci.yml` utilise le runner GitLab tague :

```text
swarm-manager
```

Tous les jobs passent par ce runner via `default.tags`.

Les images CI passent par le Dependency Proxy GitLab pour limiter les timeouts et rate limits Docker Hub :

- `docker:24`
- `docker:24-dind`
- `node:24-bookworm-slim`
- `mongo:4.4.18`
- `aquasec/trivy:latest`

Workflow branches :

| Branche | Tests | Build/Push images | Trivy | Deploy |
| --- | :---: | :---: | :---: | --- |
| `feature/*`, `bugfix/*`, `hotfix/*` | oui | non | non | aucun |
| Merge Request | oui | non | non | aucun |
| `develop` | oui | oui (`$CI_COMMIT_SHA`) | oui | `deploy_development` manuel |
| `release/*` | oui | oui (`$CI_COMMIT_SHA`) | oui | `deploy_staging` manuel |
| `main` | oui | oui (`$CI_COMMIT_SHA` + `latest`) | oui | `deploy_production` manuel |

Les tests restent obligatoires sur toutes les branches GitFlow. La construction et
le scan des images sont effectues sur `develop`, `release/*`, `main` et les tags.
Les deploiements restent manuels.

### Jobs de deploy

Les jobs `deploy_dev`, `deploy_staging` et `deploy_production` :

1. se connectent au GitLab Container Registry ;
2. definissent `IMAGE_TAG=$CI_COMMIT_SHA` ;
3. pre-verifient les images applicatives avec `docker manifest inspect` et `docker pull` ;
4. lancent `docker stack deploy --with-registry-auth` ;
5. attendent les replicas `Running` ;
6. affichent les details `docker service ps --no-trunc` pendant l'attente ;
7. testent le frontend publie et `/api/products`.

Le dernier `docker stack services` est informatif et non bloquant, car le daemon Docker du runner peut parfois repondre avec un timeout alors que le deploiement est deja fonctionnel.

Variables GitLab a verifier :

- `JWT_SECRET`
- `DEV_FRONTEND_PORT`
- `DEV_CORS_ORIGIN`
- `DEV_JWT_SECRET`
- `STAGING_JWT_SECRET`
- `CORS_ORIGIN`
- `STAGING_CORS_ORIGIN`
- `STAGING_FRONTEND_PORT`
- `DEPLOY_HOST`

Les variables GitLab suivantes sont fournies automatiquement par GitLab :

- `CI_REGISTRY`
- `CI_REGISTRY_IMAGE`
- `CI_REGISTRY_USER`
- `CI_REGISTRY_PASSWORD`
- `CI_COMMIT_SHA`
- `CI_COMMIT_BRANCH`

## Scripts

| Script | Role |
| --- | --- |
| `scripts/setup.sh` | Verifie les outils, installe les dependances avec `npm ci`, valide `docker-compose.yml`. |
| `scripts/init-products.sh` | Insere les produits de demonstration via l'API product-service de maniere idempotente. |
| `scripts/run-tests.sh` | Execute les tests frontend et backend. |
| `scripts/deploy.sh` | Deploie la stack Swarm avec `docker stack deploy`. |

## Depannage

### MongoDB ne demarre pas

Verifier les logs :

```bash
docker-compose logs mongo-auth mongo-product mongo-order
```

En Swarm :

```bash
docker service ps --no-trunc e-commerce_mongo-auth
docker service logs --tail=100 e-commerce_mongo-auth
```

Si les logs indiquent une erreur AVX avec MongoDB 5/6, verifier que les compose utilisent bien `mongo:4.4.18`.

### Backend : `getaddrinfo ENOTFOUND mongo-*`

Cela signifie que le backend ne résout pas le hostname de son instance MongoDB.

Verifier :

- `auth-service` partage uniquement `data-auth` avec `mongo-auth` ;
- `product-service` partage uniquement `data-product` avec `mongo-product` ;
- `order-service` partage uniquement `data-order` avec `mongo-order` ;
- l'URI utilise le hostname dédié et l'instance correspondante est saine.

### Image introuvable pendant un deploy Swarm

Symptome :

```text
Rejected "No such image: registry.gitlab.com/..."
```

Verifier que le build de l'image correspondante a bien reussi et que le tag est le meme que `CI_COMMIT_SHA`. Les jobs deploy font un preflight avec `docker manifest inspect` et `docker pull` pour detecter ce probleme avant le rolling update.

### Le deploy reste temporairement a `1/2`

Avec `parallelism: 1`, c'est normal au debut d'un rolling update. Swarm remplace une replique a la fois. Attendre la fin de la convergence et lire les lignes `docker service ps --no-trunc` si cela dure.

### Nettoyer un environnement local

```bash
docker-compose down -v
docker system prune
```

Attention : `docker-compose down -v` supprime les donnees MongoDB locales.

### Nettoyer une stack Swarm

```bash
docker stack rm e-commerce
docker stack rm e-commerce-staging
docker stack rm e-commerce-dev
docker service ls
docker volume ls
```

Supprimer les volumes Swarm supprime les donnees MongoDB associees.

## Verification rapide

```bash
docker-compose config
docker-compose up --build
curl http://localhost:8080/health
curl http://localhost:3001/api/health
curl http://localhost:3000/api/health
curl http://localhost:3002/api/health
./scripts/init-products.sh
./scripts/run-tests.sh
docker-compose down
```

## Documentation complementaire

- [Architecture](docs/ARCHITECTURE.md)
- [Environnements dev/staging/prod](docs/ENVIRONMENTS.md)
- [CI/CD GitLab](docs/CI_CD.md)
- [Audit et corrections](docs/AUDIT.md)
- [Runbook d'exploitation](docs/RUNBOOK.md)
