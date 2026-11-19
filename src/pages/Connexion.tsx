import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { connexion } from '../api/client'
import { useSession } from '../api/session'
import { Logo } from '../composants/Embleme'

export function Connexion() {
  const { utilisateur } = useSession()
  const naviguer = useNavigate()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  if (utilisateur) return <Navigate to="/" replace />

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)
    try {
      await connexion(email, motDePasse)
      naviguer('/')
    } catch (err) {
      setErreur((err as Error).message)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div className="page-connexion">
      <form className="carte carte-connexion" onSubmit={soumettre}>
        <div className="connexion-logo"><Logo /></div>
        <h1>Gestion du club</h1>
        <label>E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" autoFocus />
        </label>
        <label>Mot de passe
          <input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required autoComplete="current-password" />
        </label>
        {erreur && <p className="erreur" role="alert">{erreur}</p>}
        <button className="bouton bouton-principal" disabled={envoi}>{envoi ? 'Connexion…' : 'Se connecter'}</button>
        <a className="lien" href="/comptes/compte/mot-de-passe-oublie">Mot de passe oublié ?</a>
      </form>
    </div>
  )
}
