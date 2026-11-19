import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { api } from '../api/client'
import { nomComplet, type Personne } from '../api/types'

/** Écran principal : retrouver vite une personne (pensé pour l'accueil, sur smartphone). */
export function Recherche() {
  const [params, setParams] = useSearchParams()
  const [saisie, setSaisie] = useState(params.get('q') ?? '')
  const [resultats, setResultats] = useState<Personne[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    const q = saisie.trim()
    const minuterie = setTimeout(() => {
      setParams(q ? { q } : {}, { replace: true })
      if (q.length < 2) {
        setResultats(null)
        return
      }
      api<Personne[]>('membres', `/api/personnes?q=${encodeURIComponent(q)}&itemsPerPage=50`)
        .then((r) => { setResultats(r); setErreur(null) })
        .catch((e) => setErreur(e.message))
    }, 250)
    return () => clearTimeout(minuterie)
  }, [saisie, setParams])

  return (
    <section>
      <div className="recherche">
        <input
          type="search"
          className="recherche-champ"
          placeholder="Nom, prénom ou surnom…"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          autoFocus
          aria-label="Rechercher une personne"
        />
      </div>
      {erreur && <p className="erreur" role="alert">{erreur}</p>}
      {resultats === null && !erreur && (
        <p className="aide">Tapez au moins deux lettres. Les accents et les majuscules n'ont pas d'importance.</p>
      )}
      {resultats?.length === 0 && (
        <div className="carte vide">
          <p>Personne ne correspond à « {saisie} ».</p>
          <Link className="bouton bouton-principal" to={`/personnes/nouvelle?nom=${encodeURIComponent(saisie)}`}>
            Créer une fiche
          </Link>
        </div>
      )}
      {!!resultats?.length && (
        <ul className="liste">
          {resultats.map((p) => (
            <li key={p.id}>
              <Link to={`/personnes/${p.id}`} className="liste-ligne">
                <span className="liste-nom">{nomComplet(p)}</span>
                <span className="chevron" aria-hidden="true">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {resultats?.length === 50 && <p className="aide">50 premiers résultats : précisez la recherche.</p>}
    </section>
  )
}
