import Add from '@mui/icons-material/Add'
import EditOutlined from '@mui/icons-material/EditOutlined'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { aLeDroit, api, ErreurApi } from '../api/client'
import { useReference } from '../api/reference'
import { aujourdhuiIso, dateFr, enCoursLe, euros, idDe, PERIODICITES, type Tarif } from '../api/types'
import { ChampDate } from '../composants/ChampDate'
import { EtiquetteAssociation } from '../composants/Etiquette'
import { LigneHistorique, Section } from '../composants/Section'

type Saisie = { categorie: string, association: string, periodicite: Tarif['periodicite'], montant: string, debut: string, fin: string, decision: string }
const VIDE: Saisie = { categorie: '', association: '', periodicite: 'mensuelle', montant: '', debut: '', fin: '', decision: '' }

/**
 * Tarifs votés en AG, par catégorie : montant par mois ou par an, période de validité. Ils
 * servent au calcul des cotisations et à « Payé ce mois-ci ». Réservé à l'administration.
 */
export function Tarifs() {
  const ref = useReference()
  const [tarifs, setTarifs] = useState<Tarif[] | null>(null)
  const [edition, setEdition] = useState<Tarif | 'nouveau' | null>(null)
  const [saisie, setSaisie] = useState<Saisie>(VIDE)
  const [confirmer, setConfirmer] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const aujourdhui = aujourdhuiIso()

  const charger = useCallback(() => {
    api<Tarif[]>('membres', '/api/tarifs').then(setTarifs).catch((e) => setErreur(e.message))
  }, [])
  useEffect(charger, [charger])

  if (!aLeDroit('membres', 'admin')) return <Alert severity="warning">Les tarifs sont réservés à l'administration.</Alert>

  function ouvrir(t: Tarif | 'nouveau') {
    setSaisie(t === 'nouveau' ? { ...VIDE, debut: `${aujourdhui.slice(0, 4)}-01-01` } : {
      categorie: idDe(t.categorie) ?? '', association: idDe(t.association) ?? '', periodicite: t.periodicite,
      montant: String(Number(t.montant)), debut: t.debut.slice(0, 10), fin: t.fin?.slice(0, 10) ?? '', decision: t.decision ?? '',
    })
    setConfirmer(false)
    setErreur(null)
    setEdition(t)
  }

  async function agir(action: () => Promise<unknown>) {
    setErreur(null)
    try {
      await action()
      setEdition(null)
      charger()
    } catch (err) {
      setErreur((err as ErreurApi).message.replace(/^periodeCoherente: /, ''))
    }
  }

  function enregistrer(e: FormEvent) {
    e.preventDefault()
    const corps = {
      categorie: `/api/categories/${saisie.categorie}`,
      association: saisie.association ? `/api/organisations/${saisie.association}` : null,
      periodicite: saisie.periodicite, montant: saisie.montant.replace(',', '.'),
      debut: saisie.debut, fin: saisie.fin || null, decision: saisie.decision,
    }
    agir(() => edition === 'nouveau'
      ? api('membres', '/api/tarifs', { methode: 'POST', corps })
      : api('membres', `/api/tarifs/${(edition as Tarif).id}`, { methode: 'PATCH', corps }))
  }

  const changer = (champ: keyof Saisie) => (v: string) => setSaisie((s) => ({ ...s, [champ]: v }))
  const categories = ref?.categories ?? []
  const associations = (ref?.organisations ?? []).filter((o) => o.genre === 'association_jaxaj')
  // Une section par catégorie, dans l'ordre des catégories ; le plus récent en haut.
  const parCategorie = categories
    .map((c) => ({ c, lignes: (tarifs ?? []).filter((t) => idDe(t.categorie) === c.code).sort((a, b) => b.debut.localeCompare(a.debut)) }))
    .filter((g) => g.lignes.length > 0)

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h1">Tarifs</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => ouvrir('nouveau')}>Ajouter un tarif</Button>
      </Stack>
      <Typography color="text.secondary">
        Votés en AG. Ils servent à « Calculer les cotisations » sur une fiche et à « Payé ce mois-ci ». Un tarif propre à une association l'emporte sur celui de toutes les associations.
      </Typography>
      {erreur && !edition && <Alert severity="error">{erreur}</Alert>}
      {tarifs && parCategorie.length === 0 && <Typography color="text.secondary">Aucun tarif.</Typography>}

      {parCategorie.map(({ c, lignes }) => (
        <Section key={c.code} titre={c.libelle}>
          {lignes.map((t) => {
            const enCours = enCoursLe(t.debut, t.fin, aujourdhui)
            const asso = ref?.organisations.find((o) => o.id === idDe(t.association))
            return (
              <LigneHistorique key={t.id} enCours={enCours}>
                <Typography sx={{ fontWeight: 600, minWidth: 110 }}>{euros(t.montant)} {PERIODICITES[t.periodicite]}</Typography>
                {asso ? <EtiquetteAssociation organisation={asso} /> : <Typography variant="body2" color="text.secondary">toutes associations</Typography>}
                <Typography variant="body2" color="text.secondary">
                  {t.fin ? `du ${dateFr(t.debut)} au ${dateFr(t.fin)}` : `depuis le ${dateFr(t.debut)}`}
                  {t.decision && ` · ${t.decision}`}
                </Typography>
                <IconButton size="small" aria-label="Modifier ce tarif" onClick={() => ouvrir(t)} sx={{ ml: 'auto !important' }}>
                  <EditOutlined fontSize="small" />
                </IconButton>
              </LigneHistorique>
            )
          })}
        </Section>
      ))}

      <Dialog open={!!edition} onClose={() => setEdition(null)} fullWidth maxWidth="xs">
        <form onSubmit={enregistrer}>
          <DialogTitle>{edition === 'nouveau' ? 'Ajouter un tarif' : 'Modifier le tarif'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2.2} sx={{ pt: 1 }}>
              <TextField select label="Catégorie" value={saisie.categorie} onChange={(e) => changer('categorie')(e.target.value)} required>
                {categories.map((c) => <MenuItem key={c.code} value={c.code}>{c.libelle}</MenuItem>)}
              </TextField>
              <TextField select label="Association" value={saisie.association} onChange={(e) => changer('association')(e.target.value)}
                slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}>
                <MenuItem value="">Toutes les associations</MenuItem>
                {associations.map((o) => <MenuItem key={o.id} value={o.id}>{o.nom}</MenuItem>)}
              </TextField>
              <Stack direction="row" spacing={1.5}>
                <TextField label="Montant" value={saisie.montant} onChange={(e) => changer('montant')(e.target.value)} required sx={{ flex: 1 }}
                  slotProps={{ htmlInput: { inputMode: 'decimal', pattern: '[0-9]+([.,][0-9]{1,2})?' }, input: { endAdornment: <InputAdornment position="end">€</InputAdornment> } }} />
                <TextField select label="Périodicité" value={saisie.periodicite} onChange={(e) => changer('periodicite')(e.target.value)} sx={{ flex: 1 }}>
                  {Object.entries(PERIODICITES).map(([code, libelle]) => <MenuItem key={code} value={code}>{libelle}</MenuItem>)}
                </TextField>
              </Stack>
              <ChampDate libelle="Valable du" valeur={saisie.debut} changer={changer('debut')} requis />
              <ChampDate libelle="Jusqu'au (inclus, vide = en vigueur)" valeur={saisie.fin} changer={changer('fin')} />
              <TextField label="Décision" placeholder="AG de janvier 2015" value={saisie.decision} onChange={(e) => changer('decision')(e.target.value)} />
              {confirmer && edition !== 'nouveau' && (
                <Alert severity="warning" action={
                  <Button color="inherit" size="small" onClick={() => agir(() => api('membres', `/api/tarifs/${(edition as Tarif).id}`, { methode: 'DELETE' }))}>Supprimer</Button>
                }>
                  Supprimer ce tarif ? Impossible s'il a déjà servi à une cotisation : corrigez-le plutôt.
                </Alert>
              )}
              {erreur && <Alert severity="error">{erreur}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            {edition !== 'nouveau' && !confirmer && <Button color="error" onClick={() => setConfirmer(true)} sx={{ mr: 'auto' }}>Supprimer…</Button>}
            <Button onClick={() => setEdition(null)}>Annuler</Button>
            <Button type="submit" variant="contained">Enregistrer</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Stack>
  )
}
