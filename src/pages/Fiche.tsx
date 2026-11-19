import Add from '@mui/icons-material/Add'
import Edit from '@mui/icons-material/Edit'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState } from 'react'
import { Link as LienRouteur, useParams } from 'react-router'
import { aLeDroit, api } from '../api/client'
import { useReference } from '../api/reference'
import { aujourdhuiIso, dateFr, enCoursLe, euros, idDe, nomComplet, periodeFr, telephoneFr, type Acces, type Adhesion, type Cotisation, type Personne } from '../api/types'
import { ActionsAdhesion } from '../composants/ActionsAdhesion'
import { BlocCompte } from '../composants/BlocCompte'
import { BlocRoles } from '../composants/BlocRoles'
import { Definitions } from '../composants/Definitions'
import { EtiquetteAssociation } from '../composants/Etiquette'
import { LigneHistorique, Section } from '../composants/Section'

export function Fiche() {
  const { id } = useParams()
  const ref = useReference()
  const [personne, setPersonne] = useState<Personne | null>(null)
  const [adhesions, setAdhesions] = useState<Adhesion[]>([])
  const [cotisations, setCotisations] = useState<Cotisation[]>([])
  const [acces, setAcces] = useState<Acces | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [aujourdhui] = useState(aujourdhuiIso)

  const charger = useCallback(() => {
    Promise.all([
      api<Personne>('membres', `/api/personnes/${id}`),
      api<Adhesion[]>('membres', `/api/adhesions?membre=${id}&itemsPerPage=200`),
      api<Cotisation[]>('membres', `/api/cotisations?membre=${id}&itemsPerPage=200`),
      api<Acces>('membres', `/api/personnes/${id}/acces`),
    ]).then(([p, a, c, x]) => {
      setPersonne(p)
      setAdhesions([...a].sort((u, v) => v.debut.localeCompare(u.debut)))
      setCotisations([...c].sort((u, v) => v.debut.localeCompare(u.debut)))
      setAcces(x)
    }).catch((e) => setErreur(e.message))
  }, [id])
  useEffect(charger, [charger])

  if (erreur) return <Alert severity="error">{erreur}</Alert>
  if (!personne) return <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>

  const organisation = (iri: string | null) => ref?.organisations.find((o) => o.id === idDe(iri))
  const categorie = (iri: string) => ref?.categories.find((c) => c.code === idDe(iri))
  const adhesionDe = (iri: string) => adhesions.find((a) => a.id === idDe(iri))
  // Coordonnées : selon les droits (l'API omet les champs vides, leur absence ne dit rien).
  const detail = aLeDroit('membres', 'admin', 'gestion')
  const gestion = aLeDroit('membres', 'admin', 'gestion')
  const a = personne.adresse

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
        <Typography variant="h1">{nomComplet(personne)}</Typography>
        <Chip size="small" color={acces?.acces ? 'success' : 'default'} variant={acces?.acces ? 'filled' : 'outlined'}
          label={acces?.acces ? 'Accès autorisé aujourd\'hui' : 'Pas d\'accès aujourd\'hui'} />
      </Stack>

      <Stack direction="row" spacing={1}>
        <Button variant="outlined" startIcon={<Edit />} component={LienRouteur} to={`/personnes/${id}/modifier`}>Modifier</Button>
        <Button variant="contained" startIcon={<Add />} component={LienRouteur} to={`/personnes/${id}/adhesion`}>Nouvelle adhésion</Button>
      </Stack>

      {detail && (
        <Section titre="Coordonnées">
          <Definitions lignes={[
            ['Téléphone', personne.telephone ? <Link href={`tel:${personne.telephone}`} color="secondary">{telephoneFr(personne.telephone)}</Link> : '—'],
            ['E-mail', personne.email ? <Link href={`mailto:${personne.email}`} color="secondary">{personne.email}</Link> : '—'],
            ['Adresse', a ? [a.ligne1, a.ligne2, [a.code_postal, a.ville].filter(Boolean).join(' '), a.pays !== 'FR' ? a.pays : null].filter(Boolean).join(', ') : '—'],
            ['Naissance', dateFr(personne.dateNaissance) || '—'],
            ...(personne.commentaire ? [['Commentaire', personne.commentaire] as [string, string]] : []),
          ]} />
        </Section>
      )}

      <Section titre="Adhésions">
        {adhesions.length === 0 && <Typography color="text.secondary">Aucune adhésion.</Typography>}
        {adhesions.map((ad) => {
          const enCours = enCoursLe(ad.debut, ad.fin, aujourdhui)
          return (
            <LigneHistorique key={ad.id} enCours={enCours}>
              <EtiquetteAssociation organisation={organisation(ad.association)} />
              <Typography sx={{ fontWeight: 600 }}>{categorie(ad.categorie)?.libelle ?? idDe(ad.categorie)}</Typography>
              <Typography variant="body2" color="text.secondary">
                {ad.fin ? `du ${dateFr(ad.debut)} au ${dateFr(ad.fin)}` : `depuis le ${dateFr(ad.debut)}`}
                {ad.auTitreDe && ` · au titre de ${organisation(ad.auTitreDe)?.nom}`}
              </Typography>
              {enCours && gestion && <ActionsAdhesion adhesion={ad} categories={ref?.categories ?? []} apres={charger} />}
            </LigneHistorique>
          )
        })}
      </Section>

      <BlocRoles personne={personne.id} organisations={ref?.organisations ?? []} />

      <Section titre="Cotisations">
        {cotisations.length === 0 && <Typography color="text.secondary">Aucune cotisation.</Typography>}
        {cotisations.length > 0 && (
          <Table size="small">
            <TableBody>
              {cotisations.map((c) => (
                <TableRow key={c.id} sx={{ '&:last-child td': { border: 0 } }}>
                  <TableCell sx={{ pl: 0, whiteSpace: 'nowrap' }}>{periodeFr(c.debut, c.fin)}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <EtiquetteAssociation organisation={organisation(adhesionDe(c.adhesion)?.association ?? null)} />
                  </TableCell>
                  <TableCell align="right" sx={{ pr: 0, whiteSpace: 'nowrap' }} title={c.motifGratuite ?? ''}>
                    {c.gratuite ? 'gratuite' : euros(c.montant)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      {aLeDroit('comptes', 'admin') && <BlocCompte personne={personne} />}
    </Stack>
  )
}
