# Architecture

Le frontend Vue est compile par Vite puis servi par un petit serveur Express qui
agit aussi comme reverse proxy. Seul ce frontend publie un port en staging et en
production. Les trois API communiquent sur le reseau interne `backend`.

Chaque microservice possède une instance MongoDB dédiée : `mongo-auth`,
`mongo-product` et `mongo-order`. Chaque couple application/base partage un réseau
interne exclusif (`data-auth`, `data-product` ou `data-order`) et un volume
persistant distinct. Aucun port MongoDB n'est publié. Les volumes Docker sont
également différents entre local, développement, staging et production.

Les images applicatives tournent avec l'utilisateur non-root `node`. Les images
de production ne contiennent ni les sources de test ni les dependances de
developpement.
