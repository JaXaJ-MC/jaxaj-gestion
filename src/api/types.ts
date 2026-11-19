export interface Adresse {
  ligne1: string | null
  ligne2: string | null
  code_postal: string | null
  ville: string | null
  pays: string
}

export interface Personne {
  id: string
  nom: string
  prenom: string | null
  surnom: string | null
  // Présents seulement avec le droit de voir le détail (gestion, admin)
  dateNaissance?: string | null
  commentaire?: string | null
  adresse?: Adresse | null
  telephone?: string | null
  email?: string | null
}

export interface Organisation {
  id: string
  nom: string
  sigle: string | null
  genre: string
  parent: string | null
}

export interface Categorie {
  code: string
  libelle: string
  membreClub: boolean
}

export interface Adhesion {
  id: string
  membre: string
  association: string
  categorie: string
  debut: string
  fin: string | null
  auTitreDe: string | null
  commentaire: string | null
}

export interface Cotisation {
  id: string
  adhesion: string
  debut: string
  fin: string
  montant: string
  gratuite: boolean
  motifGratuite: string | null
}

export interface Acces {
  acces: boolean
  jour: string
  cotisations: { association: string, categorie: string, a_jour: boolean, montant: string, regle: string }[]
}

export interface Compte {
  id: string
  personne: string
  email: string
  actif: boolean
  active: boolean
  invite_le: string | null
  derniere_connexion: string | null
  expediteur: string | null
  droits: string[]
}

export interface Expediteur {
  cle: string
  association: string | null
  adresse: string
  nom: string
  par_defaut: boolean
}

/** « /api/organisations/<uuid> » → « <uuid> » */
export const idDe = (iri: string | null | undefined) => iri?.split('/').pop() ?? ''

/** Date ISO → « 13/03/2027 » */
export const dateFr = (iso: string | null | undefined) => {
  if (!iso) return ''
  const [a, m, j] = iso.slice(0, 10).split('-')
  return `${j}/${m}/${a}`
}

export const nomComplet = (p: Pick<Personne, 'nom' | 'prenom' | 'surnom'>) =>
  [p.prenom, p.nom].filter(Boolean).join(' ') + (p.surnom ? ` « ${p.surnom} »` : '')

/** Période courte : « 01/09 – 30/09/2026 », l'année n'apparaît qu'une fois si elle ne change pas. */
export const periodeFr = (debut: string, fin: string | null) => {
  if (!fin) return `depuis le ${dateFr(debut)}`
  const [d, f] = [dateFr(debut), dateFr(fin)]
  return d.slice(6) === f.slice(6) ? `${d.slice(0, 5)} – ${f}` : `${d} – ${f}`
}

/** Téléphone français à 10 chiffres → « 06 12 34 56 78 » ; les autres restent tels quels. */
export const telephoneFr = (t: string) => (/^0\d{9}$/.test(t) ? t.replace(/(\d{2})(?=\d)/g, '$1 ') : t)

export type StatutMois = 'aucune_adhesion' | 'a_payer' | 'partiel' | 'paye' | 'gratuit' | 'sans_tarif'

/** Ligne de la liste (GET /api/liste) : une personne et l'état de sa cotisation du mois. */
export interface LigneListe {
  id: string
  nom: string
  prenom: string | null
  surnom: string | null
  adhesion: string | null
  association: string | null
  categorie: string | null
  mois: { statut: StatutMois, du: string | null, regle: string | null, reste: string | null }
  derniere_cotisation: string | null
}

/** « 60.00 » → « 60 € », « 7.50 » → « 7,50 € » */
export const euros = (m: string | null) => (m === null ? '' : `${Number(m).toLocaleString('fr-FR', { minimumFractionDigits: Number(m) % 1 ? 2 : 0 })} €`)
