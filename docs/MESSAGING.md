# Système de messagerie · design (historique)

> **Contexte** : ce document décrit un design **temps réel SSE** conçu pour
> l'ancien monolithe **Next.js** (event bus in-process Node + Server Actions).
> L'implémentation retenue dans l'**API** (`apps/api`, module `Messaging`)
> est plus simple : conversations / messages en **polling** (rafraîchissement
> côté client toutes les ~5 s, cf. `docs/COMPTES-TEST.md`). Les sections sur les
> **flux utilisateur**, le **modèle de données** (conversations, messages,
> réactions) et les **règles métier** restent pertinentes ; en revanche tout ce
> qui concerne SSE, `EventSource`, l'event bus Node, les Server Actions et le
> « process Next.js » décrit un mécanisme non retenu. Source de vérité du
> stack : **[CLAUDE.md](../CLAUDE.md)**.

Messagerie 1-to-1 entre particuliers et refuges, avec réactions aux messages, indicateurs de frappe et accusés de lecture.

## Objectifs

- Un adoptant peut **poser une question** sur un chat avant d'envoyer une candidature formelle
- Un refuge peut **dialoguer** avec un candidat (demandes de précisions, rendez-vous, suivi post-adoption)
- Une personne qui a **trouvé un chat** peut contacter un refuge local
- **Temps réel** : nouveaux messages, réactions, indicateurs de frappe et accusés de lecture poussés côté client sans rafraîchissement
- **Réactions emoji** sur chaque message (❤️ 👍 😂 🙏 🐾)
- Fallback gracieux : si WebSocket/SSE fail, on tombe sur du polling léger

Non-objectifs (MVP) :
- Pas de chat user ↔ user (les signalements exposent déjà téléphone/email pour cas urgents)
- Pas de chat refuge ↔ refuge
- Pas d'attachements (photos, fichiers) · v2
- Pas de messages vocaux
- Pas de chiffrement bout-en-bout (chiffrement TLS en transit uniquement)
- Pas de threads dans un message (les réponses ciblées feraient une UX plus lourde sans vraie valeur sur des fils courts)

---

## Choix d'architecture temps réel

### Le choix : **Server-Sent Events (SSE) + event bus in-process**

SSE est un protocole HTTP standard (text/event-stream). Une connexion HTTP persistante du client vers le serveur, sur laquelle le serveur pousse des événements JSON au fil de l'eau.

**Pourquoi SSE et pas WebSocket** :

| Critère | SSE | WebSocket |
|---|---|---|
| Protocol | HTTP classique | Upgrade dédié |
| Caddy reverse proxy | natif, rien à config | OK mais nécessite `transport http` avec keepalive tuné |
| Auth (cookie de session) | hérité de la requête HTTP | `ws://` sur le même domain OK, sinon complexe |
| Reconnect auto | natif (EventSource) | manuel |
| Unidirectionnel | ✓ (server → client) | ✗ bidirectionnel |
| Compatible HTTP/2 & HTTP/3 | ✓ | ✗ (HTTP/1.1 seulement) |
| Ressource serveur par client | 1 requête ouverte | 1 socket TCP |
| Librairies | zéro dépendance (Node + Response ReadableStream) | `ws`, `socket.io`, etc. |

Pour une messagerie 1-to-1 asymétrique (l'utilisateur envoie via POST, le serveur broadcast les nouveaux messages via SSE), le caractère unidirectionnel de SSE n'est pas une limitation · c'est même une simplification. Le client envoie ses messages par `fetch POST` comme d'habitude, le serveur les pousse au destinataire via le stream SSE déjà ouvert.

**Pourquoi pas un service managé** (Pusher, Ably, Supabase Realtime) : règle de souveraineté du projet (pas d'AWS, Google, services hors EU), coûts qui montent avec l'usage.

**Pourquoi pas Soketi self-hosted** : ajoute un service à opérer, alors que SSE tient dans le process Next.js existant.

### Event bus

Un `EventEmitter` Node mémorise les listeners par `conversationId`. Quand une mutation (nouveau message, nouvelle réaction, update lu) survient, elle publie sur le bus. Les SSE handlers abonnés à `conversationId` reçoivent l'event et le sérialisent vers leur client connecté.

**Limite** : un seul process Node. Si on scale horizontalement (plusieurs containers Next.js), il faut un **Redis pub/sub** pour relayer les events entre processes. **Reporté en phase 2** : un VPS avec un Node servant tranquillement 500-1000 connexions SSE concurrentes est largement suffisant pour le lancement.

### Fallback

`EventSource` reconnecte automatiquement avec `retry:` spécifié dans le stream. Si la connexion refuse d'ouvrir (firewall restrictif, ad-blocker agressif), le client bascule sur du polling `/api/messages/[conversationId]?since=...` toutes les 5 secondes · UX dégradée mais fonctionnelle.

---

## User flows

### A · Question sur un chat avant candidature

1. Alice regarde `/adopter/abc123` (Princesse)
2. Bouton « Poser une question au refuge »
3. Clic → modale avec textarea
4. Envoi → crée la conversation + le message + push/email aux admins du refuge
5. Redirige Alice sur `/messages/[id]`
6. **Dès que le refuge ouvre la conversation → Alice voit en temps réel le tick de lecture**
7. **Le refuge commence à taper → Alice voit « Chats Libres de Paris est en train d'écrire… »**
8. Message reçu → apparaît instantanément dans le fil Alice

### B · Réactions

1. Le refuge écrit « Princesse peut aller sur un balcon sécurisé, oui »
2. Alice survole le message → bouton « + » apparaît, ouvre le picker emoji
3. Elle clique 🙏 → la réaction apparaît sous le message chez elle ET chez le refuge en temps réel
4. Le refuge clique à son tour 🐾 pour confirmer → compteur des réactions mis à jour en live

### C · Accusé de lecture

1. Bob envoie un message à 14:30, status « envoyé » (une coche grise)
2. Le refuge ouvre la conversation à 15:12 → status passe à « lu » (deux coches bleues) avec timestamp
3. Le changement est visible en live chez Bob sans qu'il rafraîchisse

### D · Offline & push fallback

1. Claire a envoyé un message à Bob, qui est hors-ligne
2. Le serveur détecte qu'aucun stream SSE n'est actif pour Bob sur cette conversation
3. Push notification envoyée (si Bob a souscrit) + in-app notification
4. Bob ouvre Dorloter → navbar affiche le badge unread → clic sur `/messages` → thread

---

## Schéma de données

### Tables

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shelter_id UUID NOT NULL REFERENCES shelters(id) ON DELETE CASCADE,
  cat_id UUID REFERENCES cats(id) ON DELETE SET NULL,
  subject VARCHAR(255),
  last_message_at TIMESTAMP NOT NULL DEFAULT now(),
  last_message_preview VARCHAR(200),
  last_sender_type VARCHAR(20),
  user_unread_count INTEGER NOT NULL DEFAULT 0,
  shelter_unread_count INTEGER NOT NULL DEFAULT 0,
  archived_by_user BOOLEAN NOT NULL DEFAULT false,
  archived_by_shelter BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX conversations_context_idx
  ON conversations (user_id, shelter_id, COALESCE(cat_id, '00000000-0000-0000-0000-000000000000'));
CREATE INDEX conversations_user_idx ON conversations (user_id, last_message_at DESC);
CREATE INDEX conversations_shelter_idx ON conversations (shelter_id, last_message_at DESC);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL,   -- 'user' | 'shelter'
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMP,
  edited_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_idx ON messages (conversation_id, created_at);

-- Nouveauté : réactions
CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL,   -- stocke l'emoji Unicode directement
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
-- Unique (message, user, emoji) : un user ne peut pas réagir 2× avec le même
CREATE UNIQUE INDEX message_reactions_unique_idx
  ON message_reactions (message_id, user_id, emoji);
CREATE INDEX message_reactions_message_idx ON message_reactions (message_id);
```

### Contraintes et design rationale

- **`sender_id UUID`** : l'id du user (même pour un refuge admin · c'est lui personnellement qui a envoyé). `sender_type` donne le camp (affichage UI, permissions).
- **`edited_at`** : pour un éventuel édit de message. Affiché « modifié » dans l'UI si non-null.
- **`message_reactions` avec emoji Unicode direct** : évite une table de lookup pour les emojis · plus simple, utf8mb4 géré nativement par Postgres 18.
- **Contrainte unique sur (message, user, emoji)** : un user clique 2× sur 🙏 → la 2e fois ça **toggle** (suppression) côté server action. C'est la sémantique Telegram/Slack.
- **Limitation emoji** : on whitelistera côté server action à ~10 emojis (voir « liste ci-dessous »). Pas de clavier emoji complet pour éviter le bruit (et les emojis random type 🍆).

### Ephemeral (hors DB)

- **Typing indicator** : état en mémoire dans l'event bus, TTL 3 secondes
- **Online presence** : dérivé du nombre de streams SSE actifs pour un user sur une conversation

Pas de persistence → pas de schéma nécessaire.

---

## API

### Server Actions (mutations)

Toutes : auth requise, vérif appartenance à la conversation, rate-limit.

#### `openConversation({ shelterId, catId?, firstMessage })`

- Rate limit 5/h
- Crée ou récupère la conversation unique par `(user, shelter, cat)` 
- Insère le 1er message
- Publie `message.created` sur le bus
- Envoie push + email aux admins du refuge (fanout sur tous les shelter_admins)
- Retourne `{ conversationId }`

#### `sendMessage(conversationId, content)`

- Rate limit 30/h (anti-spam bulk)
- 1-2000 caractères, trim des whitespaces leading/trailing
- Insère le message
- Met à jour `conversations.last_message_*` + compteur unread du destinataire
- Publie `message.created` sur le bus
- Si aucun stream SSE actif pour le destinataire → push notification (sinon silence : il est déjà en train de voir arriver le message en live)
- Email au destinataire **seulement** si le fil était silencieux > 24h (reprise de fil, pas pour chaque message)

#### `editMessage(messageId, content)`

- Auteur uniquement
- Fenêtre de 5 minutes après `created_at` (pas d'édition d'historique ancien pour l'intégrité des échanges)
- Set `edited_at = now()`
- Publie `message.updated`

#### `toggleReaction(messageId, emoji)`

- Vérifie emoji dans la whitelist (cf. ci-dessous)
- Vérifie appartenance à la conversation du message
- Insert with `ON CONFLICT (message, user, emoji) DO DELETE` · toggle natif Postgres
- Publie `reaction.toggled` sur le bus avec la nouvelle agrégation
- Pas de push notification pour les réactions (bruit trop élevé)

#### `markConversationRead(conversationId)`

- Update `messages.read_at` pour tous les messages non lus destinés au user courant
- Reset `*_unread_count` correspondant à 0
- Publie `conversation.read` sur le bus (l'autre camp voit les ticks bleus apparaître)

#### `setTyping(conversationId, isTyping: boolean)`

- Pas de persistence DB
- Publie `typing.changed` sur le bus, TTL géré côté receveur (3s)
- Rate-limit généreux (10/min) · debounce côté client (poste max 1×/3s même si on tape vite)

#### `archiveConversation(conversationId)`

- Set `archived_by_user` ou `archived_by_shelter`
- N'affecte pas l'autre camp
- Un nouveau message désarchive automatiquement

### API Routes (stream + polling fallback)

#### `GET /api/messages/stream?conversationId=X`

- SSE endpoint, `text/event-stream`, `connection: keep-alive`
- Vérifie appartenance à la conversation
- Ouvre une `ReadableStream`, abonne au bus pour `conversationId`
- À chaque event reçu : `res.write('data: ' + JSON.stringify(event) + '\n\n')`
- Heartbeat `: ping` toutes les 30s pour tuer les connexions zombies côté proxy
- Sur `AbortSignal` (client déconnecte) : désabonne du bus, libère les refs

#### `GET /api/messages/poll?conversationId=X&since=timestamp`

- Fallback polling pour les clients où SSE échoue
- Retourne les messages + réactions depuis `since`
- Client fallback : polling toutes les 5s

#### `GET /api/messages/unread-count`

- Retourne `{ userUnreadCount, shelterUnreadCount }`
- Hit toutes les 60s par la navbar (quand aucun stream SSE actif)

---

## Whitelist des emojis de réaction

Limité à 10 pour garder la UX propre :

```
🙏 (merci / s'il vous plaît)
❤️ (love / apprécie)
👍 (d'accord / validé)
👎 (pas d'accord)
😂 (drôle)
😢 (triste)
🎉 (célébration)
🐾 (thème chat)
🔥 (top / impressionnant)
✅ (confirmé / compris)
```

Stockés côté serveur dans `src/lib/messaging/emojis.ts`. Toute tentative de réaction avec un emoji hors liste → 400.

---

## UI / composants

### Nouvelles routes

| Route | Accès |
|---|---|
| `/messages` | Inbox user |
| `/messages/[id]` | Thread view user |
| `/shelter-messages` | Inbox refuge |
| `/shelter-messages/[id]` | Thread view refuge |

### Composants

#### `ConversationList` (serveur)
- Tri par `last_message_at DESC`
- Chaque ligne : avatar (chat si `cat_id`, sinon refuge), titre, dernier aperçu tronqué 80c, badge unread, date relative (« il y a 3 min »)

#### `ConversationThread` (client)
Le cœur de l'expérience. Hook `useMessagingStream(conversationId)` :

```ts
function useMessagingStream(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState<string | null>(null);
  const [onlinePeers, setOnlinePeers] = useState<string[]>([]);

  useEffect(() => {
    const es = new EventSource(`/api/messages/stream?conversationId=${conversationId}`);
    es.addEventListener("message.created", (ev) => {
      const msg = JSON.parse(ev.data);
      setMessages((prev) => [...prev, msg]);
    });
    es.addEventListener("reaction.toggled", (ev) => { /* update message.reactions */ });
    es.addEventListener("conversation.read", (ev) => { /* update read_at */ });
    es.addEventListener("typing.changed", (ev) => {
      const { userId, isTyping } = JSON.parse(ev.data);
      setTyping(isTyping ? userId : null);
      // auto-clear après 3s
    });
    return () => es.close();
  }, [conversationId]);

  return { messages, typing, onlinePeers };
}
```

#### `MessageBubble`
- Bulle à gauche ou droite selon le camp
- `created_at` relatif
- Tick(s) de lecture (coche grise = envoyé, deux coches bleues = lu)
- Survol : bouton « + » → `ReactionPicker`
- Affichage des réactions sous le message (voir ci-dessous)

#### `ReactionPicker`
- Popover au clic sur « + »
- Grille 5×2 avec les 10 emojis
- Clic → `toggleReaction(messageId, emoji)`
- Optimistic update : la réaction apparaît immédiatement, confirmée au retour du SSE

#### `ReactionBar`
Affichage agrégé sous chaque message :
```
[🙏 3]  [❤️ 1]  [+ add]
```
- Clic sur une pastille existante → toggle (remove si c'est moi, add sinon)
- Hover → tooltip avec la liste des users ayant réagi

#### `TypingIndicator`
- « Alice est en train d'écrire… » avec 3 points animés
- Auto-hide après 3s sans nouvel event typing
- Ne déclenche pas de scroll automatique (évite de pousser le compositeur)

#### `MessageComposer`
- Textarea auto-resize (jusqu'à 6 lignes visibles)
- Debounce `setTyping(true)` au premier keystroke, `setTyping(false)` 3s après le dernier
- Ctrl+Entrée pour envoyer, Entrée seule = newline
- Désactivé pendant envoi, ré-activé au retour du SSE confirmant l'insertion
- Limite visible : `content.length / 2000`

#### `OnlineIndicator` (optionnel)
- Point vert à côté du nom de l'autre camp si au moins un stream SSE actif pour lui sur cette conversation
- Pas affiché si tout le monde est offline (pas de « vu il y a X » · privacy)

#### `MessagesBadge` (navbar)
- Compteur unread
- Rafraîchi : via SSE sur une conversation ouverte, sinon polling `/api/messages/unread-count` toutes les 60s

### Entry points

- `/adopter/[id]` : bouton « Poser une question au refuge » (modale + `openConversation`)
- `/refuges/[id]` : bouton « Contacter ce refuge »
- `/shelter-candidatures` : bouton « Contacter le candidat » (réutilise la conversation liée au cat s'il y en a une)
- Navbar : lien « Messages » avec badge unread
- Bottom-nav mobile : tab dédiée

---

## Notifications

| Événement | In-app | Push | Email |
|---|---|---|---|
| 1er contact initial | ✓ | ✓ | ✓ |
| Nouveau message, destinataire offline (pas de SSE actif) | ✓ | ✓ | · |
| Nouveau message, destinataire online sur cette convo | · | · | · (il le voit en live) |
| Nouveau message, destinataire online ailleurs dans l'app | ✓ (toast) | · | · |
| Fil silencieux > 24h, nouveau message | ✓ | ✓ | ✓ (reprise) |
| Réaction reçue | · | · | · (bruit trop élevé) |
| Accusé de lecture | · | · | · |
| Typing | · | · | · |

Nouveau `notificationTypeEnum.new_message` (migration).

---

## Event bus (implémentation)

```ts
// src/server/messaging/bus.ts
import { EventEmitter } from "node:events";

type MessagingEvent =
  | { type: "message.created"; conversationId: string; message: MessageDTO }
  | { type: "message.updated"; conversationId: string; message: MessageDTO }
  | { type: "reaction.toggled"; conversationId: string; messageId: string; reactions: ReactionAgg[] }
  | { type: "conversation.read"; conversationId: string; readerId: string; readAt: Date; messageIds: string[] }
  | { type: "typing.changed"; conversationId: string; userId: string; isTyping: boolean };

class MessagingBus extends EventEmitter {
  // Singleton dans le process Node. TODO phase 2 : remplacer par Redis pub/sub.
  publish(event: MessagingEvent) {
    this.emit(`conv:${event.conversationId}`, event);
  }
  subscribe(conversationId: string, handler: (ev: MessagingEvent) => void) {
    const key = `conv:${conversationId}`;
    this.on(key, handler);
    return () => this.off(key, handler);
  }
}

// Un singleton par process · on passe par `globalThis` pour survivre aux
// rechargements Turbopack en dev.
const globalAny = globalThis as unknown as { __messagingBus?: MessagingBus };
export const messagingBus = globalAny.__messagingBus ??= new MessagingBus();
messagingBus.setMaxListeners(10_000); // largement au-dessus du nombre de convos actives
```

### SSE handler squelette

```ts
// src/app/api/messages/stream/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await requireAuth();
  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId");
  if (!conversationId) return new Response("Missing conversationId", { status: 400 });
  await assertCanAccessConversation(session.user.id, conversationId);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const unsubscribe = messagingBus.subscribe(conversationId, (event) => {
        controller.enqueue(
          encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
        );
      });
      // Heartbeat 30s pour contrer les timeouts proxy/LB
      const hb = setInterval(() => controller.enqueue(encoder.encode(": ping\n\n")), 30_000);

      req.signal.addEventListener("abort", () => {
        clearInterval(hb);
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // désactive buffering Caddy/nginx
    },
  });
}
```

### Caddy config

Déjà OK pour SSE · `reverse_proxy` de Caddy stream par défaut. Seul ajustement : on désactivera le compresseur sur cet endpoint spécifique (gzip casse le flush des events). Dans le `Caddyfile` :

```
@sse path /api/messages/stream
handle @sse {
    reverse_proxy app:3000 {
        flush_interval -1
    }
}
```

---

## Anti-abus

- Rate-limit `sendMessage` : 30/h par user
- Rate-limit `openConversation` : 5/h par user
- Rate-limit `toggleReaction` : 60/min (absurde d'en faire plus)
- Rate-limit `setTyping` : 10/min (debounce client minimise bien en dessous)
- Longueur : 1-2000 caractères pour `content`
- Honeypot `_hp` sur le composer
- Signalement des fils via `content_reports` (type `conversation`) : auto-hide à 5 signalements
- Shelter admin peut **bloquer** un user ayant abusé (flag à ajouter en phase 2) : nouvelle table `conversation_blocks` (shelter_id, user_id) · l'user ne peut plus ouvrir de conversations avec ce refuge

---

## Sécurité & confidentialité

- **Isolement** : `assertCanAccessConversation(userId, conversationId)` vérifie que le user courant est soit le user_id du fil, soit un shelter_admin du shelter_id
- **Privacy admin plateforme** : les platform_admin **ne voient pas** les messages, sauf sur un fil explicitement signalé. Accès via `/admin/moderation` avec log `admin.conversation_viewed`
- **Export RGPD** : `/api/profile/export` inclut les conversations et messages de l'user + ses réactions
- **Suppression compte** : cascade delete via les FK. Les messages envoyés par un user supprimé restent visibles dans la conversation côté refuge (légitime · ils ont été échangés dans un contrat de service), avec `sender_id = NULL` après `ON DELETE SET NULL`. Le `content` est conservé mais `sender` devient « Utilisateur supprimé »
- **Politique de rétention** : conversations archivées depuis > 12 mois → purgées automatiquement (cron, à ajouter). Justification RGPD : durée strictement nécessaire à la finalité (suivi adoption + litiges éventuels)

---

## Scalabilité

MVP cible un VPS OVH VLE-4 (2 vCPU, 4 Go RAM). Un process Node gère aisément **500-1000 connexions SSE concurrentes** avant de commencer à saturer.

**Signes de saturation à surveiller** :
- CPU > 80 % de façon soutenue
- Latence `/api/messages/stream` > 500ms
- Nombre de listeners sur l'event bus > 5000

**Plan de scale quand ça arrive** :
1. Déplacer l'event bus sur Redis pub/sub (Redis à 3 €/mois chez Redis Cloud FR ou self-host dans le docker-compose)
2. Scale Next.js horizontalement : 2+ containers derrière Caddy load-balancer
3. Sticky sessions pas nécessaires (chaque stream SSE peut viser n'importe quel process, Redis route les events)

À ce stade on a probablement plusieurs milliers d'utilisateurs actifs · problème appréciable d'avoir.

---

## Plan d'implémentation (~5-6 jours dev)

### Jour 1 · fondations DB + bus
- Migrations `conversations`, `messages`, `message_reactions`
- Enum `new_message` ajouté à `notificationTypeEnum`
- Mise à jour `init-db-roles.sql` (grants sur nouvelles tables)
- `src/server/messaging/bus.ts` (event bus singleton)
- `src/lib/messaging/emojis.ts` (whitelist)

### Jour 2 · server actions & API
- Server actions : `openConversation`, `sendMessage`, `editMessage`, `toggleReaction`, `markConversationRead`, `setTyping`, `archiveConversation`
- API route SSE : `/api/messages/stream`
- API route polling fallback : `/api/messages/poll`
- API route unread count : `/api/messages/unread-count`
- Tests unitaires critiques (bus pub/sub, assertCanAccessConversation)

### Jour 3 · UI thread + composer
- `/messages/[id]` avec thread view
- `useMessagingStream` hook
- `MessageBubble`, `MessageComposer`, `TypingIndicator`
- Auto-scroll intelligent (garde la position si l'user a scrollé vers le haut)

### Jour 4 · réactions + read receipts
- `ReactionPicker`, `ReactionBar`
- Ticks d'accusé de lecture
- Optimistic updates sur réactions
- UI online indicator (optionnel)

### Jour 5 · inbox + refuge side + entry points
- `/messages` inbox
- `/shelter-messages` + thread refuge
- Boutons « Poser une question », « Contacter le refuge », « Contacter le candidat »
- Navbar badge + bottom-nav mobile

### Jour 6 · notifications + modération + polish
- Template email `newMessageEmailTemplate`
- Push fanout conditionné à l'absence de SSE actif
- Signalement d'une conversation dans `/admin/moderation`
- Export RGPD mis à jour
- Smoke tests E2E (Playwright) sur flow A/B/C/D
- Docs deployment (aucun cron supplémentaire nécessaire, mais rétention 12 mois à ajouter)

---

## Mesurer le succès (30 jours)

- **% visites fiche chat → ouverture conversation** (« intent ratio »)
- **% conversations → candidature** (conversion)
- **Temps médian de première réponse refuge** (qualité de service)
- **Nombre moyen de messages par conversation** (engagement)
- **Utilisation des réactions** : % de messages ayant reçu au moins une réaction
- **Taux d'acceptation SSE vs fallback polling** (santé technique)

---

## Phase 2+

Parking :

- **Attachments photo** (cat en foyer d'accueil, logement adoptant)
- **Messages vocaux** court format (30s max)
- **Link previews** (Open Graph snapshot pour les URLs collées)
- **Templates de réponse** côté refuge (« Merci pour votre intérêt, voici notre procédure… »)
- **Recherche plein texte** dans les conversations (pg_trgm)
- **Export PDF** d'une conversation (utile pour litige)
- **Block user** côté refuge (table `conversation_blocks`)
- **Redis pub/sub** si scaling horizontal nécessaire
- **Présence "vu il y a X minutes"** (décision privacy · probablement on laisse tomber)

---

## Décisions à valider avant de coder

- ☐ **SSE vs WebSocket** : je pars sur SSE. Si tu préfères WebSocket malgré mes arguments, dis-le maintenant (Socket.IO + Next.js Custom Server = refacto du serveur Next).
- ☐ **Whitelist emoji** : 10 proposés, ajouter/retirer ?
- ☐ **Fenêtre d'édition** : 5 min après envoi. Trop ? Trop peu ?
- ☐ **Rétention** : purge après 12 mois d'inactivité. OK ou autre durée ?
- ☐ **Online indicator** : l'implémenter au MVP, ou laisser phase 2 (privacy concerns) ?
- ☐ **Contacter un candidat** depuis `/shelter-candidatures` : réutilise la conversation (user, shelter, cat) existante si elle existe, sinon en crée une. OK ?
