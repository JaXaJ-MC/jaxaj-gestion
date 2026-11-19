import { useEffect, useState } from 'react'
import { api } from './client'
import type { Categorie, Organisation } from './types'

// Associations et catégories changent rarement : chargées une fois par session.
let cache: Promise<{ organisations: Organisation[], categories: Categorie[] }> | null = null

export function chargerReference() {
  cache ??= Promise.all([
    api<Organisation[]>('membres', '/api/organisations?itemsPerPage=200'),
    api<Categorie[]>('membres', '/api/categories'),
  ]).then(([organisations, categories]) => ({ organisations, categories }))
    .catch((e) => { cache = null; throw e })
  return cache
}

export function useReference() {
  const [ref, setRef] = useState<{ organisations: Organisation[], categories: Categorie[] } | null>(null)
  useEffect(() => { chargerReference().then(setRef).catch(() => setRef({ organisations: [], categories: [] })) }, [])
  return ref
}
