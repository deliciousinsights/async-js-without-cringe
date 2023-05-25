---
theme: ./theme
titleTemplate: 'L’asynchrone en JS sans le cringe'
background: /jeshoots-com--2vD8lIhdnw-unsplash.jpg
download: true
exportFilename: asynchrone-en-js-sans-le-cringe
class: text-center
highlighter: shiki
lineNumbers: true
favicon: https://delicious-insights.com/apple-touch-icon.png
info: |
  ## L’asynchrone en JS sans le cringe

  Une présentation de Christophe Porteneuve à [DevFest Lille 2023](https://devfest.gdglille.org/).

  Envie de plus ? Notre [chaîne YouTube](https://www.youtube.com/c/DeliciousInsights) et nos [super formations](https://delicious-insights.com/fr/formations/) sont pour toi !
drawings:
  persist: false
  syncAll: false
css: unocss
---

# L’asynchrone en JS<br/>sans le cringe

Une présentation de Christophe Porteneuve à [DevFest Lille 2023](https://devfest.gdglille.org/)

---

# `whoami`

```js
const christophe = {
  family: { wife: 'Élodie', sons: ['Maxence', 'Elliott'] },
  city: 'Paris, FR',
  company: 'Delicious Insights',
  trainings: ['TypeScript', 'React PWA', 'Node.js', 'ES Total'],
  jsSince: 1995,
  claimsToFame: [
    'Prototype.js',
    'script.aculo.us',
    'Bien Développer pour le Web 2.0',
    'NodeSchool Paris',
    'Paris Web',
    'dotJS'
  ]
}
```


---
layout: center
---

# Usual Suspects

---

# `async` sans `await` ni enrobage promesse voulu

```js {1-3|5-8|10-12|all}
export async function getAllRoles(req, res) {
  res.send({ data: ROLES })
}

export async function getAllRolesWithAbilities(req, res) {
  const data = computeCombinedAbilitiesByRole(Object.keys(ROLES))
  res.send({ data })
}

async function create(createData) {
  return GeneralParameter.create(createData)
}
```

---

# `async` sans `await` ni enrobage promesse voulu : fix

```js
export function getAllRoles(req, res) {
  res.send({ data: ROLES })
}

export function getAllRolesWithAbilities(req, res) {
  const data = computeCombinedAbilitiesByRole(Object.keys(ROLES))
  res.send({ data })
}

function create(createData) {
  return GeneralParameter.create(createData)
}
```

---

# `map` à tort sur un callback `async`

```js
const mailSequence = mails.map(async (mail) => await sendMail(mail))
```

---

# `map` à tort sur un callback `async` : fix n°1

```js
const mailSequence = mails.map(async (mail) => await sendMail(mail))
```

<carbon-arrow-down/>

```js
const mailSequence = mails.map((mail) => sendMail(mail))
```

<div v-click>

_(Éventuellement, si tu peux **garantir** que `sendMail` n’utilise que son premier argument, et ne sera donc pas gêné par des arguments supplémentaires :)_

```js
const mailSequence = mails.map(sendMail)
```
</div>

---

# `map` à tort sur un callback `async` : fix n°2

```js
const mailSequence = mails.map(async (mail) => await sendMail(mail))
```

<carbon-arrow-down/>

Parallélisé (court-circuit sur 1ère erreur temporelle) :

```js
const mailSequence = await Promise.all(mails.map((mail) => sendMail(mail)))
```

<div v-click>

Séquencé (court-circuit sur première erreur itérative) :

```js
const mailSequence = []
for (const mail of mails) {
  mailSequence.push(await sendMail(mail))
}
```
</div>

---

# `return await` superflu (ou son équivalent)

```js {1-4|6-9|11-15|all}
async function getUserById(id) {
  const user = await User.findByPk(…)
  return user
}

async function upsertSetting(formObject) {
  // …
  return noRecord ? await create(fields) : await update(fields)
}

async function renewToken({ commit }) {
  const { token, refreshToken } = await renewToken()
  const setToken = await commit('setToken', { token, refreshToken })
  return setToken
}
```

---

# `return await` superflu (ou son équivalent) : fix

```js {all|12-13}
function getUserById(id) {
  return User.findByPk(…)
}


function upsertSetting(formObject) {
  // …
  return noRecord ? create(fields) : update(fields)
}

async function renewToken({ commit }) {
  const { token, refreshToken } = await renewToken()
  return commit('setToken', { token, refreshToken })
}
```

---

# Contre-exemple pour `await` suivi de `return`

Si on transforme le résultat (par exemple en ne renvoyant qu'une partie), on doit forcément faire un `await` local pour ensuite transformer avant de renvoyer :


```js {all|2}
async function logIn(req, res) {
  const { token } = await attemptLogIn(req.body)
  return token
}
```

---

# Le cas légitime pour `return await`

```js {all|2-5}
async function process(items) {
  try {
    …
    return await subProcess(items)
  } catch (error) {
    console.error(`Couldn't run subprocess for ${items}: ${error}`)
    throw error // Or possibly provide a fallback value, or something.
  }
}
```

<div v-after>

Si on peut traiter localement l'erreur que la promesse est susceptible de lever, il faut un `await` pour que celle-ci soit levée au sein du `try…catch`.

</div>

---

# Séquencer au lieu de paralléliser

Une parallélisation n'est pas toujours préférable, mais quand elle l'est, séquencer « par défaut » laisse de la performance sur la table.

```js
async function bulkCreateOrUpdate(data) {
  …
  for (let i = 0; i < data.length; i++) {
    await User.upsert(data[i], { transaction })
  }
  …
}
```

---

# Séquencer au lieu de paralléliser : fix

Cadeau bonus : ça permet dans ce cas précis de virer **cette fichue boucle numérique** qui aurait dû être [une jolie `for`…`of`](https://delicious-insights.com/fr/articles/js-for-of/). Y'avait rien qu'allait dans ce code.

```js
async function bulkCreateOrUpdate(data) {
  …
  await Promise.all(data.map((userData) => User.upsert(userData, { transaction })))
  …
}

```

<div v-click>

Et si on est **limités dans la parallélisation** _(ex. connexions à la base de données)_, pas de souci, on a des solutions pour plafonner :

```js
import { map as cappedAll } from 'awaiting'

await cappedAll(data, 5, (userData) => User.upsert(userData, { transaction }))
```

</div>

---

# Mélanger `.then()` et `async` / `await`

Non mais 🤮, quoi.

```js
async function down(queryInterface, Sequelize) {
  const transaction = await queryInterface.sequelize.transaction()
  try {
    await queryInterface
      .bulkDelete('user_org_roles', null, {})
      .then(() => queryInterface.bulkDelete('user', null, {}))
      .then(() => queryInterface.bulkDelete('person', null, {}))
    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}
```

---

# Mélanger `.then()` et `async` / `await` : fix

Utilise juste `async` / `await`, enfin !

```js
async function down(queryInterface, Sequelize) {
  const transaction = await queryInterface.sequelize.transaction()
  try {
    await queryInterface.bulkDelete('user_org_roles')
    await queryInterface.bulkDelete('user')
    await queryInterface.bulkDelete('person')
    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}
```

---

# ZOMGWTFBBQ

J'étais tombé sur ce multi-récidiviste :

```js
async function deleteUser(req, res) {
  return userService.destroyUser(req.params.id).then(async (user) => {
    res.status(200).send(user)
  })
}
```

Purée, **y'a rien qui va**.

<div v-click>

```js
async function deleteUser(req, res) {
  const user = await userService.destroyUser(req.params.id)
  res.status(200).send(user)
}
```

</div>

---

# Utiliser des chaînes de promesses manuelles

C'est une variante « moins grave » du mélange des styles, mais c'est quand même _so 2015_.  Je suis tombé sur ce clusterfuck récemment :

```js {all|2-4|5-7|3-7}
export function findAllUsers(query) {
  …
  return User.findAndCountAll(…)
    .then(ensureAtLeastOne)
    .catch((error) => {
      throw new Error(error)
    })
}
```

<ul>
  <li v-click=1>Il y a un risque de <strong>double mode d’erreur</strong> (synchrone et asynchrone).</li>
  <li v-click=2>Ce <code>catch</code> est aussi utile que le H de Hawaï.</li>
  <li v-click=3>Les chaînes de promesses restent <strong>plus dures à orchestrer</strong> (pas de structures de contrôle).</li>
</ul>

---

# Aparté : _scope juggling_ dans une chaîne manuelle

```js {all|2,6|3,10|2,3,13,14|all}
function getUsersLastPost(userId) {
  let user
  let post
  return User.findByPk(userId)
    .then((u) => {
      user = u
      return u.posts.sort('-createdAt').findOne()
    })
    .then((p) => {
      post = p
      return p.comments.sort('-createdAt').limit(10).find()
    })
    .then((comments) => {
      return { user, post, comments }
    })
}
```

---

# Utilise `async` / `await`

(Je sais, je me répète.)

```js {1-4|8-13}
export async function findAllUsers(query) {
  …
  return ensureAtLeastOne(await User.findAndCountAll())
}

// Sans doute optimisable par eager-loading, mais c'est un autre sujet,
// et on ne fait pas de N+1 en plus ici, alors bon.
async function getUsersLastPost(userId) {
  const user = await User.findByPk(userId)
  const post = await user.posts.sort('-createdAt').findOne()
  const comments = await post.comments.sort('-createdAt').limit(10).find()
  return { user, post, comments }
}
```
---

# Enrobage manuel à tort ou superflu

Alias _« Eeeeh j'ai découvert `Promise.resolve()` et `Promise.reject()` ! »_

```js
async (error) => {
  …
  return Promise.reject(error)
}
```

<v-clicks>

Mais **pourquoi ?!**  Ta fonction `async` enrobe automatiquement son code en promesse. Sers-t'en !

```js
async (error) => {
  …
  throw error
}
```

</v-clicks>

---

# Contre-exemple : enrobage manuel intentionnel

Fonctions non `async` car elles n'utilisent pas `await`, mais censées renvoyer des promesses :

```js {all|2-5|6-9}
http.interceptors.response.use(
  (response) => {
    store.commit('loading/setLoading', false)
    return Promise.resolve(response.data)
  },
  (error) => {
    store.commit('loading/setLoading', false)
    return Promise.reject(error)
  }
)
```

<ul>
  <li v-click='1'>

  Le `Promise.resolve` est plus explicite que de déclarer la fonction `async` avec un `return response.data`.

  </li>
  <li v-click='2'>

  Le `Promise.reject` est plus performant que de déclarer la fonction `async` avec un `throw error`.

  </li>
</ul>


---

# En résumé…

- `async` / `await` est **nettement supérieur** aux chaînes manuelles
- `await` _suspend_, il ne _bloque_ pas.
- `await` est possible en racine de module (_Top-Level Await_, ou TLA) et dans le corps immédiat d'une fonction `async`.
- Toute fonction peut être `async`.
- Les fonctions `async` enrobent implicitement leurs corps comme promesse.
- Tu ne devrais jamais faire un `return await` (ou équivalent) hors d'un `try…catch`

---
layout: center
---

# Viens nous voir !

On est sympas.

Chez [Delicious Insights](https://delicious-insights.com/fr/), on fait des **[formations](https://delicious-insights.com/fr/formations/) qui déchirent tout**, notamment sur [TypeScript](https://delicious-insights.com/fr/formations/typescript/), [100% de JS pur](https://delicious-insights.com/fr/formations/es-total/), [React et les PWA](https://delicious-insights.com/fr/formations/web-apps-modernes/), [Node.js](https://delicious-insights.com/fr/formations/node-js/) et [Git](https://delicious-insights.com/fr/formations/git-total/).

_(Franchement, elles envoient du bois.)_

On peut aussi venir [gronder ton archi / ta codebase](https://delicious-insights.com/fr/services/) (mais gentiment), voire réaliser tes **preuves de concept** pour toi, en mode pas jetable du tout™.


À côté de ça, tu devrais **carrément** t'abonner à notre fabuleuse [chaîne YouTube](), qui déborde de tutos, cours, livestreams, talks en conférences, etc. et c'est évidemment **gratuit** !

---
layout: center
---

# Budget très très serré ?

<div style="display: flex; gap: 2rem; align-items: flex-start;">

<div>

On a une super nouvelle pour toi.  D'ailleurs, je l'annonce *en exclusivité mondiale™* ici à DevFest Lille. 🤘🏻

<v-clicks>

On lance aujourd'hui nos **workshops** : des remixes du meilleur de nos formations sur une seule journée, 100% en ligne et hyper vivants, interactifs et fun, à des **prix extrêmement réduits**, avec jusqu'à 40 personnes.

Ça commence le **13 juillet** prochain, avec notre workshop [**JS Masterclass**](https://bit.ly/js-masterclass) : les parties les plus utiles de notre formation ES Total, à 🎁 **249 € TTC** 🤩 seulement (la formation, sur 3 jours, coûte 1 500 € HT).

Et **jusqu'au 10 juin**, tarif de lancement à **199 € TTC** ! 😍

Tous les détails sont sur [`bit.ly/js-masterclass`](https://bit.ly/js-masterclass).

Réserve ta place dès maintenant, ça va être une énorme tuerie !

</v-clicks>
</div>

<a v-click='2' href="<https://bit.ly/js-masterclass>" style="height: 100%;"><img src="/js-masterclass-og.png" alt="" style="border-radius: 0.5rem"/></a>

</div>

---
layout: cover
background: /jeshoots-com--2vD8lIhdnw-unsplash.jpg
---

# Merci ! 🤗

.

<style>
  .feedback { display: flex; flex-direction: column; gap: 1em; align-items: center; }
  .feedback img {
    max-height: 7em;
    display: block;
  }
  .feedback p { margin: 0; }
</style>

<div class="feedback">

[![](/qrcode.png)](https://openfeedback.io/lSG3Xl5ALpXqswcFPcu2/2023-05-26/5pxZVKMEvMJrKkipl2CD)

[Laisse tes impressions ici !](https://openfeedback.io/lSG3Xl5ALpXqswcFPcu2/2023-05-26/5pxZVKMEvMJrKkipl2CD)  Ça ne prend qu'un instant.

Cette présentation est sur [`bit.ly/async-js-no-cringe`](https://bit.ly/async-js-no-cringe).

[`@porteneuve`](https://twitter.com/porteneuve) / [`@DelicioInsights`](https://twitter.com/DelicioInsights) / [YouTube](https://youtube.com/c/DeliciousInsights)

</div>

<div class="mt-12 text-sm" style="opacity: 0.5">

Crédits : photo de couverture par <a href="https://unsplash.com/@jeshoots?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">JESHOOTS.COM</a> sur <a href="https://unsplash.com/collections/1922461/disappointed?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Unsplash</a>

</div>
