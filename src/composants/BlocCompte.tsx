import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormLabel from '@mui/material/FormLabel'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api, ErreurApi } from '../api/client'
import { useReference } from '../api/reference'
import { dateFr, type Compte, type Expediteur, type Personne } from '../api/types'
import { Definitions } from './Definitions'
import { Section } from './Section'

const ROLES_COMPTE = [
  { droit: 'comptes:admin', libelle: 'Gérer les comptes', perimetre: false },
  { droit: 'membres:admin', libelle: 'Membres : tous les droits', perimetre: false },
  { droit: 'membres:gestion', libelle: 'Membres : gestion (les trois suivants)', perimetre: true },
  { droit: 'membres:inscription', libelle: 'Membres : inscription (nouvelles fiches et adhésions)', perimetre: true },
  { droit: 'membres:historique', libelle: 'Membres : historique (corriger adhésions et rôles, calculer les cotisations)', perimetre: true },
  { droit: 'membres:tresorerie', libelle: 'Membres : trésorerie (encaisser)', perimetre: true },
  { droit: 'membres:accueil', libelle: 'Membres : accueil des événements', perimetre: true },
]

/** Compte de connexion d'une personne : état, ou « Transformer en compte ». */
export function BlocCompte({ personne }: { personne: Personne }) {
  const ref = useReference()
  const [compte, setCompte] = useState<Compte | null | undefined>(undefined)
  const [expediteurs, setExpediteurs] = useState<Expediteur[]>([])
  const [ouvert, setOuvert] = useState<'creer' | 'modifier' | false>(false)
  const [email, setEmail] = useState(personne.email ?? '')
  const [coches, setCoches] = useState<Record<string, string[]>>({})  // droit → associations ([] = toutes)
  const [expediteur, setExpediteur] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', texte: string } | null>(null)
  const [envoi, setEnvoi] = useState(false)

  const charger = useCallback(() => {
    api<Compte[]>('comptes', `/api/comptes?personne=${personne.id}`).then((c) => setCompte(c[0] ?? null)).catch(() => setCompte(null))
  }, [personne.id])
  useEffect(() => {
    charger()
    api<Expediteur[]>('comptes', '/api/expediteurs').then((e) => {
      setExpediteurs(e)
      setExpediteur(e.find((x) => x.par_defaut)?.cle ?? '')
    }).catch(() => {})
  }, [charger])

  const associations = ref?.organisations.filter((o) => o.genre === 'association_jaxaj') ?? []
  const libelleDroit = (d: string) => {
    const [a, r, p] = d.split(':')
    return p ? `${a}:${r} · ${ref?.organisations.find((o) => o.id === p)?.nom ?? p}` : d
  }

  async function inviter(e?: FormEvent, renvoi = false) {
    e?.preventDefault()
    setEnvoi(true)
    setMessage(null)
    const droits = renvoi ? [] : Object.entries(coches).flatMap(([d, assos]) => (assos.length ? assos.map((a) => `${d}:${a}`) : [d]))
    try {
      if (ouvert === 'modifier') {
        setCompte(await api<Compte>('comptes', `/api/comptes/${compte!.id}`, { methode: 'PATCH', corps: { droits } }))
        setOuvert(false)
        setMessage({ type: 'success', texte: 'Droits modifiés : ils s\'appliquent à sa prochaine connexion (au plus tard dans 15 minutes).' })
        return
      }
      const c = await api<Compte>('comptes', '/api/comptes', {
        methode: 'POST',
        corps: { personne: personne.id, email: renvoi ? compte!.email : email, droits, expediteur: renvoi ? compte!.expediteur : expediteur },
      })
      setCompte(c)
      setOuvert(false)
      setMessage({ type: 'success', texte: `Invitation envoyée à ${c.email}.` })
    } catch (err) {
      setMessage({ type: 'error', texte: (err as ErreurApi).message })
    } finally {
      setEnvoi(false)
    }
  }

  /** Coches d'après les droits du compte : « membres:gestion:<asso> » → { 'membres:gestion': [asso] }. */
  function ouvrirModification() {
    const c: Record<string, string[]> = {}
    for (const d of compte?.droits ?? []) {
      const [a, r, p] = d.split(':')
      c[`${a}:${r}`] = [...(c[`${a}:${r}`] ?? []), ...(p ? [p] : [])]
    }
    setCoches(c)
    setMessage(null)
    setOuvert('modifier')
  }

  async function basculerActif() {
    try {
      setCompte(await api<Compte>('comptes', `/api/comptes/${compte!.id}`, { methode: 'PATCH', corps: { actif: !compte!.actif } }))
      setMessage({ type: 'success', texte: compte!.actif ? 'Compte désactivé : il ne peut plus se connecter.' : 'Compte réactivé.' })
    } catch (err) {
      setMessage({ type: 'error', texte: (err as ErreurApi).message })
    }
  }

  if (compte === undefined) return null

  return (
    <Section titre="Compte de connexion" action={!compte && (
      <Button size="small" variant="contained" onClick={() => { setOuvert('creer'); setCoches({}); setMessage(null) }}>Transformer en compte</Button>
    )}>
      {message && !ouvert && <Alert severity={message.type} sx={{ mb: 1.5 }}>{message.texte}</Alert>}
      {!compte && <Typography color="text.secondary">Cette personne n'a pas de compte.</Typography>}
      {compte && (
        <>
          <Definitions lignes={[
            ['E-mail', compte.email],
            ['État', !compte.actif ? 'désactivé' : compte.active
              ? `actif${compte.derniere_connexion ? `, dernière connexion le ${dateFr(compte.derniere_connexion)}` : ''}`
              : `invitation envoyée le ${dateFr(compte.invite_le)}, pas encore activé`],
            ['Droits', compte.droits.length
              ? <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>{compte.droits.map((d) => <Chip key={d} size="small" label={libelleDroit(d)} />)}</Stack>
              : 'aucun'],
          ]} />
          <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
            <Button variant="outlined" onClick={ouvrirModification}>Modifier les droits</Button>
            {!compte.active && <Button variant="outlined" disabled={envoi} onClick={() => inviter(undefined, true)}>Renvoyer l'invitation</Button>}
            <Button color={compte.actif ? 'error' : 'primary'} onClick={basculerActif}>{compte.actif ? 'Désactiver' : 'Réactiver'}</Button>
          </Stack>
        </>
      )}

      <Dialog open={!!ouvert} onClose={() => setOuvert(false)} fullWidth maxWidth="sm">
        <form onSubmit={inviter}>
          <DialogTitle>{ouvert === 'modifier' ? 'Modifier les droits' : 'Transformer en compte'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2.2} sx={{ pt: 1 }}>
              {ouvert === 'creer' && <TextField label="Adresse e-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />}
              <Box>
                <FormLabel component="legend">Droits</FormLabel>
                {ROLES_COMPTE.map((r) => (
                  <Stack key={r.droit} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, minHeight: 48 }}>
                    <FormControlLabel sx={{ flex: 1 }} label={r.libelle} control={
                      <Checkbox checked={r.droit in coches} onChange={(e) => setCoches((c) => {
                        const n = { ...c }
                        if (e.target.checked) n[r.droit] = []
                        else delete n[r.droit]
                        return n
                      })} />
                    } />
                    {r.perimetre && r.droit in coches && (
                      <TextField select size="small" label="Périmètre" value={coches[r.droit]} sx={{ width: { sm: 260 } }}
                        slotProps={{ select: { multiple: true, displayEmpty: true,
                          renderValue: (v) => ((v as string[]).length ? (v as string[]).map((id) => associations.find((a) => a.id === id)?.nom ?? id).join(', ') : 'Toutes les associations') },
                          inputLabel: { shrink: true } }}
                        onChange={(e) => {
                          const assos = e.target.value as unknown as string[]
                          setCoches((c) => ({ ...c, [r.droit]: assos }))
                          // L'invitation part par défaut de l'adresse de l'association concernée.
                          const x = expediteurs.find((x) => x.association === assos[0])
                          if (x && ouvert === 'creer') setExpediteur(x.cle)
                        }}>
                        {associations.map((a) => <MenuItem key={a.id} value={a.id}>{a.nom}</MenuItem>)}
                      </TextField>
                    )}
                  </Stack>
                ))}
              </Box>
              {ouvert === 'creer' && (
                <>
                  <TextField select label="Envoyer l'invitation depuis" value={expediteur} onChange={(e) => setExpediteur(e.target.value)}>
                    {expediteurs.map((x) => <MenuItem key={x.cle} value={x.cle}>{x.nom} ({x.adresse})</MenuItem>)}
                  </TextField>
                  <Typography variant="body2" color="text.secondary">La personne reçoit un lien, valable 7 jours, pour choisir son mot de passe.</Typography>
                </>
              )}
              <Typography variant="body2" color="text.secondary">Périmètre vide : toutes les associations. Plusieurs associations possibles (par exemple le Béarn et JaXaJ MC).</Typography>
              {message?.type === 'error' && <Alert severity="error">{message.texte}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOuvert(false)}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={envoi}>{envoi ? 'Envoi…' : ouvert === 'modifier' ? 'Enregistrer' : 'Créer le compte et envoyer'}</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Section>
  )
}
