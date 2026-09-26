---
title: "ShortPathFinder : un visualiseur interactif de pathfinding"
description: "Visualisez A*, Dijkstra et BFS sur une grille 2D avec un frontend React et un moteur de recherche C++ compile en WebAssembly."
date: 2026-09-26
updated: 2026-09-26
tags: ["React", "TypeScript", "Frontend", "Web"]
readTime: 4 min
slug: shortpathfinder
---
# ShortPathFinder : un visualiseur interactif de pathfinding

ShortPathFinder est une application web qui visualise la recherche de chemin sur une grille 2D. Vous dessinez des murs, placez les points de depart et d'arrivee, puis vous regardez les algorithmes explorer la grille et tracer le plus court chemin. J'ai construit l'interface en React et TypeScript, et le moteur de recherche en C++17, compile en WebAssembly.

Demo : https://ayyoubelkouri.github.io/ShortPathFinder/
Code : https://github.com/AyyoubElKouri/ShortPathFinder

## Ce que fait l'application

ShortPathFinder repond a une question simple : comment les algorithmes de pathfinding se comportent-ils sur une meme carte ?

Vous pouvez :

* Peindre des murs au clic et au glisser, deplacer le depart et l'arrivee, et annuler avec Ctrl+Z.
* Generer un labyrinthe par retour sur trace recursif. Le generateur preserve le depart et l'arrivee, garantit l'existence d'un passage avec un BFS, puis ouvre des boucles pour creer plusieurs itineraires.
* Lancer A*, Dijkstra ou BFS et voir les cellules visitees s'etendre dans l'ordre, suivies de l'animation du chemin final.
* Comparer deux algorithmes cote a cote en mode double grille. Les deux grilles partagent le meme labyrinthe, s'executent en meme temps et affichent le cout et le nombre de visites.
* Ecouter la recherche grace a la sonification Tone.js. Les cellules visitees, les cellules du chemin et l'accord final produisent chacun un son distinct.

L'objectif etait la clarte. Chaque execution montre ou l'algorithme a cherche, quel chemin il a choisi et quel travail cela a demande.

## Comment cela fonctionne

Le frontend gere l'interaction et l'animation. Le coeur C++ gere la recherche.

React conserve trois etats dans des stores Zustand : la grille et son historique, la configuration d'algorithme pour chaque grille, et le mode d'affichage. Quand vous lancez Run, un hook `useRun` aplatit la grille en `Uint8Array`, ou 0 signifie libre et 1 signifie mur, calcule les index de depart et d'arrivee en ordre ligne par ligne, puis appelle le module WebAssembly.

La bibliotheque C++ expose un seul point d'entree : `PathfindingEngine::findPath`. Elle recoit la grille aplatie, la largeur, la hauteur, les index de depart et d'arrivee, le type d'algorithme, le type d'heuristique, et des options pour les diagonales, le blocage des coins et la recherche bidirectionnelle. Une classe `GridGraph` stocke les noeuds dans un vecteur contigu et calcule les voisins en respectant les limites et les murs. Une `AlgorithmFactory` choisit Dijkstra, A* ou BFS. Une `HeuristicFactory` choisit Manhattan, Euclidean, Octile ou Chebyshev pour la recherche informee.

Le resultat contient cinq champs : `path`, `visited`, `cost`, `success` et `time_us`. React convertit chaque ID en coordonnees avec `id = y * width + x`, anime les cellules visitees par groupes de cinq, marque une pause, puis anime le chemin. La hauteur du son augmente avec la progression, donc vous entendez la recherche converger.

Cette separation garde chaque couche rapide et testable. JavaScript ne cherche jamais. C++ ne touche jamais au DOM.

## Algorithmes et options

L'interface actuelle propose trois algorithmes :

* **BFS** explore par couches et trouve le plus court chemin sur les grilles non ponderees.
* **Dijkstra** suit les distances dans une file de priorite et trouve le plus court chemin sur les graphes ponderes.
* **A\*** ajoute une heuristique a Dijkstra pour guider la recherche vers l'arrivee et converger plus vite.

Le coeur C++ implemente aussi DFS, IDA*, Jump Point Search, Orthogonal JPS et Trace, prets pour de futurs ajouts a l'interface.

Pour A*, vous choisissez une heuristique selon le mouvement : Manhattan pour 4 directions, Octile ou Chebyshev pour 8 directions, et Euclidean pour un mouvement libre. Vous pouvez aussi autoriser les diagonales, interdire la traversee des coins a travers les murs, et activer la recherche bidirectionnelle depuis les deux extremites.

## Details techniques

**Performance :** la recherche tourne en C++ compile dans WebAssembly, pas en JavaScript. La grille traverse la frontiere une seule fois comme tableau type, et le resultat revient comme tableaux simples. L'animation utilise des mises a jour par lots pour garder une interface fluide.

**Etat :** annuler et retablir stockent des deltas de cellules, pas des copies completes. Generation de labyrinthe, dessin de murs et effacement passent par le meme gestionnaire d'historique.

**Grille responsive :** un hook `useGrid` dimensionne la grille selon la fenetre, donc les cellules restent carrees sur desktop et mobile.

**Audio :** un hook `useSound` cree les synthetiseurs Tone.js apres une action de l'utilisateur, ce qui respecte les regles autoplay des navigateurs.

**Outillage :** Vite 7 compile l'app, Tailwind CSS 4 gere le style, Framer Motion anime les panneaux, Lucide fournit les icones, Jest et Testing Library couvrent la logique, et Biome formate et verifie le code.

## Ce que j'ai appris

Ce projet m'a appris a tracer une frontiere nette entre calcul et presentation. Emscripten embind a rendu cette frontiere explicite : tableaux types en entree, objet resultat en sortie. Les factories ont rendu les algorithmes et les heuristiques interchangeables sans logique conditionnelle dans le moteur. Des choix simples, comme l'historique par deltas et l'animation par lots, ont rendu l'app rapide meme sur de grandes grilles.

Pour explorer le comportement des algorithmes, commencez par le mode double grille. Lancez BFS contre A* sur le meme labyrinthe avec les diagonales activees. Vous verrez BFS inonder la carte pendant que A* vise l'arrivee, et les statistiques montreront le compromis en noeuds visites, cout du chemin et temps.
