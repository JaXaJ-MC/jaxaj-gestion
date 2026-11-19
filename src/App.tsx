import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { FournisseurSession, useSession } from './api/session'
import { Cadre } from './composants/Cadre'
import { Connexion } from './pages/Connexion'
import { Recherche } from './pages/Recherche'

// Fiche et formulaires (avec le calendrier, lourd) chargés à la demande : la liste reste légère.
const Fiche = lazy(() => import('./pages/Fiche').then((m) => ({ default: m.Fiche })))
const FormulairePersonne = lazy(() => import('./pages/FormulairePersonne').then((m) => ({ default: m.FormulairePersonne })))
const Tarifs = lazy(() => import('./pages/Tarifs').then((m) => ({ default: m.Tarifs })))
const FormulaireAdhesion = lazy(() => import('./pages/FormulaireAdhesion').then((m) => ({ default: m.FormulaireAdhesion })))

const attente = <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '40vh' }}><CircularProgress /></Box>

/** Pages réservées aux personnes connectées. */
function Protege() {
  const { utilisateur, pret } = useSession()
  const lieu = useLocation()
  if (!pret) return <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}><CircularProgress /></Box>
  if (!utilisateur) return <Navigate to="/connexion" replace state={{ depuis: lieu.pathname }} />
  if (!utilisateur.droits.some((d) => d.startsWith('membres:'))) {
    return <Alert severity="warning" sx={{ m: 3 }}>Votre compte n'a aucun droit sur les membres.</Alert>
  }
  return <Suspense fallback={attente}><Outlet /></Suspense>
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
              <Route path="tarifs" element={<Tarifs />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </FournisseurSession>
  )
}
