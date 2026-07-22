# Runbook Debian 12 / Scaleway

Installer Docker Engine depuis le depot officiel Docker, initialiser le Swarm et
enregistrer un runner GitLab avec le tag `swarm-manager`. Le firewall ne doit
publier que SSH et les ports frontend necessaires.

Commandes de diagnostic :

```bash
docker node ls
docker stack services ecommerce-production
docker service ps --no-trunc ecommerce-production_frontend
docker service logs --tail 100 ecommerce-production_frontend
curl --fail http://127.0.0.1:8080/health
curl --fail http://127.0.0.1:8080/api/products
```

Les trois volumes MongoDB sont locaux au manager. Sauvegarder régulièrement
`mongo-auth`, `mongo-product` et `mongo-order` avec `mongodump`. Pour une
production multi-node réelle, employer un stockage partagé ou des services
MongoDB managés.
