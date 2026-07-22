# Audit initial

L'audit initial a releve des Dockerfiles et fichiers Compose vides, l'absence de
pipeline GitLab, de SonarQube et de Trivy, ainsi qu'un depot sans commit initial.

La dockerisation conserve les ports applicatifs fournis : frontend 8080,
product-service 3000, auth-service 3001 et order-service 3002. Les variables
`AUTH_MONGODB_URI`, `PRODUCT_MONGODB_URI` et `ORDER_MONGODB_URI` de
`.env.example` sont mappees vers `MONGODB_URI` dans Compose.
Chaque URI cible une instance MongoDB dédiée au microservice. Les trois instances
utilisent des volumes persistants et des réseaux internes distincts.

Le middleware vide du product-service et le modele de confiance du panier ont
ete conserves afin de ne pas modifier la logique applicative sans besoin direct
pour la conteneurisation. Ils restent des points de securite a traiter dans une
feature applicative separee.
