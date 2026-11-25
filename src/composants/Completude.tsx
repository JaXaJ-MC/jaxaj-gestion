import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

/** Ce qui manque à une fiche (voir Completude côté API) : codes et libellés. */
export interface Completude { manquants: string[], total: number }

export const MANQUANTS: Record<string, string> = {
  prenom: 'prénom',
  surnom: 'surnom',
  naissance: 'date de naissance',
  telephone: 'téléphone',
  email: 'e-mail',
  contact: 'téléphone ou e-mail',
  adresse: 'adresse',
  adhesion: 'adhésion',
  cotisations: 'cotisations (à calculer)',
}

export const pourcentage = (c: Completude) => Math.round(100 * (c.total - c.manquants.length) / c.total)
export const manquantsFr = (c: Completude) => c.manquants.map((m) => MANQUANTS[m] ?? m).join(', ')
const couleur = (p: number) => (p === 100 ? 'success' : p >= 60 ? 'warning' : 'error')

/** Anneau de complétude, avec ce qui manque au survol. */
export function AnneauCompletude({ completude, taille = 28 }: { completude: Completude, taille?: number }) {
  const p = pourcentage(completude)
  return (
    <Tooltip title={p === 100 ? 'Fiche complète' : `Fiche complète à ${p} % · manque : ${manquantsFr(completude)}`}>
      <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }} aria-label={`Fiche complète à ${p} %`}>
        <CircularProgress variant="determinate" value={100} size={taille} thickness={4} sx={{ color: 'action.hover', position: 'absolute' }} />
        <CircularProgress variant="determinate" value={p} size={taille} thickness={4} color={couleur(p)} />
        <Typography component="span" sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: taille * 0.32, fontWeight: 600 }}>
          {p}
        </Typography>
      </Box>
    </Tooltip>
  )
}
