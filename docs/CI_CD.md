# CI/CD GitLab

La pipeline suit les etapes `lint`, `test`, `quality`, `build`, `scan` et
`deploy`. Les images sont taguees avec le SHA complet du commit, puis `latest`
est ajoute uniquement sur `main`.

Variables GitLab protegees ou masquees a configurer :

- `SONAR_HOST_URL` et `SONAR_TOKEN` ;
- `DEPLOY_HOST` ;
- `DEV_FRONTEND_PORT`, `DEV_CORS_ORIGIN`, `DEV_JWT_SECRET` ;
- `STAGING_FRONTEND_PORT`, `STAGING_CORS_ORIGIN` ;
- `PRODUCTION_FRONTEND_PORT`, `CORS_ORIGIN`.

Le runner de deploiement doit porter le tag `swarm-manager`, avoir acces au
socket Docker du manager Swarm et posseder les secrets externes indiques dans
`ENVIRONMENTS.md`.
