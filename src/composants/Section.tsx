import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

/** Carte titrée de la fiche, avec une action éventuelle à droite du titre. */
export function Section({ titre, action, children }: { titre: string, action?: ReactNode, children: ReactNode }) {
  return (
    <Card>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1.5, minHeight: 32, '& .MuiButton-root': { whiteSpace: 'nowrap' } }}>
          <Typography variant="h2">{titre}</Typography>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  )
}

/** Ligne d'un historique (adhésion, rôle) : en cours, elle est marquée d'un liseré vert. */
export function LigneHistorique({ enCours, children }: { enCours: boolean, children: ReactNode }) {
  return (
    <Stack direction="row" spacing={1} sx={{
      alignItems: 'center', flexWrap: 'wrap', rowGap: 0.6, py: 1.1, pl: enCours ? 1.4 : 0,
      borderLeft: enCours ? '3px solid' : 'none', borderColor: 'primary.main',
      '& + &': { borderTop: '1px solid', borderTopColor: 'divider' },
    }}>
      {children}
    </Stack>
  )
}
