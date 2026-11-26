# Mon Chef IA — prototype local

Application web progressive (PWA) de cuisine avec un modèle de langage exécuté dans le navigateur grâce à WebLLM.

## Confidentialité et fonctionnement

- Aucun backend applicatif, aucune clé API et aucun compte.
- Les messages, ingrédients, favoris et préférences sont conservés dans `localStorage` sur l'appareil.
- L'inférence du modèle se fait dans le navigateur avec WebGPU.
- Le premier lancement nécessite Internet pour charger l'application et télécharger le modèle depuis les dépôts MLC/Hugging Face.
- Une fois les fichiers mis en cache, le modèle peut être utilisé hors connexion, sous réserve que Safari conserve les données du site.
- L'hébergement statique sert les fichiers de l'application ; il ne reçoit pas les conversations.
- Cette version n'intègre aucune télémétrie ni fonction de recherche web.

Important : le navigateur contacte encore l'hébergeur statique et la source du modèle lors du premier téléchargement et lors des mises à jour de l'application. Pour un fonctionnement totalement hors réseau, il faut d'abord ouvrir l'application, télécharger et charger le modèle, puis vérifier le mode avion.

## Modèles

- `Qwen3-0.6B-q4f16_1-MLC` : choix de démarrage plus prudent.
- `Qwen3-1.7B-q4f16_1-MLC` : plus lourd, proposé comme essai expérimental.

Les besoins mémoire affichés par le catalogue WebLLM sont des estimations GPU, pas la taille exacte du téléchargement. L'iPhone 15 peut manquer de mémoire disponible ou Safari peut fermer l'onglet. Commencer par le modèle 0.6B.

## Développement local

Nécessite Node.js récent :

```bash
npm install
npm run dev
```

Pour produire le site :

```bash
npm run build
npm run preview
```

Le contenu du dossier `dist/` doit être publié sur un hébergement HTTPS statique (par exemple GitHub Pages). Aucun serveur d'inférence n'est nécessaire.

## Installation sur iPhone

1. Ouvrir l'URL HTTPS publiée dans Safari.
2. Appuyer sur Partager → Sur l'écran d'accueil → Ajouter.
3. Ouvrir l'icône « Mon Chef IA » depuis l'écran d'accueil.
4. Télécharger le modèle en Wi-Fi, en commençant par Qwen3 0.6B.
5. Attendre la fin du chargement et tester une conversation.
6. Activer le mode avion et tester à nouveau.

## Limites à connaître

- WebGPU sur Safari iOS peut être partiellement pris en charge et dépend du matériel/logiciel ; un test sur l'appareil reste indispensable.
- Le modèle local est beaucoup moins puissant qu'un grand modèle cloud. Il peut se tromper sur les calculs, les temps de cuisson et la nutrition : vérifier les quantités et la sécurité alimentaire.
- iOS peut purger les caches et données d'un site, notamment sous pression de stockage. Le modèle pourrait alors devoir être téléchargé à nouveau.
- Cette version est un prototype fonctionnel à tester sur l'iPhone, pas une application certifiée ni une garantie de fonctionnement permanent hors ligne.
