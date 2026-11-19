import Check from '@mui/icons-material/Check'
import Clear from '@mui/icons-material/Clear'
import Search from '@mui/icons-material/Search'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { aLeDroit, api, ErreurApi } from '../api/client'
import { useReference } from '../api/reference'
import { dateFr, euros, ROLES, type LigneListe } from '../api/types'
import { EtiquetteAssociation } from '../composants/Etiquette'
import { Surligne } from '../composants/Surligne'
import { correspond, termes } from '../texte'

type Filtre = 'tous' | 'en_cours' | 'a_payer'

const MOYENS = [
  { code: 'especes', libelle: 'Espèces' },
  { code: 'cheque', libelle: 'Chèque' },
  { code: 'virement', libelle: 'Virement' },
  { code: 'carte', libelle: 'Carte' },
]

const aPayer = (l: LigneListe) => l.mois.statut === 'a_payer' || l.mois.statut === 'partiel'

/**
 * Écran principal : la liste complète des personnes avec l'état du mois. La recherche filtre
 * la liste sur place et surligne ce qu'elle trouve ; « Payé ce mois-ci » encaisse le mois.
 */
export function Recherche() {
  const ref = useReference()
  const [params, setParams] = useSearchParams()
  const [saisie, setSaisie] = useState(params.get('q') ?? '')
  const [filtre, setFiltre] = useState<Filtre>((params.get('filtre') as Filtre) || 'tous')
  const [lignes, setLignes] = useState<LigneListe[] | null>(null)
  const [mois, setMois] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [menu, setMenu] = useState<{ ancre: HTMLElement, ligne: LigneListe } | null>(null)
  const [enCours, setEnCours] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', texte: string } | null>(null)
  const peutEncaisser = aLeDroit('membres', 'admin', 'gestion', 'accueil')

  useEffect(() => {
    api<{ mois: string, personnes: LigneListe[] }>('membres', '/api/liste')
      .then((r) => { setLignes(r.personnes); setMois(r.mois) })
      .catch((e) => setErreur(e.message))
  }, [])

  useEffect(() => {
    const q = saisie.trim()
    setParams({ ...(q ? { q } : {}), ...(filtre !== 'tous' ? { filtre } : {}) }, { replace: true })
  }, [saisie, filtre, setParams])

  const mots = useMemo(() => termes(saisie), [saisie])
  const comptes = useMemo(() => ({
    tous: lignes?.length ?? 0,
    en_cours: lignes?.filter((l) => l.adhesion).length ?? 0,
    a_payer: lignes?.filter(aPayer).length ?? 0,
  }), [lignes])
  const visibles = useMemo(() => (lignes ?? []).filter((l) =>
    (filtre === 'tous' || (filtre === 'en_cours' ? !!l.adhesion : aPayer(l)))
    && correspond([l.nom, l.prenom, l.surnom].filter(Boolean).join(' '), mots),
  ), [lignes, filtre, mots])

  async function encaisser(ligne: LigneListe, moyen: string) {
    setMenu(null)
    setEnCours(ligne.id)
    try {
      const nouvelle = await api<LigneListe>('membres', `/api/personnes/${ligne.id}/paiement-mois`, { methode: 'POST', corps: { mois, moyen } })
      setLignes((ls) => ls?.map((l) => (l.id === ligne.id ? nouvelle : l)) ?? null)
      setMessage({ type: 'success', texte: `${[ligne.prenom, ligne.nom].filter(Boolean).join(' ')} : ${euros(ligne.mois.reste)} encaissés (${MOYENS.find((m) => m.code === moyen)?.libelle.toLowerCase()}).` })
    } catch (e) {
      setMessage({ type: 'error', texte: (e as ErreurApi).statut === 403 ? 'Vous n\'avez pas le droit d\'encaisser cette cotisation.' : (e as Error).message })
    } finally {
      setEnCours(null)
    }
  }

  const nomMois = mois ? new Date(`${mois}-01T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : ''
  const libelleCategorie = (code: string | null) => ref?.categories.find((c) => c.code === code)?.libelle ?? code
  const organisation = (id: string | null) => ref?.organisations.find((o) => o.id === id)
  const filtres: [Filtre, string][] = [['tous', 'Tous'], ['en_cours', 'Adhésion en cours'], ['a_payer', `À payer en ${nomMois.split(' ')[0] || 'ce mois'}`]]

  return (
    <Box>
      <Box sx={{ position: 'sticky', top: { xs: 59, sm: 67 }, zIndex: 2, bgcolor: 'background.default', pb: 1.5, pt: 0.5, mt: -0.5 }}>
        <TextField
          placeholder="Filtrer : nom, prénom ou surnom…"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          slotProps={{
            htmlInput: { 'aria-label': 'Filtrer la liste' },
            input: {
              startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
              endAdornment: saisie && (
                <InputAdornment position="end">
                  <IconButton aria-label="Effacer" onClick={() => setSaisie('')} edge="end"><Clear /></IconButton>
                </InputAdornment>
              ),
              sx: { fontSize: '1.1rem', bgcolor: 'background.paper' },
            },
          }}
        />
        <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
          {filtres.map(([f, libelle]) => (
            <Chip key={f} label={`${libelle} · ${comptes[f]}`} onClick={() => setFiltre(f)}
              color={filtre === f ? 'primary' : 'default'} variant={filtre === f ? 'filled' : 'outlined'} />
          ))}
        </Stack>
      </Box>

      {erreur && <Alert severity="error">{erreur}</Alert>}
      {!lignes && !erreur && <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>}

      {lignes && visibles.length === 0 && (
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <Typography sx={{ mb: 2 }}>Personne ne correspond{saisie ? ` à « ${saisie} »` : ''}.</Typography>
          <Button variant="contained" component={Link} to={`/personnes/nouvelle?nom=${encodeURIComponent(saisie)}`}>Créer une fiche</Button>
        </Card>
      )}

      {visibles.length > 0 && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {visibles.length === lignes?.length ? `${visibles.length} personnes` : `${visibles.length} sur ${lignes?.length}`} · {nomMois}
          </Typography>
          <Card>
            <List disablePadding>
              {visibles.map((l, i) => (
                <ListItem key={l.id} disablePadding divider={i < visibles.length - 1}
                  sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' }, contentVisibility: 'auto', containIntrinsicSize: 'auto 64px' }}>
                  <ListItemButton component={Link} to={`/personnes/${l.id}`} sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 1.1, minWidth: 0, width: { xs: '100%', sm: 'auto' } }}>
                    <Typography sx={{ fontWeight: 600 }}>
                      <Surligne texte={[l.prenom, l.nom].filter(Boolean).join(' ')} mots={mots} />
                      {l.surnom && <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}> « <Surligne texte={l.surnom} mots={mots} /> »</Box>}
                    </Typography>
                    {l.roles.length > 0 && (
                      <Stack direction="row" spacing={0.5} sx={{ my: 0.4, flexWrap: 'wrap', rowGap: 0.5 }}>
                        {l.roles.map((r) => (
                          <Chip key={r.role + r.organisation} size="small" color="secondary" variant="outlined"
                            label={`${ROLES[r.role] ?? r.role} · ${organisation(r.organisation)?.nom ?? ''}`} />
                        ))}
                      </Stack>
                    )}
                    <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', flexWrap: 'wrap', color: 'text.secondary', fontSize: '.84rem' }}>
                      {l.adhesion
                        ? <><EtiquetteAssociation organisation={organisation(l.association)} /><span>{libelleCategorie(l.categorie)}</span></>
                        : <span>{l.derniere_cotisation ? `Dernière cotisation : ${dateFr(l.derniere_cotisation).slice(3)}` : 'Aucune cotisation'}</span>}
                    </Stack>
                  </ListItemButton>
                  {l.mois.statut !== 'aucune_adhesion' && (
                    <Box sx={{ flexShrink: 0, px: 2, pb: { xs: 1.2, sm: 0 }, pl: { xs: 2, sm: 1 } }}>
                      {(l.mois.statut === 'paye' || l.mois.statut === 'gratuit') && (
                        <Chip size="small" color="success" variant="outlined" icon={<Check />} label={l.mois.statut === 'paye' ? 'Payé' : 'Gratuit'} />
                      )}
                      {l.mois.statut === 'sans_tarif' && <Chip size="small" label="Pas de tarif" />}
                      {aPayer(l) && peutEncaisser && (
                        <Button variant="contained" size="small" disabled={enCours === l.id}
                          onClick={(e) => setMenu({ ancre: e.currentTarget, ligne: l })}>
                          Payé ce mois-ci · {euros(l.mois.reste)}
                        </Button>
                      )}
                    </Box>
                  )}
                </ListItem>
              ))}
            </List>
          </Card>
        </>
      )}

      <Menu anchorEl={menu?.ancre} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem disabled dense>Moyen de paiement</MenuItem>
        {MOYENS.map((m) => <MenuItem key={m.code} onClick={() => menu && encaisser(menu.ligne, m.code)}>{m.libelle}</MenuItem>)}
      </Menu>

      <Snackbar open={!!message} autoHideDuration={5000} onClose={() => setMessage(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {message ? <Alert severity={message.type} variant="filled" onClose={() => setMessage(null)}>{message.texte}</Alert> : undefined}
      </Snackbar>
    </Box>
  )
}
