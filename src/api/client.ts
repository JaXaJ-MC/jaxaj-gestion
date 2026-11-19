// Accès aux API du club. Le JWT d'accès reste en mémoire (jamais dans le stockage du
// navigateur) ; le jeton de renouvellement est un cookie HttpOnly posé par l'appli comptes.

export type Application = 'comptes' | 'membres'

export interface ContenuJeton {
  username: string
  compte: string
  personne: string
  droits: string[]
  exp: number
}

let jeton: string | null = null
let contenu: ContenuJeton | null = null
let renouvellementEnCours: Promise<boolean> | null = null
const abonnes = new Set<(c: ContenuJeton | null) => void>()

export class ErreurApi extends Error {
  statut: number
  details: Record<string, string>
  constructor(statut: number, message: string, details: Record<string, string> = {}) {
    super(message)
    this.statut = statut
    this.details = details
  }
}

function decoder(jwt: string): ContenuJeton {
  const base64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  const json = decodeURIComponent(
    atob(base64).split('').map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
  )
  return JSON.parse(json)
}

function definirJeton(nouveau: string | null) {
  jeton = nouveau
  contenu = nouveau ? decoder(nouveau) : null
  abonnes.forEach((f) => f(contenu))
}

export function surChangementDeSession(f: (c: ContenuJeton | null) => void) {
  abonnes.add(f)
  return () => abonnes.delete(f)
}

export function session(): ContenuJeton | null {
  return contenu
}

export async function connexion(email: string, motDePasse: string): Promise<void> {
  const reponse = await fetch('/comptes/api/connexion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ email, mot_de_passe: motDePasse }),
  })
  const corps = await reponse.json().catch(() => ({}))
  if (!reponse.ok) {
    throw new ErreurApi(reponse.status, reponse.status === 429
      ? 'Trop de tentatives : réessayez dans un quart d\'heure.'
      : corps.message === 'Invalid credentials.' ? 'E-mail ou mot de passe incorrect.' : corps.message ?? 'Connexion impossible.')
  }
  definirJeton(corps.token)
}

/** Nouveau JWT grâce au cookie de renouvellement. Une seule demande à la fois. */
export function renouveler(): Promise<boolean> {
  renouvellementEnCours ??= fetch('/comptes/api/connexion/renouveler', { method: 'POST', credentials: 'same-origin' })
    .then(async (r) => {
      if (!r.ok) {
        definirJeton(null)
        return false
      }
      definirJeton((await r.json()).token)
      return true
    })
    .catch(() => false)
    .finally(() => { renouvellementEnCours = null })
  return renouvellementEnCours
}

export async function deconnexion(): Promise<void> {
  await fetch('/comptes/api/connexion/deconnexion', { method: 'POST', credentials: 'same-origin' }).catch(() => {})
  definirJeton(null)
}

/**
 * Appel à une API. chemin : « /api/… » (tel que renvoyé dans les IRI). Renouvelle le JWT s'il
 * expire dans moins d'une minute ou si l'API répond 401.
 */
export async function api<T>(app: Application, chemin: string, options: { methode?: string, corps?: unknown } = {}): Promise<T> {
  if (contenu && contenu.exp * 1000 - Date.now() < 60_000) {
    await renouveler()
  }
  const envoyer = () => fetch(`/${app}${chemin}`, {
    method: options.methode ?? 'GET',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
      ...(options.corps !== undefined
        ? { 'Content-Type': options.methode === 'PATCH' ? 'application/merge-patch+json' : 'application/json' }
        : {}),
    },
    body: options.corps !== undefined ? JSON.stringify(options.corps) : undefined,
  })
  let reponse = await envoyer()
  if (reponse.status === 401 && await renouveler()) {
    reponse = await envoyer()
  }
  const texte = await reponse.text()
  const corps = texte ? JSON.parse(texte) : null
  if (!reponse.ok) {
    const details: Record<string, string> = {}
    for (const v of corps?.violations ?? []) {
      details[v.propertyPath] = v.message
    }
    throw new ErreurApi(reponse.status, corps?.detail ?? corps?.erreur ?? corps?.message ?? `Erreur ${reponse.status}`, details)
  }
  return corps as T
}

/** L'utilisateur connecté a-t-il ce droit (« application:role », périmètre éventuel compris) ? */
export function aLeDroit(application: string, ...roles: string[]): boolean {
  return (contenu?.droits ?? []).some((d) => {
    const [a, r] = d.split(':')
    return a === application && roles.includes(r)
  })
}
