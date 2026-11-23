import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { Fragment, useState } from 'react'
import { euros, periodeFr, type CotisationEtat, type Organisation } from '../api/types'
import { EtiquetteAssociation } from './Etiquette'

const montant = (n: number) => euros(n.toFixed(2))

/** « 12 mois · 1 année » : les cotisations annuelles (01/01 – 31/12) à part des mensuelles. */
function decompte(lignes: CotisationEtat[]) {
  const annee = (c: CotisationEtat) => c.debut.slice(5, 10) === '01-01' && c.fin.slice(5, 10) === '12-31'
  const annees = lignes.filter(annee).length
  const autres = lignes.length - annees
  return [autres && `${autres} mois`, annees && (annees > 1 ? `${annees} années` : lignes.length === 1 ? 'année' : '1 année')]
    .filter(Boolean).join(' · ')
}

function Etat({ du, regle, gratuite }: { du: number, regle: number, gratuite?: boolean }) {
  if (gratuite) return <Chip size="small" variant="outlined" label="gratuite" />
  const reste = du - regle
  return reste <= 0
    ? <Chip size="small" color="success" variant="outlined" label="réglé" />
    : <Chip size="small" color="warning" variant="outlined" label={`reste ${montant(reste)}`} />
}

/**
 * Cotisations d'une fiche, regroupées par année : total dû, réglé ou reste à payer ; un clic sur
 * l'année montre le détail. L'année en cours est ouverte.
 */
export function BlocCotisations({ cotisations, associationDe }: {
  cotisations: CotisationEtat[]
  associationDe: (adhesion: string) => Organisation | undefined
}) {
  const [ouvertes, setOuvertes] = useState<Set<string>>(() => new Set([String(new Date().getFullYear())]))
  const annees = [...new Set(cotisations.map((c) => c.debut.slice(0, 4)))].sort().reverse()
  const basculer = (a: string) => setOuvertes((s) => { const n = new Set(s); if (n.has(a)) n.delete(a); else n.add(a); return n })

  const du = cotisations.reduce((t, c) => t + (c.gratuite ? 0 : Number(c.montant)), 0)
  const regle = cotisations.reduce((t, c) => t + Math.min(Number(c.regle), Number(c.montant)), 0)

  if (cotisations.length === 0) return <Typography color="text.secondary">Aucune cotisation.</Typography>
  return (
    <>
      <Stack direction="row" spacing={2} sx={{ mb: 1, flexWrap: 'wrap', color: 'text.secondary' }}>
        <Typography variant="body2">Dû : <b>{montant(du)}</b></Typography>
        <Typography variant="body2">Réglé : <b>{montant(regle)}</b></Typography>
        {du - regle > 0 && <Typography variant="body2" color="warning.main">Reste : <b>{montant(du - regle)}</b></Typography>}
      </Stack>
      <Table size="small">
        <TableBody>
          {annees.map((annee) => {
            const lignes = cotisations.filter((c) => c.debut.startsWith(annee))
            const duAnnee = lignes.reduce((t, c) => t + (c.gratuite ? 0 : Number(c.montant)), 0)
            const regleAnnee = lignes.reduce((t, c) => t + Math.min(Number(c.regle), Number(c.montant)), 0)
            const associations = [...new Map(lignes.map((c) => associationDe(c.adhesion)).filter((o) => !!o).map((o) => [o!.id, o!])).values()]
            const ouverte = ouvertes.has(annee)
            return (
              <Fragment key={annee}>
                <TableRow hover onClick={() => basculer(annee)} sx={{ cursor: 'pointer', '& td': { fontWeight: 600 } }}>
                  <TableCell sx={{ pl: 0, whiteSpace: 'nowrap' }}>
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      {ouverte ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}{annee}
                      <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                        ({decompte(lignes)})
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Stack direction="row" spacing={0.5}>{associations.map((o) => <EtiquetteAssociation key={o.id} organisation={o} />)}</Stack>
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{montant(duAnnee)}</TableCell>
                  <TableCell align="right" sx={{ pr: 0 }}><Etat du={duAnnee} regle={regleAnnee} gratuite={duAnnee === 0 && lignes.every((c) => c.gratuite)} /></TableCell>
                </TableRow>
                {ouverte && lignes.map((c) => (
                  <TableRow key={c.id} sx={{ '& td': { color: 'text.secondary' } }}>
                    <TableCell sx={{ pl: 3.5, whiteSpace: 'nowrap' }}>{periodeFr(c.debut, c.fin)}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      {c.historique && <Typography variant="caption" color="text.disabled">historique reconstitué</Typography>}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }} title={c.motifGratuite ?? ''}>{c.gratuite ? '—' : euros(c.montant)}</TableCell>
                    <TableCell align="right" sx={{ pr: 0 }}><Etat du={Number(c.montant)} regle={Number(c.regle)} gratuite={c.gratuite} /></TableCell>
                  </TableRow>
                ))}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </>
  )
}
