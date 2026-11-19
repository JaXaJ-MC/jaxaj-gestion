import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Fragment, type ReactNode } from 'react'

/** Liste « libellé : valeur » sur deux colonnes (une seule sur smartphone). */
export function Definitions({ lignes }: { lignes: [string, ReactNode][] }) {
  return (
    <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'max-content 1fr' }, columnGap: 3, rowGap: { xs: 0, sm: 1 }, m: 0 }}>
      {lignes.map(([libelle, valeur]) => (
        <Fragment key={libelle}>
          <Typography component="dt" variant="body2" color="text.secondary" sx={{ pt: { xs: 1, sm: 0 } }}>{libelle}</Typography>
          <Typography component="dd" sx={{ m: 0, whiteSpace: 'pre-wrap' }}>{valeur}</Typography>
        </Fragment>
      ))}
    </Box>
  )
}
