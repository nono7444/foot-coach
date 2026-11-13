# ⚽ Wawa Foot Coach

Coach guidé pour mes 2 séances de foot par semaine (attaquant / milieu), **50 min maximum** chacune :
- **Séance A** : échauffement, sauts, accélérations, sprints répétés, renfo force (fente bulgare, tractions, Nordic, mollets)
- **Séance B** : échelle, 4 parcours techniques avec schémas (slalom, contrôle orienté, échelle + frappe, parcours de l'attaquant), circuit prévention (Copenhagen, tibial, mollets, gainage)
- Pour chaque séance : matériel à prendre, mise en place sur le terrain, check tibia (périostite)
- Chaque exercice expliqué (comment faire, à savoir, erreurs), chrono pour chaque série et chaque récup, bips + voix
- 2 tests simples (navettes 15 m, tractions max) en semaines 1 et 8
- Séances, tests et historique **sauvegardés sur le serveur** (`data/data.json`)

## Structure

```
foot-coach/
├── src/             # App.jsx = écrans · program.js = séances et exercices · diagrams.js = schémas · sync.js = sauvegarde
├── server/server.js # petit serveur Node : sert l'appli + /api/data
├── public/          # icônes + manifest (installation sur l'iPhone)
├── Dockerfile
└── update.sh        # mise à jour en une commande sur le serveur
```

## 📱 Appli iPhone (FlareStore)

L'appli native est dans `mobile/` (Expo / React Native, comme Lumio).
À chaque push sur `main` qui touche `mobile/`, GitHub Actions compile l'IPA et publie une Release avec la source FlareStore.

**Installer sur l'iPhone** : FlareStore → Sources → **+** → colle
`https://github.com/nono7444/foot-coach/releases/latest/download/altstore.json`
puis installe **Foot Coach**. Les mises à jour arrivent toutes seules dans FlareStore.

Les séances et exercices sont dans `mobile/src/program.js` (partagé avec la version web).
La sauvegarde serveur est optionnelle : onglet **Guide → Sauvegarde sur ton serveur**.

---

## 1. Première installation sur le serveur

Connecte-toi au serveur depuis le Mac :

```bash
ssh norman@192.168.1.71
```

Récupère le code dans `/data/foot-coach` :

```bash
cd /data
git clone https://github.com/nono7444/foot-coach.git
```

> Si le dépôt est **privé**, GitHub te demande un identifiant : ton nom `nono7444`
> et, comme mot de passe, un *token* (GitHub → Settings → Developer settings →
> Personal access tokens). Si tu l'as déjà fait pour un autre dépôt, c'est le même.

### Ajouter le service dans ton docker-compose

Ouvre ton compose principal :

```bash
nano /data/docker-compose.yml
```

Ajoute ce bloc sous `services:` (même indentation que tes autres services, par ex. `lumio`) :

```yaml
  foot-coach:
    build: ./foot-coach
    container_name: foot-coach
    restart: unless-stopped
    environment:
      - APP_PIN=${FOOT_COACH_PIN}
    volumes:
      - ./foot-coach/data:/app/data
    ports:
      - "8092:3000"
```

Enregistre : `Ctrl + O`, `Entrée`, puis `Ctrl + X`.

### Choisir un code d'accès

L'appli sera sur Internet : le code évite que n'importe qui voie ou modifie tes séances.
Ajoute une ligne dans `/data/.env` (remplace `4827` par ton code) :

```bash
echo 'FOOT_COACH_PIN=4827' >> /data/.env
```

### Lancer

```bash
cd /data
docker compose up -d --build foot-coach
docker logs foot-coach
```

Tu dois voir `Foot Coach sur le port 3000`. Test en local : ouvre `http://192.168.1.71:8092` sur ton iPhone (en Wi-Fi à la maison).

---

## 2. L'ouvrir depuis l'extérieur : foot.wawanono.lol

Même principe que `lumio.wawanono.lol` :

1. **nginx-proxy-manager** (`http://192.168.1.71:81`) → *Proxy Hosts* → *Add Proxy Host*
   - Domain : `foot.wawanono.lol`
   - Scheme : `http` · Forward Hostname : `192.168.1.71` · Port : `8092`
   - Coche *Websockets Support* et *Block Common Exploits*
2. **Cloudflare Zero Trust** → *Networks* → *Tunnels* → ton tunnel → *Public Hostname* → *Add*
   - Subdomain : `foot` · Domain : `wawanono.lol`
   - Service : le même que pour tes autres sous-domaines (ton nginx-proxy-manager)

Ouvre `https://foot.wawanono.lol`, entre ton code.

### L'installer comme une appli sur l'iPhone

Safari → `https://foot.wawanono.lol` → bouton **Partager** → **Sur l'écran d'accueil**.

---

## 3. Mettre à jour après une modification

Quand le code change sur GitHub :

```bash
ssh norman@192.168.1.71
/data/foot-coach/update.sh
```

Le script fait `git pull` puis reconstruit le conteneur. Tes séances (`data/`) ne sont jamais touchées.

---

## Développer sur le Mac (optionnel)

```bash
npm install
npm start      # terminal 1 : serveur sur le port 3000
npm run dev    # terminal 2 : appli sur http://localhost:5173
```

## Sauvegardes

- `data/data.json` : tes données
- `data/backup-AAAA-MM-JJ.json` : une copie par jour d'utilisation
