// Recherche sans accents ni majuscules, et surlignage des passages trouvés dans le texte
// d'origine (accents compris).

/** Un caractère sans accent, en minuscule : « É » → « e ». Garde la correspondance des positions. */
const sansAccent = (c: string) => c.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export const normaliser = (texte: string) => Array.from(texte, sansAccent).join('')

/** Mots de la recherche, normalisés. */
export const termes = (recherche: string) => normaliser(recherche).split(/[^\p{L}\p{N}]+/u).filter(Boolean)

/** Tous les termes apparaissent-ils dans le texte ? */
export const correspond = (texte: string, mots: string[]) => {
  const n = normaliser(texte)
  return mots.every((m) => n.includes(m))
}

/** Découpe le texte en morceaux, surlignés là où un terme apparaît. */
export function decouper(texte: string, mots: string[]): { texte: string, trouve: boolean }[] {
  if (!mots.length) return [{ texte, trouve: false }]
  const caracteres = Array.from(texte)
  const normalises = caracteres.map(sansAccent)
  // position dans le texte normalisé → indice du caractère d'origine
  const origine: number[] = []
  normalises.forEach((n, i) => { for (let k = 0; k < n.length; k++) origine.push(i) })
  const n = normalises.join('')
  const marque = new Array(caracteres.length).fill(false)
  for (const m of mots) {
    for (let p = n.indexOf(m); p !== -1; p = n.indexOf(m, p + 1)) {
      for (let k = p; k < p + m.length; k++) marque[origine[k]] = true
    }
  }
  const morceaux: { texte: string, trouve: boolean }[] = []
  caracteres.forEach((c, i) => {
    const dernier = morceaux[morceaux.length - 1]
    if (dernier && dernier.trouve === marque[i]) dernier.texte += c
    else morceaux.push({ texte: c, trouve: marque[i] })
  })
  return morceaux
}
