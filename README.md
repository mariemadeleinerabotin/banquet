# Le Banquet

Une notion de philosophie ou de littérature par semaine, une carte par jour.

- `index.html` : l'application (une seule page, sans dépendance).
- `data/index.json` : les semaines, la liste des cartes et les notions à venir.
- `data/fiches.json` : les fiches (penseurs, concepts, œuvres).
- `data/cartes/AAAA-MM-JJ.json` : la carte de chaque jour.

Les cartes sont publiées chaque matin par une tâche planifiée. La progression de chaque lecteur reste dans son navigateur.

## Modifier l'application

Le code vit dans `src/` (style, cœur commun, un adaptateur pour le site et un pour l'artefact Claude). Après modification : `python3 src/build.py` régénère `index.html`. Ne pas éditer `index.html` à la main.
