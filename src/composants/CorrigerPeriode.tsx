import EditOutlined from '@mui/icons-material/EditOutlined'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useState, type FormEvent } from 'react'
import { aLeDroit, api, ErreurApi } from '../api/client'
import { ChampDate } from './ChampDate'

/**
 * Corriger une ligne d'historique (adhésion, rôle) saisie avec de mauvaises dates : début et fin
 * modifiables par la gestion ; suppression d'une saisie erronée réservée à l'administration.
 */
export function CorrigerPeriode({ chemin, libelle, debut, fin, seul, apres }: {
  chemin: string        // /api/adhesions/{id} ou /api/roles/{id}
  libelle: string       // « Full patch · JaXaJ MC »
  debut: string
  fin: string | null
  seul: boolean         // seul bouton de la ligne : poussé à droite
  apres: () => void
}) {
  const [ouvert, setOuvert] = useState(false)
  const [nouveauDebut, setNouveauDebut] = useState('')
  const [nouvelleFin, setNouvelleFin] = useState('')
  const [confirmer, setConfirmer] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const admin = aLeDroit('membres', 'admin')

  function ouvrir() {
    setNouveauDebut(debut.slice(0, 10))
    setNouvelleFin(fin?.slice(0, 10) ?? '')
    setConfirmer(false)
    setErreur(null)
    setOuvert(true)
  }

  async function agir(action: () => Promise<unknown>) {
    setErreur(null)
    try {
      await action()
      setOuvert(false)
      apres()
    } catch (err) {
      setErreur((err as ErreurApi).message.replace(/^periodeCoherente: /, ''))
    }
  }

  const enregistrer = (e: FormEvent) => {
    e.preventDefault()
    agir(() => api('membres', chemin, { methode: 'PATCH', corps: { debut: nouveauDebut, fin: nouvelleFin || null } }))
  }

  return (
    <>
      <Tooltip title="Corriger les dates">
        <IconButton size="small" aria-label={`Corriger : ${libelle}`} onClick={ouvrir} sx={seul ? { ml: 'auto !important' } : undefined}>
          <EditOutlined fontSize="small" />
        </IconButton>
      </Tooltip>

      <Dialog open={ouvert} onClose={() => setOuvert(false)} fullWidth maxWidth="xs">
        <form onSubmit={enregistrer}>
          <DialogTitle>Corriger</DialogTitle>
          <DialogContent>
            <Stack spacing={2.2} sx={{ pt: 1 }}>
              <Typography>{libelle}</Typography>
              <ChampDate libelle="Début" valeur={nouveauDebut} changer={setNouveauDebut} requis />
              <ChampDate libelle="Fin (incluse, vide = en cours)" valeur={nouvelleFin} changer={setNouvelleFin} />
              {confirmer && (
                <Alert severity="warning" action={
                  <Button color="inherit" size="small" onClick={() => agir(() => api('membres', chemin, { methode: 'DELETE' }))}>Supprimer</Button>
                }>
                  Supprimer définitivement cette ligne ? À réserver aux saisies erronées.
                </Alert>
              )}
              {erreur && <Alert severity="error">{erreur}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            {admin && !confirmer && <Button color="error" onClick={() => setConfirmer(true)} sx={{ mr: 'auto' }}>Supprimer…</Button>}
            <Button onClick={() => setOuvert(false)}>Annuler</Button>
            <Button type="submit" variant="contained">Enregistrer</Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  )
}
