import { createTheme } from '@mui/material/styles'
import { frFR } from '@mui/material/locale'

/**
 * Thème sombre Material 3, aux couleurs du club :
 * - fonds gris très foncés plutôt que noir pur, de plus en plus clairs avec l'élévation ;
 * - le noir du Club réservé à la barre du haut ;
 * - le vert et le violet du Joker, éclaircis pour rester lisibles sur fond sombre, pour les
 *   actions et la mise en évidence ; les teintes d'origine servent à l'identité (liserés).
 */
export const CHARTE = {
  noir: '#000000',
  jokerVert: '#009543',
  jokerViolet: '#82368c',
  euskadiRouge: '#dc241f',
  euskadiVert: '#009543',
  bearnJaune: '#ffd700',
  bearnRouge: '#ff0000',
  bearnBleu: '#0000ff',
}

const SURFACE = { fond: '#121212', carte: '#1c1c1e', relief: '#26262a' }

export const theme = createTheme(
  {
    palette: {
      mode: 'dark',
      primary: { main: '#4cc38a', contrastText: '#002814' },
      secondary: { main: '#c792d9', contrastText: '#2d0a38' },
      success: { main: '#4cc38a' },
      error: { main: '#f2766b' },
      background: { default: SURFACE.fond, paper: SURFACE.carte },
      divider: 'rgba(255, 255, 255, 0.09)',
      text: { primary: 'rgba(255, 255, 255, 0.90)', secondary: 'rgba(255, 255, 255, 0.62)' },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
      h1: { fontSize: '1.55rem', fontWeight: 700 },
      h2: { fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.62)' },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          // passages trouvés par la recherche
          mark: { backgroundColor: 'rgba(255, 215, 0, 0.30)', color: 'inherit', borderRadius: 3, padding: '0 1px' },
        },
      },
      MuiAppBar: {
        styleOverrides: { root: { backgroundColor: CHARTE.noir, backgroundImage: 'none' } },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { border: '1px solid rgba(255, 255, 255, 0.06)' } },
      },
      MuiDialog: {
        styleOverrides: { paper: { backgroundColor: SURFACE.relief } },
      },
      MuiMenu: {
        styleOverrides: { paper: { backgroundColor: SURFACE.relief } },
      },
      MuiButton: { defaultProps: { disableElevation: true } },
      MuiTextField: { defaultProps: { fullWidth: true } },
      MuiChip: { styleOverrides: { label: { fontWeight: 600 } } },
    },
  },
  frFR,
)
