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
  detail?: boolean  // présent quand les coordonnées sont visibles (et la fiche modifiable)
}

export interface Organisation {
  id: string
  nom: string
  sigle: string | null
  genre: string
  parent: string | null
  volet?: 'club' | 'evenementiel' | null  // associations JaXaJ
}

export interface Categorie {
  code: string
  libelle: string
  membreClub: boolean
  volet: 'club' | 'evenementiel'  // club : mère et chapitres ; evenementiel : Productions
  cotisation: 'periodique' | 'ponctuelle' | 'aucune'
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
  exemption: string | null  // motif d'exemption de cotisation
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

/** Cotisation avec ce qui en est réglé (GET /api/personnes/{id}/cotisations). */
export interface CotisationEtat extends Cotisation {
  regle: string
  aJour: boolean
  calculee: boolean        // créée par « Calculer les cotisations »
  historique: boolean | null  // réglée par un paiement « Historique reconstitué »
}

export interface Tarif {
  id: string
  categorie: string        // IRI
  association: string | null  // IRI ; vide = toutes les associations
  periodicite: 'mensuelle' | 'annuelle' | 'ponctuelle'
  montant: string
  debut: string
  fin: string | null
  decision: string | null
}

export const PERIODICITES: Record<Tarif['periodicite'], string> = { mensuelle: 'par mois', annuelle: 'par an', ponctuelle: 'ponctuel' }

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
  roles: { role: string, organisation: string }[]
  adhesions: { association: string, categorie: string }[]  // toutes celles du mois
}

/** « 60.00 » → « 60 € », « 7.50 » → « 7,50 € » */
export const euros = (m: string | null) => (m === null ? '' : `${Number(m).toLocaleString('fr-FR', { minimumFractionDigits: Number(m) % 1 ? 2 : 0 })} €`)

export interface Role {
  id: string
  personne: string
  organisation: string
  role: string
  debut: string
  fin: string | null
}

export const ROLES: Record<string, string> = {
  president: 'Président(e)',
  vice_president: 'Vice-président(e)',
  tresorier: 'Trésorier(ère)',
  secretaire: 'Secrétaire',
  sergent_armes: 'Sergent d\'armes',
  chef_de_file: 'Chef de file',
  representant: 'Représentant(e)',
}

/** Aujourd'hui, au format AAAA-MM-JJ (heure locale). */
export const aujourdhuiIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Une période (début, fin inclus, fin vide = en cours) couvre-t-elle cette date ? */
export const enCoursLe = (debut: string, fin: string | null, jour: string) =>
  debut.slice(0, 10) <= jour && (!fin || fin.slice(0, 10) >= jour)
