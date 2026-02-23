import { useEffect, useMemo, useState, useRef } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { v4 as uuidv4 } from 'uuid'

type Track = {
  id: string
  title: string
  artist?: string
}

type Activity = {
  id: string
  userId: string
  userName?: string
  action: string
  track?: Track
  ts: number
}

export function useCollaboration(playlistId: string, userName = 'Anonymous') {
  const [tracks, setTracks] = useState<Track[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [collaborators, setCollaborators] = useState<any[]>([])

  const clientId = useMemo(() => uuidv4(), [])
  const docRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<WebsocketProvider | null>(null)

  useEffect(() => {
    const doc = new Y.Doc()
    docRef.current = doc

    const wsUrl = (import.meta.env.VITE_YJS_WS_URL as string) || 'wss://demos.yjs.dev'
    const room = `playlist-${playlistId}`
    const provider = new WebsocketProvider(wsUrl, room, doc)
    providerRef.current = provider

    // awareness for presence
    provider.awareness.setLocalStateField('user', {
      id: clientId,
      name: userName,
      color: '#'+Math.floor(Math.random()*16777215).toString(16)
    })

    const yArray = doc.getArray<Track>('tracks')

    const updateLocalFromY = () => {
      setTracks(yArray.toArray())
    }

    updateLocalFromY()

    const observer = () => updateLocalFromY()
    yArray.observe(observer)

    const onAwarenessChange = () => {
      const states = Array.from(provider.awareness.getStates().values())
      setCollaborators(states.map((s:any)=>s.user).filter(Boolean))
    }

    provider.awareness.on('change', onAwarenessChange)
    onAwarenessChange()

    return () => {
      yArray.unobserve(observer)
      provider.awareness.off('change', onAwarenessChange)
      provider.destroy()
      doc.destroy()
    }
  }, [playlistId, clientId, userName])

  const addTrack = (t: Omit<Track, 'id'>) => {
    const id = uuidv4()
    const track: Track = { id, ...t }
    const doc = docRef.current
    if (!doc) return
    const yArray = doc.getArray<Track>('tracks')

    // optimistic: apply locally immediately
    yArray.push([track])

    const act: Activity = {
      id: uuidv4(),
      userId: clientId,
      userName,
      action: 'added',
      track,
      ts: Date.now()
    }
    setActivities(a => [act, ...a].slice(0, 100))

    return id
  }

  const removeTrack = (id: string) => {
    const doc = docRef.current
    if (!doc) return
    const yArray = doc.getArray<Track>('tracks')
    const arr = yArray.toArray()
    const idx = arr.findIndex(t => t.id === id)
    if (idx !== -1) {
      yArray.delete(idx, 1)

      const act: Activity = {
        id: uuidv4(),
        userId: clientId,
        userName,
        action: 'removed',
        track: arr[idx],
        ts: Date.now()
      }
      setActivities(a => [act, ...a].slice(0, 100))
      return true
    }
    return false
  }

  return {
    tracks,
    addTrack,
    removeTrack,
    activities,
    collaborators
  }
}

export type { Track, Activity }
