import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { aLeDroit, api, ErreurApi } from '../api/client'
import { useReference } from '../api/reference'
import { nomComplet, type Personne } from '../api/types'

/** Nouvelle adhésion pour une personne. L'accueil ne propose que « adhérent événement ». */
export function FormulaireAdhesion() {
  const { id } = useParams()
  const naviguer = useNavigate()
  const ref = useReference()
  const [personne, setPersonne] = useState<Personne | null>(null)
  const accueilSeul = !aLeDroit('membres', 'admin', 'gestion')
  const [association, setAssociation] = useState('')
  const [categorie, setCategorie] = useState(accueilSeul ? 'public' : '')
  const [debut, setDebut] = useState(() => new Date().toISOString().slice(0, 10))
  const [fin, setFin] = useState('')
  const [auTitreDe, setAuTitreDe] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => { api<Personne>('membres', `/api/personnes/${id}`).then(setPersonne).catch((e) => setErreur(e.message)) }, [id])

  const associations = ref?.organisations.filter((o) => o.genre === 'association_jaxaj') ?? []
  const autres = ref?.organisations.filter((o) => o.genre !== 'association_jaxaj') ?? []
  const categories = (ref?.categories ?? []).filter((c) => !accueilSeul || c.code === 'public')

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)
    try {
      await api('membres', '/api/adhesions', {
        methode: 'POST',
        corps: {
          membre: `/api/personnes/${id}`, association: `/api/organisations/${association}`, categorie: `/api/categories/${categorie}`,
          debut, fin: fin || null, auTitreDe: auTitreDe ? `/api/organisations/${auTitreDe}` : null,
        },
      })
      naviguer(`/personnes/${id}`)
    } catch (err) {
      setErreur((err as ErreurApi).message)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <section>
      <h1>Nouvelle adhésion{personne && <small> — {nomComplet(personne)}</small>}</h1>
      <form className="carte formulaire" onSubmit={soumettre}>
        <label>Association *
          <select value={association} onChange={(e) => setAssociation(e.target.value)} required>
            <option value="" disabled>Choisir…</option>
            {associations.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
          </select>
        </label>
        <label>Catégorie *
          <select value={categorie} onChange={(e) => setCategorie(e.target.value)} required>
            <option value="" disabled>Choisir…</option>
            {categories.map((c) => <option key={c.code} value={c.code}>{c.libelle}</option>)}
          </select>
        </label>
        <div className="grille">
          <label>Début *<input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} required /></label>
          <label>Fin (incluse, vide = en cours)<input type="date" value={fin} onChange={(e) => setFin(e.target.value)} /></label>
        </div>
        {autres.length > 0 && (
          <label>Au titre de (club ou association représenté)
            <select value={auTitreDe} onChange={(e) => setAuTitreDe(e.target.value)}>
              <option value="">—</option>
              {autres.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
            </select>
          </label>
        )}
        {erreur && <p className="erreur" role="alert">{erreur}</p>}
        <div className="actions">
          <button type="button" className="bouton" onClick={() => naviguer(-1)}>Annuler</button>
          <button className="bouton bouton-principal" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </section>
  )
}
