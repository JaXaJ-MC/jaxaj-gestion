import 'dayjs/locale/fr'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { frFR } from '@mui/x-date-pickers/locales'
import dayjs from 'dayjs'

// Le calendrier (MUI X) n'est chargé qu'avec les écrans qui en ont besoin : son fournisseur de
// dates et sa traduction sont déclarés ici, pas dans le point d'entrée de l'appli.
const textes = frFR.components.MuiLocalizationProvider.defaultProps.localeText

/** Sélecteur de date de l'appli (identique sur tous les navigateurs). Valeur : « AAAA-MM-JJ » ou « ». */
export function ChampDate({ libelle, valeur, changer, requis = false, aide, erreur, max }: {
  libelle: string, valeur: string, changer: (v: string) => void, requis?: boolean
  aide?: string    // texte d'aide sous le champ
  erreur?: string  // message d'erreur : le champ passe en rouge
  max?: string
}) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr" localeText={textes}>
    <DatePicker
      label={libelle}
      value={valeur ? dayjs(valeur) : null}
      onChange={(v) => changer(v && v.isValid() ? v.format('YYYY-MM-DD') : '')}
      maxDate={max ? dayjs(max) : undefined}
      slotProps={{ textField: { required: requis, fullWidth: true, helperText: erreur ?? aide, error: !!erreur } }}
    />
    </LocalizationProvider>
  )
}
