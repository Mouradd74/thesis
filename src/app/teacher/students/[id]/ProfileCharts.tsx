'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, Legend, Cell
} from 'recharts'

export function QuizTimelineChart({ data }: { data: { name: string, score: number }[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">No quizzes taken.</div>
  }

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#888" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            padding={{ left: 10, right: 10 }}
          />
          <YAxis 
            stroke="#888" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
            domain={[0, 100]}
          />
          <RechartsTooltip 
            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5', borderRadius: '8px' }}
            itemStyle={{ color: '#10b981' }}
          />
          <Line 
            type="monotone" 
            dataKey="score" 
            stroke="#10b981" 
            strokeWidth={3} 
            dot={{ r: 4, strokeWidth: 2, fill: '#18181b' }} 
            activeDot={{ r: 6, fill: '#10b981' }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function EngagementRadarChart({ video, audio, text }: { video: number, audio: number, text: number }) {
  const data = [
    { subject: 'Video', A: video * 100, fullMark: 100 },
    { subject: 'Audio', A: audio * 100, fullMark: 100 },
    { subject: 'Text', A: text * 100, fullMark: 100 },
  ]

  if (video === 0 && audio === 0 && text === 0) {
    return <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">No interactions recorded.</div>
  }

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#333" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar name="Engagement" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
          <RechartsTooltip 
            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5', borderRadius: '8px' }}
            formatter={(value: number) => [`${Math.round(value)}%`, 'Engagement']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function SubjectComparisonChart({ data }: { data: { subject: string, score: number, mastery: number, theta: number }[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">Not enough data to compare subjects.</div>
  }

  // Normalize theta from [-3, 3] to [0, 100] for visual comparison alongside score/mastery
  const normalizedData = data.map(d => ({
    ...d,
    thetaNormalized: Math.max(0, Math.min(100, ((d.theta + 3) / 6) * 100))
  }))

  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={normalizedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          <XAxis dataKey="subject" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
          <RechartsTooltip 
             contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5', borderRadius: '8px' }}
             cursor={{ fill: '#27272a', opacity: 0.4 }}
             formatter={(value: number, name: string) => {
               if (name === 'thetaNormalized') return [`${Math.round(value)}% (Relative)`, 'Cognitive Ability']
               return [`${Math.round(value)}%`, name === 'score' ? 'Avg Score' : 'Overall Mastery']
             }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
          <Bar dataKey="score" name="Avg Score" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="mastery" name="Overall Mastery" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="thetaNormalized" name="Cognitive Ability (θ)" fill="#a855f7" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
