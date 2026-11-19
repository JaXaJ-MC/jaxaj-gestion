import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { deconnexion } from '../api/client'
import { useSession } from '../api/session'
import { Logo } from './Embleme'

export function Cadre() {
  const { utilisateur } = useSession()
  const naviguer = useNavigate()
  return (
    <div className="cadre">
      <header className="entete">
        <Link to="/" className="entete-logo"><Logo /></Link>
        <nav>
          <NavLink to="/" end>Liste</NavLink>
          <NavLink to="/personnes/nouvelle">Nouvelle fiche</NavLink>
        </nav>
        <div className="entete-compte">
          <span className="entete-email">{utilisateur?.username}</span>
          <button className="lien-discret" onClick={async () => { await deconnexion(); naviguer('/connexion') }}>
            Déconnexion
          </button>
        </div>
      </header>
      <main className="contenu"><Outlet /></main>
    </div>
  )
}
