// Ordre de la liste. L'API la renvoie par ordre alphabétique (nom, prénom, surnom, sans accents) :
// son rang sert de dernier critère partout.

import { ROLES, type LigneListe } from './api/types'
import { normaliser } from './texte'

export type Tri = 'auto' | 'nom' | 'surnom' | 'anciennete' | 'completude' | 'cotisation'

export const TRIS: Record<Tri, string> = {
  auto: 'Bureau, puis niveau',
  nom: 'Nom',
  surnom: 'Surnom',
  anciennete: 'Ancienneté full patch',
  completude: 'Fiches à compléter d\'abord',
  cotisation: 'Dernière cotisation, la plus ancienne d\'abord',
}

/**
 * Pertinence d'une fiche pour la recherche : par mot, 3 si un champ (nom, prénom, surnom)
 * commence par lui, 2 si un mot d'un champ commence par lui, 1 s'il apparaît au milieu.
 */
export function pertinence(l: LigneListe, mots: string[]): number {
  const champs = [l.nom, l.prenom, l.surnom].filter((c): c is string => !!c).map(normaliser)
  return mots.reduce((total, m) => total + Math.max(0, ...champs.map((c) =>
    c.startsWith(m) ? 3 : c.split(/[^\p{L}\p{N}]+/u).some((w) => w.startsWith(m)) ? 2 : c.includes(m) ? 1 : 0)), 0)
}

/** Rôles du bureau, dans l'ordre (le représentant n'en fait pas partie). */
const BUREAU = Object.keys(ROLES).filter((r) => r !== 'representant')

/**
 * Rang hiérarchique : le rôle le plus élevé tenu aujourd'hui (président d'abord), puis le niveau
 * le plus élevé parmi les adhésions du mois (dans l'ordre des catégories : full patch d'abord),
 * puis les fiches sans adhésion en cours.
 */
function hierarchie(l: LigneListe, rangNiveau: Map<string, number>): [number, number] {
  const roles = l.roles.map((r) => BUREAU.indexOf(r.role)).filter((i) => i >= 0)
  const niveaux = l.adhesions.map((a) => rangNiveau.get(a.categorie) ?? 98)
  return [roles.length ? Math.min(...roles) : 99, niveaux.length ? Math.min(...niveaux) : 99]
}

const pourcentage = (l: LigneListe) => (l.completude.total - l.completude.manquants.length) / l.completude.total

/** Trie une copie des lignes. En recherche (mots), la pertinence passe d'abord, sauf tri explicite. */
export function trier(lignes: LigneListe[], tri: Tri, mots: string[], categories: string[] = []): LigneListe[] {
  const rangNiveau = new Map(categories.map((c, i) => [c, i]))  // codes dans l'ordre des catégories
  const rangs = new Map(lignes.map((l) => [l.id, hierarchie(l, rangNiveau)]))
  const rang = new Map(lignes.map((l, i) => [l.id, i]))
  const alpha = (a: LigneListe, b: LigneListe) => rang.get(a.id)! - rang.get(b.id)!
  const nullsALaFin = (x: string | null, y: string | null) => (x === y ? 0 : x === null ? 1 : y === null ? -1 : x.localeCompare(y))
  const comparer: Record<Tri, (a: LigneListe, b: LigneListe) => number> = {
    auto: (a, b) => {
      const [x, y] = [rangs.get(a.id)!, rangs.get(b.id)!]
      return (mots.length ? pertinence(b, mots) - pertinence(a, mots) : 0) || x[0] - y[0] || x[1] - y[1]
    },
    nom: () => 0,
    surnom: (a, b) => nullsALaFin(a.surnom && normaliser(a.surnom), b.surnom && normaliser(b.surnom)),
    anciennete: (a, b) => nullsALaFin(a.premier_full_patch, b.premier_full_patch),
    completude: (a, b) => pourcentage(a) - pourcentage(b),
    cotisation: (a, b) => nullsALaFin(a.derniere_cotisation, b.derniere_cotisation),
  }
  return [...lignes].sort((a, b) => comparer[tri](a, b) || alpha(a, b))
}
