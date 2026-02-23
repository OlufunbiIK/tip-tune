import React from 'react'

export default function CollaboratorsList({ collaborators }:{collaborators:any[]}){
  return (
    <div className="flex items-center gap-2">
      {collaborators.slice(0,6).map((c, i) => (
        <div key={i} title={c?.name} className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold" style={{background:c?.color||'#ddd'}}>
          {c?.name?.[0] || '?'}
        </div>
      ))}
      {collaborators.length > 6 && <div className="text-sm text-gray-500">+{collaborators.length-6}</div>}
    </div>
  )
}
