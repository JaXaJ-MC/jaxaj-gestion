# Gestion JaXaJ MC

Interface web de l'outil de gestion du club, pensée d'abord pour le smartphone (accueil des événements) et utilisable sur ordinateur. Elle rassemblera peu à peu les écrans de toutes les applications du club ; pour l'instant, les membres :

- connexion avec un compte de l'appli comptes (`jaxaj-comptes`) ;
- liste complète des personnes avec l'état de la cotisation du mois ; la saisie filtre la liste sur place et surligne ce qu'elle trouve (sans accents ni majuscules) ; raccourcis « adhésion en cours » et « à payer » ;
- bouton « Payé ce mois-ci » : choix du moyen de paiement, cotisation du mois créée au tarif et paiement enregistré ;
- fiche : coordonnées (selon les droits), adhésions, cotisations, accès du jour ;
- création et modification d'une fiche, nouvelle adhésion ;
- « Transformer en compte » : crée le compte de la personne, avec ses droits et l'adresse d'envoi de l'invitation.

React, TypeScript, Vite. Charte du club : enveloppe noire du Club, cartes blanches, Joker (vert, violet) en accents, étiquettes aux couleurs de chaque association, lauburu pour Euskadi.

## Architecture

L'interface et les API sont servies sous la même origine :

| Chemin | Servi par |
|---|---|
| `/` | cette interface (fichiers statiques de `dist/`) |
| `/comptes/…` | l'appli comptes |
| `/membres/…` | l'API membres |

Le JWT reste en mémoire ; le jeton de renouvellement est un cookie `HttpOnly` posé par l'appli comptes, que le JavaScript ne peut pas lire. Recharger la page reprend la session grâce à ce cookie.

## Développement

Node 24 (`nvm use 24`). Les deux API tournent en local, par exemple avec le serveur intégré de PHP :

```sh
# appli comptes, avec COOKIE_CHEMIN=/comptes/api/connexion et URL_PUBLIQUE=http://localhost:5173/comptes
php -S 127.0.0.1:8000 -t ../jaxaj-comptes/public
# API membres, avec JWT_PUBLIC_KEY = clé publique de l'appli comptes
php -S 127.0.0.1:8001 -t ../jaxaj-membres/api/public

npm install
npm run dev     # http://localhost:5173, relaie /comptes et /membres vers les API
```

`COMPTES_URL` et `MEMBRES_URL` changent l'adresse des API relayées.

## Production

`npm run build` produit `dist/`, à servir par nginx avec repli sur `index.html` pour les routes de l'interface ; nginx relaie `/comptes/` et `/membres/` vers les deux applications.
