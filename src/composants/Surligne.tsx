import { decouper } from '../texte'

export function Surligne({ texte, mots }: { texte: string, mots: string[] }) {
  return <>{decouper(texte, mots).map((m, i) => (m.trouve ? <mark key={i}>{m.texte}</mark> : m.texte))}</>
}
