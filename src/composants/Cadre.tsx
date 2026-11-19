import AccountCircle from '@mui/icons-material/AccountCircle'
import PersonAdd from '@mui/icons-material/PersonAdd'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import IconButton from '@mui/material/IconButton'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Toolbar from '@mui/material/Toolbar'
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { deconnexion } from '../api/client'
import { useSession } from '../api/session'
import { CHARTE } from '../theme'
import { Logo } from './Embleme'

const lien = { color: 'rgba(255,255,255,.7)', '&.active': { color: '#fff', bgcolor: 'rgba(255,255,255,.10)' } }

export function Cadre() {
  const { utilisateur } = useSession()
  const naviguer = useNavigate()
  const [menu, setMenu] = useState<HTMLElement | null>(null)
  return (
    <>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ gap: 1 }}>
          <Box component={Link} to="/" sx={{ textDecoration: 'none', mr: 2 }}><Logo /></Box>
          <Button component={NavLink} to="/" end sx={lien}>Liste</Button>
          <Button component={NavLink} to="/personnes/nouvelle" sx={{ ...lien, display: { xs: 'none', sm: 'inline-flex' } }}>Nouvelle fiche</Button>
          <IconButton component={NavLink} to="/personnes/nouvelle" aria-label="Nouvelle fiche" sx={{ ...lien, display: { xs: 'inline-flex', sm: 'none' } }}>
            <PersonAdd />
          </IconButton>
          <Box sx={{ flex: 1 }} />
          <IconButton color="inherit" aria-label="Mon compte" onClick={(e) => setMenu(e.currentTarget)}>
            <AccountCircle />
          </IconButton>
          <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
            <MenuItem disabled><ListItemText primary={utilisateur?.username} secondary="connecté" /></MenuItem>
            <MenuItem onClick={async () => { setMenu(null); await deconnexion(); naviguer('/connexion') }}>Déconnexion</MenuItem>
          </Menu>
        </Toolbar>
        {/* liseré aux couleurs du Joker */}
        <Box sx={{ height: 3, background: `linear-gradient(90deg, ${CHARTE.jokerVert} 50%, ${CHARTE.jokerViolet} 50%)` }} />
      </AppBar>
      <Container maxWidth="md" sx={{ py: 3, pb: 6 }}>
        <Outlet />
      </Container>
    </>
  )
}
