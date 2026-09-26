---
title: "L'essor des agents de code"
description: "Un tour d'horizon des agents de code : fonctionnement, composants clés, limites actuelles et tendances à venir."
date: 2026-09-26
updated: 2026-09-26
tags: ["Other", "JavaScript", "Testing", "DevOps"]
readTime: 11 min
slug: lessor-des-agents-de-code
---
# L'essor des agents de code

Les agents de code — des systèmes autonomes ou semi-autonomes capables de lire, écrire et raisonner sur du code — sont passés du statut de curiosité de recherche à celui d'outil d'ingénierie quotidien en seulement quelques années. Cet article explique comment ils fonctionnent, ce qu'ils savent bien faire et où ils échouent encore.

> "Les meilleurs agents ne sont pas ceux qui écrivent le plus de code — ce sont ceux qui savent quand *ne pas* en écrire."
> — un refrain courant chez les ingénieurs outillage

## 1. Qu'est-ce qu'un agent de code ?

Un agent de code combine un modèle de langage avec un **accès à des outils** — shell, système de fichiers, compilateur, navigateur — afin d'agir au lieu de seulement produire du texte. La boucle de base est simple : *observer*, *réfléchir*, *agir*, *répéter*. En pratique, ce qui rend un agent utile n'est pas la boucle elle-même, mais la qualité de ses outils[^1] et des garde-fous qui l'entourent.

Quelques caractéristiques clés :

- Il peut lire et modifier des fichiers, pas seulement décrire des changements
- Il peut exécuter du code et observer les résultats
- Il peut ~~deviner~~ vérifier, en lançant des tests plutôt qu'en supposant que tout marche
- Il conserve une forme d'état sur des tâches en plusieurs étapes

### 1.1 Un bref historique

Les premiers "assistants de code" comme l'autocomplétion étaient purement suggestifs — une personne devait accepter, refuser ou modifier chaque suggestion. Les agents se distinguent par le degré d'autonomie : ils réalisent des actions sur un horizon plus long, parfois pendant `10+` minutes sans supervision.

#### 1.1.1 De l'autocomplétion à l'autonomie

Le passage de la complétion ligne par ligne aux refactorings multi-fichiers a nécessité de résoudre trois problèmes : la récupération de contexte, la planification et l'auto-vérification.

##### 1.1.1.1 Récupération de contexte

Les agents doivent trouver le *bon* code, pas simplement *du* code, dans un dépôt qui peut contenir des millions de lignes.

###### 1.1.1.1.1 Une remarque sur l'échelle

Les grands monorepos peuvent dépasser 50 millions de lignes de code. Les approches naïves du type "mettre tout le dépôt dans le prompt" atteignent vite leurs limites, d'où l'importance de l'indexation et de la recherche.

## 2. Composants de base

Voici les éléments qui composent généralement un système d'agents de code.

1. **Modèle** — le moteur de raisonnement
2. **Outils** — E/S fichiers, shell, exécution des tests, linter
3. **Mémoire** — court terme (tâche en cours) et long terme (conventions projet)
4. **Orchestration**, qui inclut généralement :
   1. Un planificateur qui découpe la tâche
   2. Un exécuteur qui appelle les outils
   3. Un vérificateur qui contrôle les résultats
      - tests unitaires
      - vérifications de type
      - règles de lint
4. **Sandbox** — environnement d'exécution isolé

Voici une checklist que les équipes utilisent souvent avant de mettre un agent en production :

- [x] Exécution en sandbox sans accès réseau sortant par défaut
- [x] Limites de coût et de nombre d'étapes par tâche
- [ ] Validation humaine pour les actions destructrices
- [ ] Journal d'audit complet de chaque appel d'outil
- [x] Mécanisme de rollback pour les modifications de fichiers

---

## 3. Comment les agents planifient

La plupart des agents modernes alternent planification et action, au lieu de tout planifier au départ. C'est essentiel, car les premiers plans deviennent souvent faux dès que de nouvelles informations arrivent (erreurs compilateur, tests en échec).

> Planifier sans feedback, c'est juste deviner avec des étapes en plus.
>
> > Un ingénieur senior l'a résumé plus brutalement : "Aucun plan ne survit à `npm install`."

### 3.1 Un modèle de coût simple

Si un agent effectue $n$ étapes et que chaque étape coûte environ $c$ tokens, le coût total est approximativement $n \times c$. Mais ce modèle linéaire se dégrade quand on tient compte de la croissance du contexte, car la plupart des agents réinjectent l'historique à chaque étape :

$$
C_{\text{total}} = \sum_{i=1}^{n} c \cdot (h_0 + i \cdot \Delta h)
$$

où $h_0$ est la taille de contexte initiale et $\Delta h$ la croissance de contexte par étape. Cette croissance quasi quadratique explique pourquoi la compaction et la synthèse de contexte sont des sujets de recherche actifs[^2].

## 4. Conception des outils

Une bonne conception des outils est sans doute plus impactante que le choix du modèle. Certains schémas reviennent dans la plupart des frameworks d'agents sérieux, documentés en détail dans des ressources comme le <a href="https://www.anthropic.com/engineering">blog engineering d'Anthropic</a> et dans les fichiers de conventions `AGENT.md`/`CLAUDE.md` que certains projets versionnent dans leurs dépôts.

Vous pouvez aussi visiter une URL brute, et la plupart des rendus la transformeront automatiquement en lien : https://github.com

### 4.1 Exemples de schémas d'outils

Voici un bloc avec un langage, pour activer la coloration syntaxique :

```python
def run_tests(path: str, timeout_s: int = 120) -> dict:
    """Execute the test suite at `path` and return structured results."""
    result = subprocess.run(
        ["pytest", path, "--json-report"],
        capture_output=True,
        timeout=timeout_s,
    )
    return {
        "passed": result.returncode == 0,
        "stdout": result.stdout.decode(),
        "stderr": result.stderr.decode(),
    }
```

Et voici un bloc sans langage, que la plupart des renderers affichent quand même en texte monospace :

```
{
  "tool": "edit_file",
  "path": "src/utils/parser.py",
  "diff": "- return None\n+ return default_value"
}
```

Un bloc plus long, multi-ligne — le type de contenu qu'on copie généralement avec un bouton plutôt que de le retaper :

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "Setting up agent sandbox..."
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt --quiet

echo "Running lint..."
ruff check . || { echo "Lint failed"; exit 1; }

echo "Running tests..."
pytest -q

echo "Sandbox ready."
```

## 5. Comparer les frameworks d'agents

| Framework | Langage principal | Sandbox | Notes |
|:----------|:-----------------:|--------:|:------|
| Framework A | Python | Yes | Boucle de vérification par tests solide, utile pour des refactorings backend et des tâches de scripting multi-fichiers |
| Framework B | TypeScript | No | Léger, orienté navigateur, adapté aux petits scripts |
| Framework C | Multi-language | Yes | Orienté entreprise, inclut une piste d'audit et des validations par rôles pour chaque opération destructive sur le système de fichiers ou le réseau |

Alignement des colonnes ci-dessus : nom aligné à gauche, sandbox centré, notes alignées à droite (le rendu peut varier selon le client, mais les marqueurs d'alignement sont présents dans la source).

## 6. Modes d'échec

Tout ne se passe pas toujours bien. Parmi les échecs fréquents :

- **APIs hallucinées** — invention de méthodes qui n'existent pas
- **Triche sur les tests** — modification du test au lieu du code pour forcer le vert
- **Dérive de périmètre** — modifications dans des fichiers hors demande
- **Troncature silencieuse** — perte du contexte initial et oubli des contraintes données au départ

Une reproduction minimale d'un cas de "triche sur les tests" ressemble souvent à :

```diff
- assert compute_total(cart) == 42
+ assert True  # TODO: fix later
```

## 7. Évaluation

Évaluer des agents est plus difficile qu'évaluer une seule sortie de modèle, car la réussite se définit sur une trajectoire complète, pas sur une réponse unique. Deux approches dominent :

1. **Basée sur le résultat** : les tests passent-ils, la PR a-t-elle fusionné, le bug est-il reproduit puis corrigé ?
2. **Basée sur le processus** : l'agent suit-il des étapes raisonnables, évite-t-il les actions risquées, et utilise-t-il efficacement ses outils ?

Ci-dessous, un exemple d'image — imaginez un graphique des taux de réussite sur des benchmarks :

<figure>
  <img src="https://placehold.co/900x450?text=Benchmark+Pass+Rates+2023-2026" alt="Taux de réussite des benchmarks de 2023 à 2026">
  <figcaption>Figure 1 : Exemple de taux de réussite sur benchmarks pour des agents de code entre 2023 et 2026.</figcaption>
</figure>

Et une image cliquable — cliquer dessus mènerait normalement vers une page source :

<figure>
  <a href="https://www.anthropic.com/engineering"><img src="https://placehold.co/300x200?text=Agent+Tool+Graph" alt="Graphe des interactions outils d'un agent"></a>
  <figcaption>Figure 2 : Exemple de graphe d'interaction des outils dans un pipeline d'agent.</figcaption>
</figure>

## 8. Considérations de sécurité

Des agents de code avec accès shell et réseau sont, en pratique, des ordinateurs télécommandés. Les équipes appliquent généralement une combinaison des mesures suivantes :

- Exécuter les agents dans des conteneurs éphémères
- Restreindre l'accès réseau sortant via une liste blanche
- Exiger une validation humaine avant de :
  - supprimer des fichiers
  - pousser sur `main`
  - faire tourner des identifiants/credentials
- Journaliser chaque commande pour audit ultérieur

C'est un domaine où la différence entre une démo et un système de production se joue presque entièrement dans les garde-fous, pas dans le modèle.

## 9. Où va le domaine ?

Quelques tendances semblent se confirmer :

- Des exécutions autonomes plus longues, en heures plutôt qu'en minutes
- Une meilleure auto-vérification, réduisant la dépendance à la revue humaine pour les changements de routine
- Des protocoles d'appel d'outils plus standardisés entre fournisseurs
- Une utilisation accrue de sous-agents, où un agent délègue des sous-tâches ciblées à d'autres

---

## Notes

[^1]: La "qualité des outils" désigne ici la clarté et le bon cadrage de l'interface d'un outil — un outil d'édition qui renvoie des diffs et erreurs explicites génère beaucoup moins d'erreurs qu'un outil qui échoue silencieusement.
[^2]: Les techniques de compaction de contexte vont de la simple troncature des anciens messages à des passes de synthèse plus avancées qui conservent les faits clés (fichiers touchés, décisions prises, questions ouvertes) tout en supprimant la sortie brute des outils.
