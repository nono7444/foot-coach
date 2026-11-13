#!/usr/bin/env bash
# Met à jour Foot Coach : récupère le code sur GitHub puis reconstruit le conteneur
set -e
cd "$(dirname "$0")"
echo "→ Récupération du code…"
git pull
cd /data
echo "→ Reconstruction du conteneur…"
docker compose up -d --build foot-coach
echo "✓ Foot Coach à jour"
