// Filtres de la liste, posés comme des pastilles dans la barre de recherche.
//
// Règle : les pastilles d'un même type s'ajoutent (OU), les types se combinent (ET).
// « Béarn, Euskadi, Full patch, Observateur » = full patch ou observateur, au Béarn ou à Euskadi,
// sur une même adhésion du mois. Un rôle avec des associations : rôle tenu dans l'une d'elles.

import type { LigneListe } from './api/types'

export type TypeJeton = 'etat' | 'association' | 'niveau' | 'role'

export interface Jeton {
  type: TypeJeton
  valeur: string   // code ou UUID
  libelle: string
}

export const TYPES: Record<TypeJeton, string> = {
  etat: 'État',
  association: 'Association',
  niveau: 'Niveau',
  role: 'Rôle',
}

export const ETATS: Record<string, string> = {
  en_cours: 'Adhésion en cours',
  a_payer: 'À payer ce mois-ci',
  a_jour: 'À jour ce mois-ci',
  anniversaire_fp: 'Anniversaire full patch ce mois-ci',
  incomplete: 'Fiche incomplète',
}

const aPayer = (l: LigneListe) => l.mois.statut === 'a_payer' || l.mois.statut === 'partiel'

/** Full patch en ce moment, et premier passage full patch fêté ce mois-ci : nombre d'années, sinon null. */
export function anniversaireFullPatch(l: LigneListe, aujourdhui = new Date()): number | null {
  if (!l.premier_full_patch || !l.adhesions.some((a) => a.categorie === 'full_patch')) return null
  const [a, m] = l.premier_full_patch.split('-').map(Number)
  const annees = aujourdhui.getFullYear() - a
  return m === aujourdhui.getMonth() + 1 && annees > 0 ? annees : null
}

/** « association:uuid,niveau:full_patch » ↔ jetons (libellés retrouvés dans les options). */
export const versAdresse = (jetons: Jeton[]) => jetons.map((j) => `${j.type}:${j.valeur}`).join(',')
export function depuisAdresse(texte: string | null, options: Jeton[]): Jeton[] {
  return (texte ?? '').split(',').filter(Boolean)
    .map((t) => options.find((o) => `${o.type}:${o.valeur}` === t))
    .filter((j): j is Jeton => !!j)
}

/** La personne correspond-elle aux pastilles ? Rend aussi l'adhésion retenue, à afficher. */
export function filtrer(l: LigneListe, jetons: Jeton[]): { ok: boolean, adhesion?: LigneListe['adhesions'][number] } {
  const de = (t: TypeJeton) => jetons.filter((j) => j.type === t).map((j) => j.valeur)
  const [etats, associations, niveaux, roles] = [de('etat'), de('association'), de('niveau'), de('role')]

  if (etats.includes('en_cours') && !l.adhesion) return { ok: false }
  if (etats.includes('a_payer') && !aPayer(l)) return { ok: false }
  if (etats.includes('a_jour') && l.mois.statut !== 'paye' && l.mois.statut !== 'gratuit') return { ok: false }
  if (etats.includes('anniversaire_fp') && anniversaireFullPatch(l) === null) return { ok: false }
  if (etats.includes('incomplete') && !l.completude.manquants.length) return { ok: false }

  if (roles.length && !l.roles.some((r) => roles.includes(r.role) && (!associations.length || associations.includes(r.organisation)))) {
    return { ok: false }
  }
  // Associations seules avec un rôle : c'est le rôle qui les porte. Sinon, une adhésion du mois.
  const surAdhesion = niveaux.length > 0 || (associations.length > 0 && roles.length === 0)
  if (!surAdhesion) return { ok: true }
  const adhesion = l.adhesions.find((a) =>
    (!associations.length || associations.includes(a.association)) && (!niveaux.length || niveaux.includes(a.categorie)))
  return { ok: !!adhesion, adhesion }
}
