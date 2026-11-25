import Add from '@mui/icons-material/Add'
import Cake from '@mui/icons-material/Cake'
import Check from '@mui/icons-material/Check'
import Groups from '@mui/icons-material/Groups'
import MusicNote from '@mui/icons-material/MusicNote'
import Search from '@mui/icons-material/Search'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { aLeDroit, api, ErreurApi } from '../api/client'
import { useReference } from '../api/reference'
import { dateFr, euros, libelleDisparu, ROLES, TYPES_FICHE, type LigneListe } from '../api/types'
import { AnneauCompletude } from '../composants/Completude'
import { EtiquetteAssociation } from '../composants/Etiquette'
import { Surligne } from '../composants/Surligne'
import { anniversaireFullPatch, depuisAdresse, ETATS, filtrer, TYPES, versAdresse, type Jeton } from '../filtres'
import { correspond, termes } from '../texte'
import { trier, TRIS, type Tri } from '../tri'

const MOYENS = [
  { code: 'especes', libelle: 'Espèces' },
  { code: 'cheque', libelle: 'Chèque' },
  { code: 'virement', libelle: 'Virement' },
  { code: 'carte', libelle: 'Carte' },
]

const aPayer = (l: LigneListe) => l.mois.statut === 'a_payer' || l.mois.statut === 'partiel'

/**
 * Écran principal : la liste complète des personnes avec l'état du mois. La barre de recherche
 * filtre sur place : le texte cherche dans les noms (surligné), les pastilles filtrent par état,
 * association, niveau ou rôle (voir filtres.ts). « Payé ce mois-ci » encaisse le mois.
 */
export function Recherche() {
  const ref = useReference()
  const [params, setParams] = useSearchParams()
  const [saisie, setSaisie] = useState(params.get('q') ?? '')
  const [tri, setTri] = useState<Tri>((params.get('tri') as Tri) in TRIS ? params.get('tri') as Tri : 'auto')
  const [brut, setBrut] = useState(params.get('f') ?? '')  // pastilles, dans l'adresse : « niveau:full_patch,… »
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
    setParams({ ...(q ? { q } : {}), ...(brut ? { f: brut } : {}), ...(tri !== 'auto' ? { tri } : {}) }, { replace: true })
  }, [saisie, brut, tri, setParams])

  // Pastilles proposées : états, associations JaXaJ, niveaux, rôles.
  const options = useMemo<Jeton[]>(() => [
    ...Object.entries(TYPES_FICHE).map(([valeur, libelle]) => ({ type: 'fiche' as const, valeur, libelle })),
    ...Object.entries(ETATS).map(([valeur, libelle]) => ({ type: 'etat' as const, valeur, libelle })),
    ...(ref?.organisations ?? []).filter((o) => o.genre === 'association_jaxaj').map((o) => ({ type: 'association' as const, valeur: o.id, libelle: o.nom })),
    ...(ref?.categories ?? []).map((c) => ({ type: 'niveau' as const, valeur: c.code, libelle: c.libelle })),
    ...Object.entries(ROLES).map(([valeur, libelle]) => ({ type: 'role' as const, valeur, libelle })),
  ], [ref])
  const jetons = useMemo(() => depuisAdresse(brut, options), [brut, options])
  const mots = useMemo(() => termes(saisie), [saisie])
  const resultats = useMemo(() => (lignes ?? []).map((l) => ({ l, ...filtrer(l, jetons) })).filter((r) => r.ok), [lignes, jetons])
  const visibles = useMemo(() => {
    const trouves = resultats.filter(({ l }) => correspond([l.nom, l.prenom, l.surnom].filter(Boolean).join(' '), mots))
    const parId = new Map(trouves.map((r) => [r.l.id, r]))
    return trier(trouves.map((r) => r.l), tri, mots).map((l) => parId.get(l.id)!)
  }, [resultats, mots, tri])
  const ajouter = (j: Jeton) => setBrut(versAdresse([...jetons, j]))
  // Raccourcis : les états qu'on n'a pas encore posés, avec ce qu'ils donneraient.
  // Raccourcis : pastilles fréquentes pas encore posées, avec ce qu'elles donneraient.
  const raccourcis = ([['etat', 'en_cours'], ['etat', 'a_payer'], ['fiche', 'structure'], ['fiche', 'artiste'], ['etat', 'archives']] as const)
    .filter(([type, valeur]) => !jetons.some((j) => j.type === type && (j.valeur === valeur || type === 'fiche')))
    .map(([type, valeur]) => {
      const j = options.find((o) => o.type === type && o.valeur === valeur)!
      return { j, n: (lignes ?? []).filter((l) => filtrer(l, [...jetons, j]).ok).length }
    })

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
  return (
    <Box>
      <Box sx={{ position: 'sticky', top: { xs: 59, sm: 67 }, zIndex: 2, bgcolor: 'background.default', pb: 1.5, pt: 0.5, mt: -0.5 }}>
        <Autocomplete
          multiple
          freeSolo
          openOnFocus
          clearOnBlur={false}
          options={options}
          value={jetons}
          inputValue={saisie}
          groupBy={(o) => TYPES[(o as Jeton).type]}
          getOptionLabel={(o) => (typeof o === 'string' ? o : o.libelle)}
          filterOptions={(opts, { inputValue }) => {
            const m = termes(inputValue)
            return opts.filter((o) => !jetons.some((j) => j.type === o.type && j.valeur === o.valeur)
              && correspond(`${o.libelle} ${TYPES[o.type]}`, m))
          }}
          onChange={(_, valeur, raison) => {
            if (raison === 'createOption') return  // Entrée sur du texte : il reste une recherche de nom
            setBrut(versAdresse(valeur.filter((v): v is Jeton => typeof v !== 'string')))
            if (raison === 'selectOption') setSaisie('')  // le texte a servi à trouver la pastille
          }}
          onInputChange={(_, valeur, raison) => { if (raison !== 'reset') setSaisie(valeur) }}
          renderValue={(valeur, getItemProps) => valeur.map((j, index) => {
            const { key, ...props } = getItemProps({ index })
            const jeton = j as Jeton
            return <Chip key={key} size="small" {...props} label={jeton.libelle}
              color={jeton.type === 'etat' ? 'primary' : jeton.type === 'association' ? 'default' : 'secondary'}
              variant={jeton.type === 'association' ? 'filled' : 'outlined'} />
          })}
          renderInput={(p) => (
            <TextField {...p} placeholder={jetons.length ? 'Nom, ou autre filtre…' : 'Nom, prénom, surnom, ou filtre : Béarn, full patch, à payer…'}
              slotProps={{
                ...p.slotProps,
                htmlInput: { ...p.slotProps.htmlInput, 'aria-label': 'Rechercher et filtrer la liste' },
                input: { ...p.slotProps.input, startAdornment: <><InputAdornment position="start"><Search /></InputAdornment>{p.slotProps.input.startAdornment}</>,
                  sx: { fontSize: '1.1rem', bgcolor: 'background.paper' } },
              }} />
          )}
        />
        {lignes && raccourcis.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mt: 1.2, flexWrap: 'wrap', rowGap: 1, alignItems: 'center' }}>
            {raccourcis.map(({ j, n }) => (
              <Chip key={j.valeur} size="small" variant="outlined" label={`${j.libelle} · ${n}`} onClick={() => ajouter(j)}
                icon={j.valeur === 'artiste' ? <MusicNote /> : j.valeur === 'structure' ? <Groups /> : <Add />} />
            ))}
          </Stack>
        )}
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
          <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {visibles.length === lignes?.length ? `${visibles.length} personnes` : `${visibles.length} sur ${lignes?.length}`} · {nomMois}
            </Typography>
            <TextField select size="small" variant="standard" value={tri} onChange={(e) => setTri(e.target.value as Tri)}
              slotProps={{ htmlInput: { 'aria-label': 'Trier la liste' } }} sx={{ minWidth: 0, '& .MuiInputBase-root': { fontSize: '.875rem' } }}>
              {Object.entries(TRIS).map(([code, libelle]) => (
                <MenuItem key={code} value={code}>{code === 'auto' && mots.length ? 'Pertinence, puis adhésions en cours' : libelle}</MenuItem>
              ))}
            </TextField>
          </Stack>
          <Card>
            <List disablePadding>
              {visibles.map(({ l, adhesion: retenue }, i) => (
                <ListItem key={l.id} disablePadding divider={i < visibles.length - 1}
                  sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' }, contentVisibility: 'auto', containIntrinsicSize: 'auto 64px' }}>
                  <ListItemButton component={Link} to={`/personnes/${l.id}`} sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 1.1, minWidth: 0, width: { xs: '100%', sm: 'auto' } }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600 }}>
                        <Surligne texte={[l.prenom, l.nom].filter(Boolean).join(' ')} mots={mots} />
                        {l.surnom && <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}> « <Surligne texte={l.surnom} mots={mots} /> »</Box>}
                      </Typography>
                      {l.type !== 'personne' && (
                        <Tooltip title={TYPES_FICHE[l.type]}>{l.type === 'artiste' ? <MusicNote fontSize="small" color="action" /> : <Groups fontSize="small" color="action" />}</Tooltip>
                      )}
                      {l.completude.manquants.length > 0 && <AnneauCompletude completude={l.completude} taille={24} />}
                    </Stack>
                    {l.statut === 'disparu' && (
                      <Chip size="small" variant="outlined" sx={{ my: 0.4 }}
                        label={`${libelleDisparu(l.type)}${l.disparu_le ? ` le ${dateFr(l.disparu_le)}` : ''}`} />
                    )}
                    {anniversaireFullPatch(l) !== null && (
                      <Chip size="small" color="warning" variant="outlined" icon={<Cake />} sx={{ my: 0.4 }}
                        label={`${anniversaireFullPatch(l)} an${anniversaireFullPatch(l)! > 1 ? 's' : ''} de full patch le ${l.premier_full_patch!.slice(8, 10)}/${l.premier_full_patch!.slice(5, 7)}`} />
                    )}
                    {l.roles.length > 0 && (
                      <Stack direction="row" spacing={0.5} sx={{ my: 0.4, flexWrap: 'wrap', rowGap: 0.5 }}>
                        {l.roles.map((r) => (
                          <Chip key={r.role + r.organisation} size="small" color="secondary" variant="outlined"
                            label={`${ROLES[r.role] ?? r.role} · ${organisation(r.organisation)?.nom ?? ''}`} />
                        ))}
                      </Stack>
                    )}
                    <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', flexWrap: 'wrap', color: 'text.secondary', fontSize: '.84rem' }}>
                      {retenue
                        ? <><EtiquetteAssociation organisation={organisation(retenue.association)} /><span>{libelleCategorie(retenue.categorie)}</span></>
                        : l.adhesion
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
