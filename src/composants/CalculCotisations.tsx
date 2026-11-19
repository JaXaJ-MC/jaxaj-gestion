import Calculate from '@mui/icons-material/Calculate'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import { useRef, useState } from 'react'
import { Link as LienRouteur } from 'react-router'
import { api, ErreurApi } from '../api/client'
import { useReference } from '../api/reference'
import { euros } from '../api/types'
import { ChampDate } from './ChampDate'

interface SansTarif { association: string, categorie: string, debut: string, fin: string }  // mois AAAA-MM
interface Resultat { creees: number, total: string, reglees: number, conservees: number, sans_tarif: SansTarif[] }

/** « 2022-04 » → « avril 2022 » */
const moisFr = (m: string) => new Date(`${m}-01T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

/** Dernier jour du mois précédent : par défaut, tout ce qui précède le mois en cours est réglé. */
const finDuMoisDernier = () => {
  const d = new Date()
  d.setDate(0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * « Calculer les cotisations » (administration) : toutes les cotisations dues d'après les
 * adhésions et les tarifs, avec un aperçu avant d'enregistrer. Relançable après la correction
 * d'un tarif ou d'une adhésion : le calcul précédent est remplacé, les vrais paiements restent.
 */
export function CalculCotisations({ personne, apres }: { personne: string, apres: () => void }) {
  const [ouvert, setOuvert] = useState(false)
  const [jusquau, setJusquau] = useState(finDuMoisDernier)
  const [apercu, setApercu] = useState<Resultat | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const ref = useReference()
  const association = (id: string) => ref?.organisations.find((o) => o.id === id)?.nom ?? 'association inconnue'
  const categorie = (code: string) => ref?.categories.find((c) => c.code === code)?.libelle ?? code

  const appeler = (date: string, simuler: boolean) => api<Resultat>('membres', `/api/personnes/${personne}/cotisations/calcul`, {
    methode: 'POST', corps: { regleesJusquau: date || null, simuler },
  })

  // Aperçu à l'ouverture et à chaque changement de date ; seule la dernière demande compte.
  const derniere = useRef(0)
  function previsualiser(date: string) {
    const n = ++derniere.current
    setJusquau(date)
    setApercu(null)
    setErreur(null)
    appeler(date, true)
      .then((r) => n === derniere.current && setApercu(r))
      .catch((e) => n === derniere.current && setErreur(e.message))
  }

  async function calculer() {
    setEnCours(true)
    try {
      await appeler(jusquau, false)
      setOuvert(false)
      apres()
    } catch (err) {
      setErreur((err as ErreurApi).message)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <>
      <Button size="small" startIcon={<Calculate />} onClick={() => { previsualiser(finDuMoisDernier()); setOuvert(true) }}>
        Calculer les cotisations
      </Button>
      <Dialog open={ouvert} onClose={() => setOuvert(false)} fullWidth maxWidth="xs">
        <DialogTitle>Calculer les cotisations</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              D'après les adhésions et les tarifs : l'année civile pour un tarif annuel, le mois sinon, jusqu'au mois en cours. Un nouveau calcul remplace le précédent ; les cotisations réglées par un vrai paiement restent.
            </Typography>
            <ChampDate libelle="Considérer comme réglé jusqu'au (vide = rien)" valeur={jusquau} changer={previsualiser}
              aide="Paiements notés « Historique reconstitué », écartés des statistiques." />
            {!apercu && !erreur && <CircularProgress size={24} sx={{ alignSelf: 'center' }} />}
            {apercu && (
              <Alert severity={apercu.creees ? 'info' : 'warning'}>
                {apercu.creees
                  ? <>{apercu.creees} cotisation{apercu.creees > 1 ? 's' : ''} pour {euros(apercu.total)}, dont {apercu.reglees} considérée{apercu.reglees > 1 ? 's' : ''} comme réglée{apercu.reglees > 1 ? 's' : ''}.</>
                  : 'Aucune cotisation à créer.'}
                {apercu.conservees > 0 && <> {apercu.conservees} période{apercu.conservees > 1 ? 's' : ''} déjà couverte{apercu.conservees > 1 ? 's' : ''}, conservée{apercu.conservees > 1 ? 's' : ''}.</>}
              </Alert>
            )}
            {apercu && apercu.sans_tarif.length > 0 && (
              <Alert severity="warning">
                <Typography variant="body2" sx={{ mb: 0.5 }}>Aucun tarif en vigueur, rien n'est calculé pour :</Typography>
                {apercu.sans_tarif.map((t) => (
                  <Typography key={`${t.association}${t.categorie}${t.debut}`} variant="body2" sx={{ fontWeight: 600 }}>
                    {categorie(t.categorie)} · {association(t.association)}, {t.debut === t.fin ? moisFr(t.debut) : `d'${moisFr(t.debut)} à ${moisFr(t.fin)}`.replace(/^d'([^aeiouyé])/i, 'de $1')}
                  </Typography>
                ))}
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  Ajoutez le tarif dans <Link component={LienRouteur} to="/tarifs" color="inherit">Tarifs</Link> (pour cette association ou pour toutes), puis relancez le calcul.
                </Typography>
              </Alert>
            )}
            {erreur && <Alert severity="error">{erreur}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOuvert(false)}>Annuler</Button>
          <Button variant="contained" disabled={!apercu || enCours} onClick={calculer}>Calculer</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
