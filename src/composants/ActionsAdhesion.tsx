import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useState, type FormEvent } from 'react'
import { api, ErreurApi } from '../api/client'
import { aujourdhuiIso, idDe, type Adhesion, type Categorie } from '../api/types'
import { ChampDate } from './ChampDate'

/** Sur une adhésion en cours : changer de niveau (suiveur → full patch…) ou la clore. */
export function ActionsAdhesion({ adhesion, categories, apres }: { adhesion: Adhesion, categories: Categorie[], apres: () => void }) {
  const [mode, setMode] = useState<'changer' | 'clore' | null>(null)
  const [categorie, setCategorie] = useState('')
  const [date, setDate] = useState(aujourdhuiIso)
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  const ouvrir = (m: 'changer' | 'clore') => { setMode(m); setErreur(null); setDate(aujourdhuiIso()); setCategorie('') }

  async function valider(e: FormEvent) {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)
    try {
      if (mode === 'changer') {
        await api('membres', `/api/adhesions/${adhesion.id}/changement`, { methode: 'POST', corps: { categorie, date } })
      } else {
        await api('membres', `/api/adhesions/${adhesion.id}`, { methode: 'PATCH', corps: { fin: date } })
      }
      setMode(null)
      apres()
    } catch (err) {
      setErreur((err as ErreurApi).message)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <>
      <Stack direction="row" spacing={0.5} sx={{ ml: 'auto !important' }}>
        <Button size="small" color="secondary" onClick={() => ouvrir('changer')}>Changer de niveau</Button>
        <Button size="small" color="secondary" onClick={() => ouvrir('clore')}>Clore</Button>
      </Stack>
      <Dialog open={!!mode} onClose={() => setMode(null)} fullWidth maxWidth="xs">
        <form onSubmit={valider}>
          <DialogTitle>{mode === 'changer' ? 'Changer de niveau' : 'Clore l\'adhésion'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2.2} sx={{ pt: 1 }}>
              {mode === 'changer' && (
                <TextField select label="Nouveau niveau" value={categorie} onChange={(e) => setCategorie(e.target.value)} required>
                  {categories.filter((c) => c.code !== idDe(adhesion.categorie)).map((c) => <MenuItem key={c.code} value={c.code}>{c.libelle}</MenuItem>)}
                </TextField>
              )}
              <ChampDate libelle={mode === 'changer' ? 'À partir du' : 'Dernier jour'} valeur={date} changer={setDate} requis />
              {mode === 'changer' && <Alert severity="info" variant="outlined">L'adhésion actuelle se termine la veille, la nouvelle commence à cette date.</Alert>}
              {erreur && <Alert severity="error">{erreur}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMode(null)}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={envoi}>{mode === 'changer' ? 'Changer' : 'Clore'}</Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  )
}
