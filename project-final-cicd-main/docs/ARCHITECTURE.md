# Architecture

Le frontend Vue est compile par Vite puis servi par un petit serveur Express qui
agit aussi comme reverse proxy. Seul ce frontend publie un port en staging et en
production. Les trois API communiquent sur le reseau interne `backend`.

MongoDB est place sur le reseau interne `data`. Chaque microservice utilise une
base logique distincte (`auth`, `products`, `orders`) dans la meme instance. Les
volumes Docker sont differents pour le local, le developpement, le staging et la
production.

Les images applicatives tournent avec l'utilisateur non-root `node`. Les images
de production ne contiennent ni les sources de test ni les dependances de
developpement.
