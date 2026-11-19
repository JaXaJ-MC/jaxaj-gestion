import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { aLeDroit, api, ErreurApi } from '../api/client'
import { aujourdhuiIso, dateFr, enCoursLe, idDe, ROLES, type Organisation, type Role } from '../api/types'
import { EtiquetteAssociation } from './Etiquette'

/** Rôles d'une personne (président, trésorier… d'une association) : en cours et passés. */
export function BlocRoles({ personne, organisations }: { personne: string, organisations: Organisation[] }) {
  const [roles, setRoles] = useState<Role[]>([])
  const [ajout, setAjout] = useState(false)
  const [organisation, setOrganisation] = useState('')
  const [role, setRole] = useState('')
  const [debut, setDebut] = useState(aujourdhuiIso)
  const [finPour, setFinPour] = useState<string | null>(null)
  const [fin, setFin] = useState(aujourdhuiIso)
  const [erreur, setErreur] = useState<string | null>(null)
  const peutModifier = aLeDroit('membres', 'admin', 'gestion')
  const aujourdhui = aujourdhuiIso()

  const charger = useCallback(() => {
    api<Role[]>('membres', `/api/roles?personne=${personne}&itemsPerPage=100`)
      .then((r) => setRoles([...r].sort((a, b) => b.debut.localeCompare(a.debut))))
      .catch((e) => setErreur(e.message))
  }, [personne])
  useEffect(charger, [charger])

  // Associations JaXaJ d'abord, puis les autres organisations.
  const triees = [...organisations].sort((a, b) =>
    Number(b.genre === 'association_jaxaj') - Number(a.genre === 'association_jaxaj') || a.nom.localeCompare(b.nom))

  async function envoyer(e: FormEvent, action: () => Promise<unknown>) {
    e.preventDefault()
    setErreur(null)
    try {
      await action()
      setAjout(false)
      setFinPour(null)
      charger()
    } catch (err) {
      setErreur((err as ErreurApi).message)
    }
  }

  return (
    <div className="carte">
      <h2>Rôles</h2>
      {roles.length === 0 && <p className="aide">Aucun rôle.</p>}
      <ul className="historique">
        {roles.map((r) => {
          const enCours = enCoursLe(r.debut, r.fin, aujourdhui)
          return (
            <li key={r.id} className={enCours ? 'en-cours' : ''}>
              <EtiquetteAssociation organisation={organisations.find((o) => o.id === idDe(r.organisation))} />
              <strong>{ROLES[r.role] ?? r.role}</strong>
              <span className="periode">{r.fin ? `du ${dateFr(r.debut)} au ${dateFr(r.fin)}` : `depuis le ${dateFr(r.debut)}`}</span>
              {enCours && peutModifier && finPour !== r.id && (
                <button className="lien-bouton" onClick={() => { setFinPour(r.id); setFin(aujourdhui) }}>Fin de mandat</button>
              )}
              {finPour === r.id && (
                <form className="formulaire-ligne" onSubmit={(e) => envoyer(e, () => api('membres', `/api/roles/${r.id}`, { methode: 'PATCH', corps: { fin } }))}>
                  <label>Dernier jour<input type="date" value={fin} onChange={(e) => setFin(e.target.value)} required /></label>
                  <button className="bouton bouton-principal bouton-petit">Valider</button>
                  <button type="button" className="bouton bouton-petit" onClick={() => setFinPour(null)}>Annuler</button>
                </form>
              )}
            </li>
          )
        })}
      </ul>
      {erreur && <p className="erreur" role="alert">{erreur}</p>}
      {peutModifier && !ajout && <button className="bouton" onClick={() => setAjout(true)}>Attribuer un rôle</button>}
      {ajout && (
        <form className="formulaire" onSubmit={(e) => envoyer(e, () => api('membres', '/api/roles', {
          methode: 'POST',
          corps: { personne: `/api/personnes/${personne}`, organisation: `/api/organisations/${organisation}`, role, debut },
        }))}>
          <div className="grille">
            <label>Rôle
              <select value={role} onChange={(e) => setRole(e.target.value)} required>
                <option value="" disabled>Choisir…</option>
                {Object.entries(ROLES).map(([code, libelle]) => <option key={code} value={code}>{libelle}</option>)}
              </select>
            </label>
            <label>Association
              <select value={organisation} onChange={(e) => setOrganisation(e.target.value)} required>
                <option value="" disabled>Choisir…</option>
                {triees.map((o) => <option key={o.id} value={o.id}>{o.nom}</option>)}
              </select>
            </label>
            <label>Depuis le<input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} required /></label>
          </div>
          <p className="aide">Une seule personne à la fois par rôle et par association (sauf « représentant ») : terminez d'abord le mandat en cours.</p>
          <div className="actions">
            <button type="button" className="bouton" onClick={() => setAjout(false)}>Annuler</button>
            <button className="bouton bouton-principal">Attribuer</button>
          </div>
        </form>
      )}
    </div>
  )
}
