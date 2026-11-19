import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { aLeDroit, api, ErreurApi } from '../api/client'
import { useReference } from '../api/reference'
import { aujourdhuiIso, nomComplet, type Personne } from '../api/types'
import { ChampDate } from '../composants/ChampDate'

/** Nouvelle adhésion pour une personne. L'accueil ne propose que « adhérent événement ». */
export function FormulaireAdhesion() {
  const { id } = useParams()
  const naviguer = useNavigate()
  const ref = useReference()
  const [personne, setPersonne] = useState<Personne | null>(null)
  const accueilSeul = !aLeDroit('membres', 'admin', 'gestion')
  const [association, setAssociation] = useState('')
  const [categorie, setCategorie] = useState(accueilSeul ? 'public' : '')
  const [debut, setDebut] = useState(aujourdhuiIso)
  const [fin, setFin] = useState('')
  const [auTitreDe, setAuTitreDe] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => { api<Personne>('membres', `/api/personnes/${id}`).then(setPersonne).catch((e) => setErreur(e.message)) }, [id])

  const associations = ref?.organisations.filter((o) => o.genre === 'association_jaxaj') ?? []
  const autres = ref?.organisations.filter((o) => o.genre !== 'association_jaxaj') ?? []
  const categories = (ref?.categories ?? []).filter((c) => !accueilSeul || c.code === 'public')

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)
    try {
      await api('membres', '/api/adhesions', {
        methode: 'POST',
        corps: {
          membre: `/api/personnes/${id}`, association: `/api/organisations/${association}`, categorie: `/api/categories/${categorie}`,
          debut, fin: fin || null, auTitreDe: auTitreDe ? `/api/organisations/${auTitreDe}` : null,
        },
      })
      naviguer(`/personnes/${id}`)
    } catch (err) {
      setErreur((err as ErreurApi).message)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h1">
        Nouvelle adhésion
        {personne && <Typography component="span" color="text.secondary" sx={{ fontSize: '1rem', fontWeight: 400 }}> — {nomComplet(personne)}</Typography>}
      </Typography>
      <Card component="form" onSubmit={soumettre}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack spacing={2.5}>
            <TextField select label="Association" value={association} onChange={(e) => setAssociation(e.target.value)} required>
              {associations.map((a) => <MenuItem key={a.id} value={a.id}>{a.nom}</MenuItem>)}
            </TextField>
            <TextField select label="Catégorie" value={categorie} onChange={(e) => setCategorie(e.target.value)} required>
              {categories.map((c) => <MenuItem key={c.code} value={c.code}>{c.libelle}</MenuItem>)}
            </TextField>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <ChampDate libelle="Début" valeur={debut} changer={setDebut} requis />
              <ChampDate libelle="Fin (incluse, vide = en cours)" valeur={fin} changer={setFin} />
            </Box>
            {autres.length > 0 && (
              <TextField select label="Au titre de (club ou association représenté)" value={auTitreDe} onChange={(e) => setAuTitreDe(e.target.value)}>
                <MenuItem value="">—</MenuItem>
                {autres.map((a) => <MenuItem key={a.id} value={a.id}>{a.nom}</MenuItem>)}
              </TextField>
            )}
            {erreur && <Alert severity="error">{erreur}</Alert>}
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
