import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { FournisseurSession, useSession } from './api/session'
import { Cadre } from './composants/Cadre'
import { Connexion } from './pages/Connexion'
import { Fiche } from './pages/Fiche'
import { FormulaireAdhesion } from './pages/FormulaireAdhesion'
import { FormulairePersonne } from './pages/FormulairePersonne'
import { Recherche } from './pages/Recherche'

/** Pages réservées aux personnes connectées. */
function Protege() {
  const { utilisateur, pret } = useSession()
  const lieu = useLocation()
  if (!pret) return <p className="aide centre">Chargement…</p>
  if (!utilisateur) return <Navigate to="/connexion" replace state={{ depuis: lieu.pathname }} />
  if (!utilisateur.droits.some((d) => d.startsWith('membres:'))) {
    return <p className="erreur centre">Votre compte n'a aucun droit sur les membres.</p>
  }
  return <Outlet />
}

export default function App() {
  return (
    <FournisseurSession>
      <BrowserRouter>
        <Routes>
          <Route path="/connexion" element={<Connexion />} />
          <Route element={<Protege />}>
            <Route element={<Cadre />}>
              <Route index element={<Recherche />} />
              <Route path="personnes/nouvelle" element={<FormulairePersonne />} />
              <Route path="personnes/:id" element={<Fiche />} />
              <Route path="personnes/:id/modifier" element={<FormulairePersonne />} />
              <Route path="personnes/:id/adhesion" element={<FormulaireAdhesion />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </FournisseurSession>
  )
}
