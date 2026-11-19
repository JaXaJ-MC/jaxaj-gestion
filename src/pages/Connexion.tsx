import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { connexion } from '../api/client'
import { useSession } from '../api/session'
import { CHARTE } from '../theme'
import { Logo } from '../composants/Embleme'

export function Connexion() {
  const { utilisateur } = useSession()
  const naviguer = useNavigate()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  if (utilisateur) return <Navigate to="/" replace />

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)
    try {
      await connexion(email, motDePasse)
      naviguer('/')
    } catch (err) {
      setErreur((err as Error).message)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 400, overflow: 'hidden' }}>
        <Box sx={{ bgcolor: CHARTE.noir, py: 2.5, textAlign: 'center' }}><Logo taille="1.6rem" /></Box>
        <Box sx={{ height: 3, background: `linear-gradient(90deg, ${CHARTE.jokerVert} 50%, ${CHARTE.jokerViolet} 50%)` }} />
        <CardContent component="form" onSubmit={soumettre} sx={{ p: 3 }}>
          <Stack spacing={2.2}>
            <Typography variant="h6" component="h1" align="center">Gestion du club</Typography>
            <TextField label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" autoFocus />
            <TextField label="Mot de passe" type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required autoComplete="current-password" />
            {erreur && <Alert severity="error">{erreur}</Alert>}
            <Button type="submit" variant="contained" size="large" disabled={envoi}>{envoi ? 'Connexion…' : 'Se connecter'}</Button>
            <Link href="/comptes/compte/mot-de-passe-oublie" align="center" color="secondary" variant="body2">Mot de passe oublié ?</Link>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
