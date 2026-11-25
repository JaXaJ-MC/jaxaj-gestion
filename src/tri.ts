// Ordre de la liste. L'API la renvoie par ordre alphabétique (nom, prénom, surnom, sans accents) :
// son rang sert de dernier critère partout.

import type { LigneListe } from './api/types'
import { normaliser } from './texte'

export type Tri = 'auto' | 'nom' | 'surnom' | 'anciennete' | 'completude' | 'cotisation'

export const TRIS: Record<Tri, string> = {
  auto: 'Adhésions en cours d\'abord',
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

const pourcentage = (l: LigneListe) => (l.completude.total - l.completude.manquants.length) / l.completude.total

/** Trie une copie des lignes. En recherche (mots), la pertinence passe d'abord, sauf tri explicite. */
export function trier(lignes: LigneListe[], tri: Tri, mots: string[]): LigneListe[] {
  const rang = new Map(lignes.map((l, i) => [l.id, i]))
  const alpha = (a: LigneListe, b: LigneListe) => rang.get(a.id)! - rang.get(b.id)!
  const nullsALaFin = (x: string | null, y: string | null) => (x === y ? 0 : x === null ? 1 : y === null ? -1 : x.localeCompare(y))
  const comparer: Record<Tri, (a: LigneListe, b: LigneListe) => number> = {
    auto: (a, b) => (mots.length ? pertinence(b, mots) - pertinence(a, mots) : 0) || Number(!!b.adhesion) - Number(!!a.adhesion),
    nom: () => 0,
    surnom: (a, b) => nullsALaFin(a.surnom && normaliser(a.surnom), b.surnom && normaliser(b.surnom)),
    anciennete: (a, b) => nullsALaFin(a.premier_full_patch, b.premier_full_patch),
    completude: (a, b) => pourcentage(a) - pourcentage(b),
    cotisation: (a, b) => nullsALaFin(a.derniere_cotisation, b.derniere_cotisation),
  }
  return [...lignes].sort((a, b) => comparer[tri](a, b) || alpha(a, b))
}
