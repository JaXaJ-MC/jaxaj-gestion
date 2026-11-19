import Add from '@mui/icons-material/Add'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import ListSubheader from '@mui/material/ListSubheader'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { aLeDroit, api, ErreurApi } from '../api/client'
import { aujourdhuiIso, dateFr, enCoursLe, idDe, ROLES, type Organisation, type Role } from '../api/types'
import { ChampDate } from './ChampDate'
import { EtiquetteAssociation } from './Etiquette'
import { LigneHistorique, Section } from './Section'

/** Rôles d'une personne (président, trésorier… d'une association) : en cours et passés. */
export function BlocRoles({ personne, organisations }: { personne: string, organisations: Organisation[] }) {
  const [roles, setRoles] = useState<Role[]>([])
  const [ajout, setAjout] = useState(false)
  const [organisation, setOrganisation] = useState('')
  const [role, setRole] = useState('')
  const [debut, setDebut] = useState(aujourdhuiIso)
  const [jusquau, setJusquau] = useState('')  // rôle passé : date de fin dès l'attribution
  const [finPour, setFinPour] = useState<Role | null>(null)
  const [fin, setFin] = useState(aujourdhuiIso)
  const [erreur, setErreur] = useState<string | null>(null)
  const peutModifier = aLeDroit('membres', 'admin', 'gestion')
  const aujourdhui = aujourdhuiIso()

  const charger = useCallback(() => {
    api<Role[]>('membres', `/api/roles?personne=${personne}&itemsPerPage=100`)
      .then((r) => setRoles([...r].sort((a, b) => b.debut.localeCompare(a.debut))))
      .catch((e) => setErreur(e.message))
  }, [personne])
  useEffect(charger, [charger])

  const jaxaj = organisations.filter((o) => o.genre === 'association_jaxaj')
  const autres = organisations.filter((o) => o.genre !== 'association_jaxaj')

  async function envoyer(e: FormEvent, action: () => Promise<unknown>) {
    e.preventDefault()
    setErreur(null)
    try {
      await action()
      setAjout(false)
      setFinPour(null)
      charger()
    } catch (err) {
      setErreur((err as ErreurApi).message)
    }
  }

  return (
    <Section titre="Rôles" action={peutModifier && (
      <Button size="small" startIcon={<Add />} onClick={() => { setAjout(true); setErreur(null); setRole(''); setOrganisation(''); setDebut(aujourdhui); setJusquau('') }}>
        Attribuer un rôle
      </Button>
    )}>
      {roles.length === 0 && <Typography color="text.secondary">Aucun rôle.</Typography>}
      {roles.map((r) => {
        const enCours = enCoursLe(r.debut, r.fin, aujourdhui)
        return (
          <LigneHistorique key={r.id} enCours={enCours}>
            <EtiquetteAssociation organisation={organisations.find((o) => o.id === idDe(r.organisation))} />
            <Typography sx={{ fontWeight: 600 }}>{ROLES[r.role] ?? r.role}</Typography>
            <Typography variant="body2" color="text.secondary">
              {r.fin ? `du ${dateFr(r.debut)} au ${dateFr(r.fin)}` : `depuis le ${dateFr(r.debut)}`}
            </Typography>
            {enCours && peutModifier && (
              <Button size="small" color="secondary" sx={{ ml: 'auto !important' }} onClick={() => { setFinPour(r); setFin(aujourdhui); setErreur(null) }}>
                Fin de mandat
              </Button>
            )}
          </LigneHistorique>
        )
      })}
      {erreur && !ajout && !finPour && <Alert severity="error" sx={{ mt: 1 }}>{erreur}</Alert>}

      <Dialog open={ajout} onClose={() => setAjout(false)} fullWidth maxWidth="xs">
        <form onSubmit={(e) => envoyer(e, () => api('membres', '/api/roles', {
          methode: 'POST',
          corps: { personne: `/api/personnes/${personne}`, organisation: `/api/organisations/${organisation}`, role, debut, fin: jusquau || null },
        }))}>
          <DialogTitle>Attribuer un rôle</DialogTitle>
          <DialogContent>
            <Stack spacing={2.2} sx={{ pt: 1 }}>
              <TextField select label="Rôle" value={role} onChange={(e) => setRole(e.target.value)} required>
                {Object.entries(ROLES).map(([code, libelle]) => <MenuItem key={code} value={code}>{libelle}</MenuItem>)}
              </TextField>
              <TextField select label="Association" value={organisation} onChange={(e) => setOrganisation(e.target.value)} required>
                {jaxaj.map((o) => <MenuItem key={o.id} value={o.id}>{o.nom}</MenuItem>)}
                {autres.length > 0 && <ListSubheader>Autres organisations</ListSubheader>}
                {autres.map((o) => <MenuItem key={o.id} value={o.id}>{o.nom}</MenuItem>)}
              </TextField>
              <ChampDate libelle="Depuis le" valeur={debut} changer={setDebut} requis />
              <ChampDate libelle="Jusqu'au (inclus, vide = en cours)" valeur={jusquau} changer={setJusquau} />
              <Typography variant="body2" color="text.secondary">Pour un rôle passé, indiquez aussi la date de fin. Un seul titulaire à la fois par rôle et par association (sauf représentant).</Typography>
              {erreur && <Alert severity="error">{erreur}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAjout(false)}>Annuler</Button>
            <Button type="submit" variant="contained">Attribuer</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={!!finPour} onClose={() => setFinPour(null)} fullWidth maxWidth="xs">
        <form onSubmit={(e) => envoyer(e, () => api('membres', `/api/roles/${finPour!.id}`, { methode: 'PATCH', corps: { fin } }))}>
          <DialogTitle>Fin de mandat</DialogTitle>
          <DialogContent>
            <Stack spacing={2.2} sx={{ pt: 1 }}>
              <Typography>{finPour && (ROLES[finPour.role] ?? finPour.role)} · {organisations.find((o) => o.id === idDe(finPour?.organisation))?.nom}</Typography>
              <ChampDate libelle="Dernier jour" valeur={fin} changer={setFin} requis />
              {erreur && <Alert severity="error">{erreur}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFinPour(null)}>Annuler</Button>
            <Button type="submit" variant="contained">Valider</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Section>
  )
}
