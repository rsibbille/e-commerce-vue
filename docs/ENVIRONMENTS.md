# Environnements

## Local

```bash
docker compose up --build
```

Le frontend et les trois API sont publies pour faciliter le diagnostic local.

## Swarm

- `develop` utilise `docker-compose.dev.yml` et le port 8082 ;
- `release/*` utilise `docker-compose.staging.yml` et le port 8081 ;
- `main` utilise `docker-compose.prod.yml` et le port 8080.

Les fichiers staging et production attendent respectivement les secrets externes
`ecommerce_staging_jwt_secret` et `ecommerce_production_jwt_secret`.

```bash
printf '%s' 'secret-long-et-aleatoire' | docker secret create ecommerce_staging_jwt_secret -
printf '%s' 'autre-secret-long-et-aleatoire' | docker secret create ecommerce_production_jwt_secret -
```

Ne jamais commiter les valeurs de ces secrets.
