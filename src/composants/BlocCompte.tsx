import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api, ErreurApi } from '../api/client'
import { useReference } from '../api/reference'
import { dateFr, type Compte, type Expediteur, type Personne } from '../api/types'

const ROLES = [
  { droit: 'comptes:admin', libelle: 'Gérer les comptes', perimetre: false },
  { droit: 'membres:admin', libelle: 'Membres : tous les droits', perimetre: false },
  { droit: 'membres:gestion', libelle: 'Membres : gestion (fiches, adhésions)', perimetre: true },
  { droit: 'membres:accueil', libelle: 'Membres : accueil des événements', perimetre: true },
]

/** Compte de connexion d'une personne : état, ou bouton « Transformer en compte ». */
export function BlocCompte({ personne }: { personne: Personne }) {
  const ref = useReference()
  const [compte, setCompte] = useState<Compte | null | undefined>(undefined)
  const [expediteurs, setExpediteurs] = useState<Expediteur[]>([])
  const [ouvert, setOuvert] = useState(false)
  const [email, setEmail] = useState(personne.email ?? '')
  const [coches, setCoches] = useState<Record<string, string | null>>({})  // droit → périmètre ('' = toutes)
  const [expediteur, setExpediteur] = useState('')
  const [message, setMessage] = useState<{ type: 'ok' | 'erreur', texte: string } | null>(null)
  const [envoi, setEnvoi] = useState(false)

  const charger = useCallback(() => {
    api<Compte[]>('comptes', `/api/comptes?personne=${personne.id}`).then((c) => setCompte(c[0] ?? null)).catch(() => setCompte(null))
  }, [personne.id])
  useEffect(() => {
    charger()
    api<Expediteur[]>('comptes', '/api/expediteurs').then((e) => {
      setExpediteurs(e)
      setExpediteur(e.find((x) => x.par_defaut)?.cle ?? '')
    }).catch(() => {})
  }, [charger])

  const associations = ref?.organisations.filter((o) => o.genre === 'association_jaxaj') ?? []

  async function inviter(e?: FormEvent, renvoi = false) {
    e?.preventDefault()
    setEnvoi(true)
    setMessage(null)
    const droits = renvoi ? [] : Object.entries(coches).map(([d, p]) => (p ? `${d}:${p}` : d))
    try {
      const c = await api<Compte>('comptes', '/api/comptes', {
        methode: 'POST',
        corps: { personne: personne.id, email: renvoi ? compte!.email : email, droits, expediteur: renvoi ? compte!.expediteur : expediteur },
      })
      setCompte(c)
      setOuvert(false)
      setMessage({ type: 'ok', texte: `Invitation envoyée à ${c.email}.` })
    } catch (err) {
      setMessage({ type: 'erreur', texte: (err as ErreurApi).message })
    } finally {
      setEnvoi(false)
    }
  }

  /** « membres:accueil:<uuid> » → « membres:accueil · JaXaJ Productions » */
  const libelleDroit = (d: string) => {
    const [a, r, p] = d.split(':')
    return p ? `${a}:${r} · ${ref?.organisations.find((o) => o.id === p)?.nom ?? p}` : d
  }

  if (compte === undefined) return null

  return (
    <div className="carte">
      <h2>Compte de connexion</h2>
      {message && <p className={message.type === 'ok' ? 'succes' : 'erreur'} role="status">{message.texte}</p>}

      {compte && (
        <>
          <dl className="definitions">
            <dt>E-mail</dt><dd>{compte.email}</dd>
            <dt>État</dt>
            <dd>{!compte.actif ? 'désactivé' : compte.active
              ? `actif${compte.derniere_connexion ? `, dernière connexion le ${dateFr(compte.derniere_connexion)}` : ''}`
              : `invitation envoyée le ${dateFr(compte.invite_le)}, pas encore activé`}</dd>
            <dt>Droits</dt>
            <dd>{compte.droits.length ? compte.droits.map((d) => <code key={d} className="droit">{libelleDroit(d)}</code>) : 'aucun'}</dd>
          </dl>
          {!compte.active && (
            <button className="bouton" disabled={envoi} onClick={() => inviter(undefined, true)}>Renvoyer l'invitation</button>
          )}
        </>
      )}

      {!compte && !ouvert && (
        <>
          <p className="aide">Cette personne n'a pas de compte.</p>
          <button className="bouton bouton-principal" onClick={() => setOuvert(true)}>Transformer en compte</button>
        </>
      )}

      {!compte && ouvert && (
        <form onSubmit={inviter} className="formulaire">
          <label>Adresse e-mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <fieldset>
            <legend>Droits</legend>
            {ROLES.map((r) => (
              <div key={r.droit} className="droit-ligne">
                <label className="case">
                  <input type="checkbox" checked={r.droit in coches}
                    onChange={(e) => setCoches((c) => {
                      const n = { ...c }
                      if (e.target.checked) n[r.droit] = ''
                      else delete n[r.droit]
                      return n
                    })} />
                  {r.libelle}
                </label>
                {r.perimetre && r.droit in coches && (
                  <select value={coches[r.droit] ?? ''} onChange={(e) => {
                    const asso = e.target.value
                    setCoches((c) => ({ ...c, [r.droit]: asso }))
                    // L'invitation part par défaut de l'adresse de l'association concernée.
                    const x = expediteurs.find((x) => x.association === asso)
                    if (x) setExpediteur(x.cle)
                  }}
                    aria-label={`Périmètre : ${r.libelle}`}>
                    <option value="">toutes les associations</option>
                    {associations.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
                  </select>
                )}
              </div>
            ))}
          </fieldset>
          <label>Envoyer l'invitation depuis
            <select value={expediteur} onChange={(e) => setExpediteur(e.target.value)}>
              {expediteurs.map((x) => <option key={x.cle} value={x.cle}>{x.nom} ({x.adresse})</option>)}
            </select>
          </label>
          <p className="aide">La personne reçoit un lien, valable 7 jours, pour choisir son mot de passe.</p>
          <div className="actions">
            <button type="button" className="bouton" onClick={() => setOuvert(false)}>Annuler</button>
            <button className="bouton bouton-principal" disabled={envoi}>{envoi ? 'Envoi…' : 'Créer le compte et envoyer'}</button>
          </div>
        </form>
      )}
    </div>
  )
}
