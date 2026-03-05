import { ExternalLink, MapPin, Navigation, Flag, Clock } from 'lucide-react'

export type TripTimelineNode = {
    type: 'start' | 'waypoint' | 'end'
    label: string
    lat?: number
    lng?: number
    url?: string
    odo?: number
    time?: Date
    address?: string
}

function parseMeta(notes: string) {
    const metaMatch = notes.match(/\[TRIPMETA:([^\]]+)\]/)
    if (!metaMatch) return {}
    return Object.fromEntries(metaMatch[1].split(',').map(e => {
        const i = e.indexOf('=')
        return [e.slice(0, i), e.slice(i + 1)]
    }))
}

export function parseTripTimeline(trip: any): TripTimelineNode[] {
    const notes = trip.notes || ''
    const lines = notes.split('\n')
    const nodes: TripTimelineNode[] = []

    let currentNode: Partial<TripTimelineNode> | null = null
    const meta = parseMeta(notes)

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        const tagMatch = line.match(/\[(Start|Waypoint|End)\]/)
        if (tagMatch) {
            if (currentNode) nodes.push(currentNode as TripTimelineNode)

            const typeStr = tagMatch[1].toLowerCase() as 'start' | 'waypoint' | 'end'
            currentNode = {
                type: typeStr,
                label: typeStr === 'start' ? 'Bắt đầu' : typeStr === 'end' ? 'Kết thúc' : 'Điểm dừng'
            }

            const coordMatch = line.match(/([-\d.]+),\s*([-\d.]+)/)
            if (coordMatch) {
                currentNode.lat = parseFloat(coordMatch[1])
                currentNode.lng = parseFloat(coordMatch[2])
            }

            const odoMatch = line.match(/Odo:\s*([\d.]+)/)
            if (odoMatch) {
                currentNode.odo = parseFloat(odoMatch[1])
            }

            const timeMatch = line.match(/Time:\s*([^|\s]+)/) // Matches until space or pipe
            if (timeMatch && timeMatch[1]) {
                currentNode.time = new Date(timeMatch[1])
            }
            continue;
        }

        if (currentNode) {
            const urlMatch = line.match(/https:\/\/www\.google\.com\/maps\?q=[-\d.,]+/)
            if (urlMatch) {
                currentNode.url = urlMatch[0]
                continue;
            }
            const addrMatch = line.match(/Địa điểm ghé:\s*(.+)/)
            if (addrMatch) {
                currentNode.address = addrMatch[1]
                continue;
            }
        }
    }
    if (currentNode) nodes.push(currentNode as TripTimelineNode)

    // Synthesize start/end if totally manual or missing
    if (!nodes.find(n => n.type === 'start')) {
        nodes.unshift({
            type: 'start',
            label: 'Bắt đầu',
            odo: trip.start_km,
            time: meta.started_at ? new Date(meta.started_at) : new Date(`${trip.trip_date}T${trip.trip_time || '00:00'}`),
            address: trip.start_location
        })
    }

    if (meta.status === 'completed' || trip.end_km > trip.start_km) {
        if (!nodes.find(n => n.type === 'end')) {
            nodes.push({
                type: 'end',
                label: 'Kết thúc',
                odo: trip.end_km,
                time: meta.completed_at ? new Date(meta.completed_at) : undefined,
                address: trip.end_location
            })
        }
    }

    return nodes
}

export function TripGPSDisplay({ trip }: { trip: any }) {
    const nodes = parseTripTimeline(trip)
    if (nodes.length === 0) return null

    return (
        <div className="mt-3 relative">
            <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-slate-200"></div>

            <div className="space-y-4 relative z-10">
                {nodes.map((node, i) => {
                    const prevNode = i > 0 ? nodes[i - 1] : null
                    const dist = prevNode && node.odo !== undefined && prevNode.odo !== undefined
                        ? (node.odo - prevNode.odo)
                        : null
                    const mins = prevNode && node.time && prevNode.time
                        ? Math.round((node.time.getTime() - prevNode.time.getTime()) / 60000)
                        : null

                    const Icon = node.type === 'start' ? Navigation : node.type === 'end' ? Flag : MapPin
                    const colorAttr = node.type === 'start' ? 'text-blue-500 bg-blue-100 border-blue-200' :
                        node.type === 'end' ? 'text-green-500 bg-green-100 border-green-200' :
                            'text-cyan-500 bg-cyan-100 border-cyan-200'

                    const timeStr = node.time ? node.time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '---'

                    return (
                        <div key={i} className="flex gap-4 items-start">
                            <div className="flex flex-col items-center flex-shrink-0 mt-1">
                                <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center bg-white ${colorAttr}`}>
                                    <Icon className="h-4 w-4" />
                                </div>
                            </div>

                            <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3 shadow-sm">
                                <div className="flex items-start justify-between mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-[13px] font-bold ${colorAttr.split(' ')[0]}`}>{node.label}</span>
                                        <span className="text-[10.5px] text-slate-400 font-medium">({timeStr})</span>
                                    </div>
                                    {node.odo !== undefined ? (
                                        <div className="text-xs font-mono font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                            {node.odo.toLocaleString()} km
                                        </div>
                                    ) : (
                                        <div className="text-xs font-mono font-semibold text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-md">
                                            -- km
                                        </div>
                                    )}
                                </div>

                                {node.address && (
                                    <p className="text-[13px] font-medium text-slate-700 leading-snug mb-2">
                                        {node.address}
                                    </p>
                                )}

                                {(() => {
                                    const mapUrl = node.url ||
                                        (node.lat && node.lng ? `https://www.google.com/maps?q=${node.lat},${node.lng}` :
                                            node.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(node.address)}` : null);

                                    return (
                                        <>
                                            {(node.lat && node.lng) ? (
                                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100/60">
                                                    <p className="text-[10px] font-mono text-slate-500 flex-1">
                                                        {node.lat.toFixed(6)}, {node.lng.toFixed(6)}
                                                    </p>
                                                    {mapUrl && (
                                                        <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-[10.5px] shrink-0 flex items-center gap-1 font-semibold text-blue-600 bg-blue-50/80 hover:bg-blue-100 border border-blue-100 px-2.5 py-1 rounded-lg transition-colors">
                                                            <ExternalLink className="h-3 w-3" /> Bản đồ
                                                        </a>
                                                    )}
                                                </div>
                                            ) : mapUrl ? (
                                                <div className="flex justify-end mt-2 pt-2 border-t border-slate-100/60">
                                                    <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-[10.5px] flex items-center gap-1 font-semibold text-blue-600 bg-blue-50/80 hover:bg-blue-100 border border-blue-100 px-2.5 py-1 rounded-lg transition-colors">
                                                        <ExternalLink className="h-3 w-3" /> Xem bản đồ
                                                    </a>
                                                </div>
                                            ) : null}
                                        </>
                                    )
                                })()}

                                {prevNode && (dist !== null || mins !== null) && (
                                    <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 flex items-center gap-4 text-xs">
                                        {dist !== null && (
                                            <span className="flex items-center gap-1 text-slate-600">
                                                <Navigation className="h-3 w-3 text-slate-400" /> +{dist.toLocaleString()} km
                                            </span>
                                        )}
                                        {mins !== null && (
                                            <span className="flex items-center gap-1 text-slate-600">
                                                <Clock className="h-3 w-3 text-slate-400" /> +{mins} phút
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export function getTripCleanNotes(notes: string): string {
    if (!notes) return ''
    const lines = notes.split('\n')
    const cleanLines = lines.filter(line => {
        if (line.match(/\[(Start|End|Waypoint|TRIPMETA)/)) return false
        if (line.match(/https:\/\/www\.google\.com\/maps/)) return false
        if (line.match(/Địa điểm ghé:/)) return false
        return true
    })
    return cleanLines.join('\n').trim()
}

