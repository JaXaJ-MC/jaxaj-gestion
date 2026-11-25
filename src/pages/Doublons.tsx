import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState } from 'react'
import { Link as LienRouteur } from 'react-router'
import { aLeDroit, api, ErreurApi } from '../api/client'
import { dateFr, libelleDisparu, telephoneFr, TYPES_FICHE, type TypeFiche } from '../api/types'

interface Fiche {
  id: string, nom: string, prenom: string | null, surnom: string | null, type: TypeFiche, statut: 'actif' | 'disparu'
  naissance: string | null, cree_le: string, telephone: string | null, email: string | null, ville: string | null
  adhesions: number, cotisations: number, roles: number, associations: string[]
}
interface Groupe { raisons: string[], fiches: Fiche[] }

const RAISONS: Record<string, string> = { nom: 'même nom', email: 'même e-mail', telephone: 'même téléphone' }
const nom = (f: Fiche) => [f.prenom, f.nom].filter(Boolean).join(' ') + (f.surnom ? ` « ${f.surnom} »` : '')

/**
 * Fiches en double (administration) : pour chaque groupe, garder une fiche et y fusionner les
 * autres, ou déclarer que ce ne sont pas des doublons.
 */
export function Doublons() {
  const [groupes, setGroupes] = useState<Groupe[] | null>(null)
  const [garder, setGarder] = useState<{ groupe: Groupe, fiche: Fiche } | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  const charger = useCallback(() => {
    api<Groupe[]>('membres', '/api/doublons').then(setGroupes).catch((e) => setErreur(e.message))
  }, [])
  useEffect(charger, [charger])

  if (!aLeDroit('membres', 'admin')) return <Alert severity="warning">La gestion des doublons est réservée à l'administration.</Alert>

  async function fusionner() {
    if (!garder) return
    setEnvoi(true)
    setErreur(null)
    try {
      for (const f of garder.groupe.fiches.filter((x) => x.id !== garder.fiche.id)) {
        await api('membres', `/api/personnes/${garder.fiche.id}/fusion`, { methode: 'POST', corps: { absorber: f.id } })
      }
      setMessage(`Fiches fusionnées dans « ${nom(garder.fiche)} ».`)
      setGarder(null)
    } catch (e) {
      setErreur((e as ErreurApi).message)
    } finally {
      setEnvoi(false)
      charger()
    }
  }

  async function ecarter(g: Groupe) {
    setErreur(null)
    try {
      await api('membres', '/api/doublons/ecarter', { methode: 'POST', corps: { ids: g.fiches.map((f) => f.id) } })
      setMessage('Groupe écarté : ces fiches ne seront plus proposées ensemble.')
      charger()
    } catch (e) {
      setErreur((e as ErreurApi).message)
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h1">Doublons</Typography>
      <Typography color="text.secondary">
        Fiches au même nom et prénom (sans dates de naissance contradictoires), au même e-mail ou au même téléphone. Choisissez la fiche à garder : les autres y sont fusionnées (adhésions, cotisations, rôles, paiements, coordonnées ; les champs vides sont complétés), puis supprimées.
      </Typography>
      {message && <Alert severity="success" onClose={() => setMessage(null)}>{message}</Alert>}
      {erreur && !garder && <Alert severity="error" onClose={() => setErreur(null)}>{erreur}</Alert>}
      {!groupes && !erreur && <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>}
      {groupes?.length === 0 && <Alert severity="success">Aucun doublon.</Alert>}
      {groupes && groupes.length > 0 && <Typography variant="body2" color="text.secondary">{groupes.length} groupe{groupes.length > 1 ? 's' : ''}</Typography>}

      {groupes?.map((g) => (
        <Card key={g.fiches.map((f) => f.id).join()}>
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
              {g.raisons.map((r) => <Chip key={r} size="small" color="warning" variant="outlined" label={RAISONS[r] ?? r} />)}
              <Box sx={{ flex: 1 }} />
              <Button size="small" onClick={() => ecarter(g)}>Pas des doublons</Button>
            </Stack>
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: `repeat(${Math.min(g.fiches.length, 3)}, 1fr)` } }}>
              {g.fiches.map((f) => (
                <Box key={f.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Link component={LienRouteur} to={`/personnes/${f.id}`} sx={{ fontWeight: 600 }}>{nom(f)}</Link>
                  <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                    {f.type !== 'personne' && <Chip size="small" variant="outlined" label={TYPES_FICHE[f.type]} />}
                    {f.statut === 'disparu' && <Chip size="small" label={libelleDisparu(f.type)} />}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {[f.naissance && `né(e) le ${dateFr(f.naissance)}`, f.telephone && telephoneFr(f.telephone), f.email, f.ville].filter(Boolean).join(' · ') || 'aucune coordonnée'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {f.adhesions} adhésion{f.adhesions > 1 ? 's' : ''}{f.associations.length ? ` (${f.associations.join(', ')})` : ''} · {f.cotisations} cotisation{f.cotisations > 1 ? 's' : ''} · {f.roles} rôle{f.roles > 1 ? 's' : ''}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">créée le {dateFr(f.cree_le)}</Typography>
                  <Box sx={{ flex: 1 }} />
                  <Button size="small" variant="outlined" onClick={() => { setErreur(null); setGarder({ groupe: g, fiche: f }) }}>Garder celle-ci</Button>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!garder} onClose={() => setGarder(null)} fullWidth maxWidth="xs">
        <DialogTitle>Fusionner</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            <Typography>
              Garder « {garder && nom(garder.fiche)} » et y fusionner {garder && garder.groupe.fiches.length - 1 > 1 ? `les ${garder.groupe.fiches.length - 1} autres fiches` : 'l\'autre fiche'} ?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Adhésions, cotisations, rôles, paiements et coordonnées sont rattachés à la fiche gardée ; ses champs vides sont complétés. Les autres fiches sont supprimées : c'est définitif.
            </Typography>
            {erreur && <Alert severity="error">{erreur}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGarder(null)}>Annuler</Button>
          <Button variant="contained" color="warning" disabled={envoi} onClick={fusionner}>{envoi ? 'Fusion…' : 'Fusionner'}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
