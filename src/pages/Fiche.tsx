import Add from '@mui/icons-material/Add'
import Cake from '@mui/icons-material/Cake'
import Edit from '@mui/icons-material/Edit'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState } from 'react'
import { Link as LienRouteur, useParams } from 'react-router'
import { aLeDroit, api, peut } from '../api/client'
import { useReference } from '../api/reference'
import { aujourdhuiIso, dateFr, enCoursLe, idDe, libelleDisparu, nomComplet, telephoneFr, TYPES_FICHE, type Acces, type Adhesion, type CotisationEtat, type Personne, type Role } from '../api/types'
import { ActionsAdhesion } from '../composants/ActionsAdhesion'
import { AnneauCompletude, manquantsFr, pourcentage, type Completude } from '../composants/Completude'
import { CorrigerPeriode } from '../composants/CorrigerPeriode'
import { BlocCompte } from '../composants/BlocCompte'
import { BlocCotisations } from '../composants/BlocCotisations'
import { CalculCotisations } from '../composants/CalculCotisations'
import { BlocRoles } from '../composants/BlocRoles'
import { Definitions } from '../composants/Definitions'
import { EtiquetteAssociation } from '../composants/Etiquette'
import { LigneHistorique, Section } from '../composants/Section'
import { dureeFr, fullPatch } from '../fullPatch'

export function Fiche() {
  const { id } = useParams()
  const ref = useReference()
  const [personne, setPersonne] = useState<Personne | null>(null)
  const [adhesions, setAdhesions] = useState<Adhesion[]>([])
  const [cotisations, setCotisations] = useState<CotisationEtat[]>([])
  const [acces, setAcces] = useState<Acces | null>(null)
  const [completude, setCompletude] = useState<Completude | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [version, setVersion] = useState(0)  // recharge le bloc des rôles
  const [cloture, setCloture] = useState<string | null>(null)  // erreur de « Clore »
  const [erreur, setErreur] = useState<string | null>(null)
  const [aujourdhui] = useState(aujourdhuiIso)

  const charger = useCallback(() => {
    Promise.all([
      api<Personne>('membres', `/api/personnes/${id}`),
      api<Adhesion[]>('membres', `/api/adhesions?membre=${id}&itemsPerPage=200`),
      api<CotisationEtat[]>('membres', `/api/personnes/${id}/cotisations`),
      api<Acces>('membres', `/api/personnes/${id}/acces`),
      api<Completude>('membres', `/api/personnes/${id}/completude`),
      api<Role[]>('membres', `/api/roles?personne=${id}&itemsPerPage=100`),
    ]).then(([p, a, c, x, k, r]) => {
      setCompletude(k)
      setRoles(r)
      setPersonne(p)
      setAdhesions([...a].sort((u, v) => v.debut.localeCompare(u.debut)))
      setCotisations(c)  // déjà triées, la plus récente d'abord
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
  const detail = !!personne.detail  // coordonnées visibles : l'API ne les envoie qu'à qui y a droit
  const gestion = peut('historique')
  const a = personne.adresse
  const fp = fullPatch(adhesions, aujourdhui)
  // Disparu : adhésions et rôles encore ouverts à la date de disparition (aujourd'hui si inconnue).
  const finDisparu = personne.disparuLe?.slice(0, 10) ?? aujourdhui
  const ouvert = (x: { debut: string, fin: string | null }) => x.debut.slice(0, 10) <= finDisparu && (!x.fin || x.fin.slice(0, 10) > finDisparu)
  const aClore = personne.statut === 'disparu' ? [
    ...adhesions.filter((x) => ouvert(x) && peut('historique', idDe(x.association))).map((x) => `/api/adhesions/${x.id}`),
    ...roles.filter((x) => ouvert(x) && peut('historique', idDe(x.organisation))).map((x) => `/api/roles/${x.id}`),
  ] : []
  async function cloreTout() {
    setCloture(null)
    try {
      for (const chemin of aClore) await api('membres', chemin, { methode: 'PATCH', corps: { fin: finDisparu } })
      setVersion((v) => v + 1)
      charger()
    } catch (e) {
      setCloture((e as Error).message)
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
        <Typography variant="h1">{nomComplet(personne)}</Typography>
        {personne.type !== 'personne' && <Chip size="small" variant="outlined" label={TYPES_FICHE[personne.type]} />}
        {personne.statut === 'disparu' && <Chip size="small" label={`${libelleDisparu(personne.type)}${personne.disparuLe ? ` le ${dateFr(personne.disparuLe)}` : ''}`} />}
        <Chip size="small" color={acces?.acces ? 'success' : 'default'} variant={acces?.acces ? 'filled' : 'outlined'}
          label={acces?.acces ? 'Accès autorisé aujourd\'hui' : 'Pas d\'accès aujourd\'hui'} />
        {completude && <AnneauCompletude completude={completude} taille={34} />}
      </Stack>
      {completude && completude.manquants.length > 0 && (
        <Typography variant="body2" color="text.secondary">
          Fiche complète à {pourcentage(completude)} % · manque : {manquantsFr(completude)}.
        </Typography>
      )}

      <Stack direction="row" spacing={1}>
        {detail && <Button variant="outlined" startIcon={<Edit />} component={LienRouteur} to={`/personnes/${id}/modifier`}>Modifier</Button>}
        <Button variant="contained" startIcon={<Add />} component={LienRouteur} to={`/personnes/${id}/adhesion`}>Nouvelle adhésion</Button>
      </Stack>

      {gestion && aClore.length > 0 && (
        <Alert severity="info" action={<Button color="inherit" size="small" onClick={cloreTout}>Clore</Button>}>
          {aClore.length} adhésion{aClore.length > 1 ? 's' : ''} ou rôle{aClore.length > 1 ? 's' : ''} encore ouvert{aClore.length > 1 ? 's' : ''} : les clore au {dateFr(finDisparu)} ?
          {cloture && <Box sx={{ mt: 0.5 }}>{cloture}</Box>}
        </Alert>
      )}

      {fp && (
        <Section titre="Full patch">
          {fp.enCours && fp.anniversaire.dansJours === 0 && (
            <Alert severity="success" icon={<Cake />} sx={{ mb: 1.5 }}>Aujourd'hui : {fp.anniversaire.annees} an{fp.anniversaire.annees > 1 ? 's' : ''} depuis le premier passage full patch !</Alert>
          )}
          <Definitions lignes={[
            ['Temps de full patch', `${dureeFr(fp.duree)}${fp.periodes > 1 ? ` (en ${fp.periodes} périodes)` : ''}${fp.enCours ? '' : ', terminé'}`],
            ['Premier passage', dateFr(fp.premier)],
            ...(fp.enCours && fp.anniversaire.dansJours > 0 ? [['Prochain anniversaire',
              `${dateFr(fp.anniversaire.date)} : ${fp.anniversaire.annees} an${fp.anniversaire.annees > 1 ? 's' : ''}, dans ${fp.anniversaire.dansJours} jour${fp.anniversaire.dansJours > 1 ? 's' : ''}`] as [string, string]] : []),
          ]} />
        </Section>
      )}

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
              {ad.exemption && <Chip size="small" variant="outlined" label="exempté" title={ad.exemption} />}
              {enCours && peut('historique', idDe(ad.association)) && <ActionsAdhesion adhesion={ad} apres={charger}
                categories={(ref?.categories ?? []).filter((c) => c.volet === (organisation(ad.association)?.volet ?? c.volet))} />}
              {peut('historique', idDe(ad.association)) && <CorrigerPeriode chemin={`/api/adhesions/${ad.id}`} debut={ad.debut} fin={ad.fin} seul={!enCours} apres={charger} exemption={ad.exemption ?? null}
                libelle={`${categorie(ad.categorie)?.libelle ?? idDe(ad.categorie)} · ${organisation(ad.association)?.nom ?? ''}`} />}
            </LigneHistorique>
          )
        })}
      </Section>

      <BlocRoles key={version} personne={personne.id} organisations={ref?.organisations ?? []} />

      <Section titre="Cotisations" action={peut('historique') && <CalculCotisations personne={personne.id} apres={charger} />}>
        <BlocCotisations cotisations={cotisations} associationDe={(a) => organisation(adhesionDe(a)?.association ?? null)} />
      </Section>

      {aLeDroit('comptes', 'admin') && <BlocCompte personne={personne} />}
    </Stack>
  )
}
