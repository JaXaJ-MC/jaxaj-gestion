// Temps de full patch et anniversaire du premier passage full patch.
//
// Les adhésions full patch, toutes associations confondues (JaXaJ MC puis un chapitre…), sont
// fusionnées quand elles se suivent ou se recouvrent : un passage de la mère au Béarn ne coupe
// pas le compteur. Une interruption, si : le temps cumulé est alors la somme des périodes.

export interface Duree { annees: number, mois: number, jours: number }

const jour = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`)
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const lendemain = (s: string) => { const d = jour(s); d.setDate(d.getDate() + 1); return iso(d) }

/** Écart calendaire entre deux dates (la seconde exclue) : 17/10/2009 → 25/11/2026 = 17 ans 1 mois 8 jours. */
export function ecart(debut: string, finExclue: string): Duree {
  const [a, b] = [jour(debut), jour(finExclue)]
  let annees = b.getFullYear() - a.getFullYear()
  let mois = b.getMonth() - a.getMonth()
  let jours = b.getDate() - a.getDate()
  if (jours < 0) {
    mois -= 1
    jours += new Date(b.getFullYear(), b.getMonth(), 0).getDate()  // longueur du mois précédent
  }
  if (mois < 0) {
    annees -= 1
    mois += 12
  }
  return { annees, mois, jours }
}

function ajouter(x: Duree, y: Duree): Duree {
  let jours = x.jours + y.jours
  let mois = x.mois + y.mois + Math.floor(jours / 30)
  jours %= 30
  const annees = x.annees + y.annees + Math.floor(mois / 12)
  mois %= 12
  return { annees, mois, jours }
}

export const dureeFr = (d: Duree) => [
  d.annees && `${d.annees} an${d.annees > 1 ? 's' : ''}`,
  d.mois && `${d.mois} mois`,
  (d.jours || (!d.annees && !d.mois)) && `${d.jours} jour${d.jours > 1 ? 's' : ''}`,
].filter(Boolean).join(' ')

export interface FullPatch {
  premier: string            // date du premier passage full patch
  duree: Duree               // temps cumulé jusqu'à aujourd'hui
  periodes: number           // nombre de périodes, après fusion (1 = sans interruption)
  enCours: boolean
  anniversaire: { date: string, annees: number, dansJours: number }  // prochain (ou aujourd'hui)
}

/** null si la personne n'a jamais été full patch. */
export function fullPatch(adhesions: { categorie: string, debut: string, fin: string | null }[], aujourdhui: string): FullPatch | null {
  const adh = adhesions.filter((a) => a.categorie.endsWith('full_patch') && a.debut.slice(0, 10) <= aujourdhui)
  // Fin exclue : lendemain du dernier jour d'une adhésion close, aujourd'hui pour une en cours.
  const fp = adh
    .map((a) => ({ debut: a.debut.slice(0, 10), fin: a.fin && a.fin.slice(0, 10) < aujourdhui ? lendemain(a.fin) : aujourdhui }))
    .sort((a, b) => a.debut.localeCompare(b.debut))
  if (!fp.length) return null

  const fusion: { debut: string, fin: string }[] = []
  for (const p of fp) {
    const der = fusion[fusion.length - 1]
    if (der && p.debut <= der.fin) der.fin = p.fin > der.fin ? p.fin : der.fin
    else fusion.push({ ...p })
  }
  const duree = fusion.reduce((t, p) => ajouter(t, ecart(p.debut, p.fin)), { annees: 0, mois: 0, jours: 0 })

  const premier = fusion[0].debut
  const [a, m, j] = premier.split('-').map(Number)
  const annee = Number(aujourdhui.slice(0, 4))
  let date = iso(new Date(annee, m - 1, j, 12))
  if (date < aujourdhui) date = iso(new Date(annee + 1, m - 1, j, 12))
  const dansJours = Math.round((jour(date).getTime() - jour(aujourdhui).getTime()) / 86_400_000)
  return {
    premier, duree, periodes: fusion.length, enCours: adh.some((a) => !a.fin || a.fin.slice(0, 10) >= aujourdhui),
    anniversaire: { date, annees: Number(date.slice(0, 4)) - a, dansJours },
  }
}
