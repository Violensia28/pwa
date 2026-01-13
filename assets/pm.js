export function computeNextDue(last,days){ if(!last||!days) return ''; const d=new Date(last+'T00:00:00'); d.setDate(d.getDate()+Number(days)); return d.toISOString().slice(0,10);} 
