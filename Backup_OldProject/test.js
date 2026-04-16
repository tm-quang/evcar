const t = '[Start] 9.29, 105.72';
const r = /\[(?:Start|Waypoint|End)\]\s*([\d.-]+),\s*([\d.-]+)/g;
console.log([...t.matchAll(r)]);
