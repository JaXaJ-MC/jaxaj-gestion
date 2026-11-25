import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { api, ErreurApi, gestionLimitee } from '../api/client'
import { useReference } from '../api/reference'
import { aujourdhuiIso, TYPES_FICHE, type Personne, type TypeFiche } from '../api/types'
import { ChampDate } from '../composants/ChampDate'

interface Champs {
  type: TypeFiche, nom: string, prenom: string, surnom: string, dateNaissance: string, telephone: string, email: string,
  ligne1: string, code_postal: string, ville: string, pays: string, commentaire: string
}

const vide: Champs = { type: 'personne', nom: '', prenom: '', surnom: '', dateNaissance: '', telephone: '', email: '',
  ligne1: '', code_postal: '', ville: '', pays: 'FR', commentaire: '' }

const grille = { display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }

/** Création (/personnes/nouvelle) ou modification (/personnes/:id/modifier) d'une fiche. */
export function FormulairePersonne() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const [champs, setChamps] = useState<Champs>({ ...vide, nom: params.get('nom') ?? '' })
  // Coordonnées : toujours à la création ; en modification, seulement si l'API les montre
  // (sinon on les effacerait en enregistrant des champs vides).
  const [detailVisible, setDetailVisible] = useState(false)
  const detail = !id || detailVisible
  // Gestion limitée à une association : la fiche n'est visible qu'avec une adhésion à celle-ci,
  // créée dans la foulée.
  const limitee = id ? null : gestionLimitee()
  const ref = useReference()
  const [association, setAssociation] = useState('')
  const [categorie, setCategorie] = useState('')
  const [erreur, setErreur] = useState<ErreurApi | null>(null)
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    if (!id) return
    api<Personne>('membres', `/api/personnes/${id}`).then((p) => {
      setDetailVisible(!!p.detail)
      setChamps({
        type: p.type ?? 'personne', nom: p.nom, prenom: p.prenom ?? '', surnom: p.surnom ?? '', dateNaissance: p.dateNaissance?.slice(0, 10) ?? '',
        telephone: p.telephone ?? '', email: p.email ?? '', commentaire: p.commentaire ?? '',
        ligne1: p.adresse?.ligne1 ?? '', code_postal: p.adresse?.code_postal ?? '', ville: p.adresse?.ville ?? '', pays: p.adresse?.pays ?? 'FR',
      })
    }).catch((e) => setErreur(e))
  }, [id])

  const associationsLimitees = (ref?.organisations ?? []).filter((o) => limitee?.includes(o.id))
  const associationChoisie = association || associationsLimitees[0]?.id || ''
  const voletChoisi = associationsLimitees.find((o) => o.id === associationChoisie)?.volet
  const categories = (ref?.categories ?? []).filter((c) => c.volet === voletChoisi && c.code !== 'association')

  const champ = (nom: keyof Champs, cleErreur: string = nom) => ({
    value: champs[nom],
    onChange: (e: { target: { value: string } }) => setChamps((c) => ({ ...c, [nom]: e.target.value })),
    error: !!erreur?.details[cleErreur],
    helperText: erreur?.details[cleErreur],
  })

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)
    const n = (v: string) => v.trim() || null
    // Artiste, club ou association : ni prénom, ni surnom, ni date de naissance.
    const personne = champs.type === 'personne'
    const corps: Record<string, unknown> = { type: champs.type, nom: champs.nom.trim(), prenom: personne ? n(champs.prenom) : null, surnom: personne ? n(champs.surnom) : null }
    if (detail) {
      Object.assign(corps, {
        dateNaissance: personne ? n(champs.dateNaissance) : null, telephone: n(champs.telephone), email: n(champs.email), commentaire: n(champs.commentaire),
        adresse: champs.ligne1 || champs.ville || champs.code_postal
          ? { ligne1: n(champs.ligne1), code_postal: n(champs.code_postal), ville: n(champs.ville), pays: champs.pays.toUpperCase() || 'FR' }
          : null,
      })
    }
    try {
      const p = await api<Personne>('membres', id ? `/api/personnes/${id}` : '/api/personnes', { methode: id ? 'PATCH' : 'POST', corps })
      if (limitee) {
        await api('membres', '/api/adhesions', { methode: 'POST', corps: {
          membre: `/api/personnes/${p.id}`, association: `/api/organisations/${associationChoisie}`,
          categorie: `/api/categories/${categorie}`, debut: aujourdhuiIso(),
        } })
      }
      naviguer(`/personnes/${p.id}`)
    } catch (err) {
      setErreur(err as ErreurApi)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h1">{id ? 'Modifier la fiche' : 'Nouvelle fiche'}</Typography>
      <Card component="form" onSubmit={soumettre}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack spacing={2.5}>
            <TextField select label="Type de fiche" value={champs.type} sx={{ maxWidth: { sm: 280 } }}
              onChange={(e) => setChamps((c) => ({ ...c, type: e.target.value as TypeFiche }))}>
              {Object.entries(TYPES_FICHE).map(([code, libelle]) => <MenuItem key={code} value={code}>{libelle}</MenuItem>)}
            </TextField>
            <Box sx={grille}>
              <TextField label={{ personne: 'Nom', artiste: 'Nom de l\'artiste ou du groupe', structure: 'Nom du club ou de l\'association' }[champs.type]}
                required autoFocus {...champ('nom')} sx={champs.type === 'personne' ? undefined : { gridColumn: { sm: 'span 3' } }} />
              {champs.type === 'personne' && <TextField label="Prénom" {...champ('prenom')} />}
              {champs.type === 'personne' && <TextField label="Surnom (nom de route)" {...champ('surnom')} />}
            </Box>
            {detail && (
              <>
                <Box sx={grille}>
                  {champs.type === 'personne' && <ChampDate libelle="Date de naissance" valeur={champs.dateNaissance} max={aujourdhuiIso()}
                    changer={(v) => setChamps((c) => ({ ...c, dateNaissance: v }))} erreur={erreur?.details.dateNaissance} />}
                  <TextField label="Téléphone" type="tel" {...champ('telephone')} />
                  <TextField label="E-mail" type="email" {...champ('email')} />
                </Box>
                <TextField label="Adresse" {...champ('ligne1', 'adresse')} />
                <Box sx={grille}>
                  <TextField label="Code postal" slotProps={{ htmlInput: { inputMode: 'numeric' } }} {...champ('code_postal')} />
                  <TextField label="Ville" {...champ('ville')} />
                  <TextField label="Pays (code ISO)" slotProps={{ htmlInput: { maxLength: 2 } }} {...champ('pays')} />
                </Box>
                <TextField label="Commentaire" multiline minRows={2} {...champ('commentaire')} />
              </>
            )}
            {limitee && (
              <Box sx={grille}>
                <TextField select label="Adhésion à" value={associationChoisie} onChange={(e) => { setAssociation(e.target.value); setCategorie('') }} required>
                  {associationsLimitees.map((o) => <MenuItem key={o.id} value={o.id}>{o.nom}</MenuItem>)}
                </TextField>
                <TextField select label="Niveau" value={categorie} onChange={(e) => setCategorie(e.target.value)} required
                  helperText="À partir d'aujourd'hui ; modifiable ensuite sur la fiche.">
                  {categories.map((c) => <MenuItem key={c.code} value={c.code}>{c.libelle}</MenuItem>)}
                </TextField>
              </Box>
            )}
            {erreur && !Object.keys(erreur.details).length && <Alert severity="error">{erreur.message}</Alert>}
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button onClick={() => naviguer(-1)}>Annuler</Button>
              <Button type="submit" variant="contained" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
