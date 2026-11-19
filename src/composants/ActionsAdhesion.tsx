import { useState, type FormEvent } from 'react'
import { api, ErreurApi } from '../api/client'
import { aujourdhuiIso, idDe, type Adhesion, type Categorie } from '../api/types'
import { ChampDate } from './ChampDate'

/** Sur une adhésion en cours : changer de niveau (suiveur → full patch…) ou la clore. */
export function ActionsAdhesion({ adhesion, categories, apres }: { adhesion: Adhesion, categories: Categorie[], apres: () => void }) {
  const [mode, setMode] = useState<'changer' | 'clore' | null>(null)
  const [categorie, setCategorie] = useState('')
  const [date, setDate] = useState(aujourdhuiIso)
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  async function valider(e: FormEvent) {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)
    try {
      if (mode === 'changer') {
        await api('membres', `/api/adhesions/${adhesion.id}/changement`, { methode: 'POST', corps: { categorie, date } })
      } else {
        await api('membres', `/api/adhesions/${adhesion.id}`, { methode: 'PATCH', corps: { fin: date } })
      }
      setMode(null)
      apres()
    } catch (err) {
      setErreur((err as ErreurApi).message)
    } finally {
      setEnvoi(false)
    }
  }

  if (!mode) {
    return (
      <span className="actions-ligne">
        <button className="lien-bouton" onClick={() => setMode('changer')}>Changer de niveau</button>
        <button className="lien-bouton" onClick={() => setMode('clore')}>Clore</button>
      </span>
    )
  }
  return (
    <form className="formulaire-ligne" onSubmit={valider}>
      {mode === 'changer' && (
        <label>Nouveau niveau
          <select value={categorie} onChange={(e) => setCategorie(e.target.value)} required>
            <option value="" disabled>Choisir…</option>
            {categories.filter((c) => c.code !== idDe(adhesion.categorie)).map((c) => <option key={c.code} value={c.code}>{c.libelle}</option>)}
          </select>
        </label>
      )}
      <ChampDate libelle={mode === 'changer' ? 'À partir du' : 'Dernier jour'} valeur={date} changer={setDate} requis />
      <button className="bouton bouton-principal bouton-petit" disabled={envoi}>{mode === 'changer' ? 'Changer' : 'Clore'}</button>
      <button type="button" className="bouton bouton-petit" onClick={() => setMode(null)}>Annuler</button>
      {erreur && <p className="erreur">{erreur}</p>}
    </form>
  )
}
