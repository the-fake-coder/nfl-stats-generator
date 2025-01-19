import { NextResponse } from 'next/server';
import OpenAI from 'openai';

interface Stat {
  name: string;
  value: string;
  description: string;
}

interface ExtractedStats {
  passingYards: string;
  rushingYards: string;
  receivingYards: string;
  totalPoints: string;
  totalTouchdowns: string;
  sacks: string;
  interceptions: string;
  forcedFumbles: string;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CATEGORY_DISPLAY_NAMES: { [key: string]: string } = {
  general: 'Fumbles',
  passing: 'Passing',
  rushing: 'Rushing',
  receiving: 'Receiving',
  defensive: 'Defense',
  defensiveInterceptions: 'Interceptions',
  kicking: 'Kicking',
  returning: 'Returns',
  punting: 'Punting',
  scoring: 'Scoring',
  miscellaneous: 'Miscellaneous'
};

export async function POST(request: Request) {
  try {
    const { category, team1Stats, team2Stats, team1, team2 } = await request.json() as {
      category: string;
      team1Stats: Stat[];
      team2Stats: Stat[];
      team1: string;
      team2: string;
    };
    
    console.log('Received request for category:', category);
    console.log('Stats received:', { team1Stats, team2Stats });

    // If it's not "all categories", process normally
    if (category !== 'all categories') {
      const displayCategory = CATEGORY_DISPLAY_NAMES[category] || category;
      
      // Format the stats in a clear, structured way
      const statsComparison = team1Stats.map((stat: Stat, index: number) => {
        return `${stat.name}:
- ${team1}: ${stat.value}
- ${team2}: ${team2Stats[index].value}
- Description: ${stat.description}`;
      }).join('\n\n');

      console.log('Generated stats comparison:', statsComparison);

      const prompt = `Below are the EXACT statistics for the ${team1} and ${team2} in the ${displayCategory} category. Analyze ONLY these numbers:

${statsComparison}

Provide your analysis in the following format:

Analysis: Using ONLY the statistics shown above, provide an insightful summary (2-3 sentences) comparing the teams in this category. Focus on the most significant differences and key takeaways using the exact numbers provided.

${displayCategory} Winner: Based ONLY on these statistics, clearly state which team has the advantage in this category and explain why using specific numbers. If the numbers are too close (within 5% difference), declare it a "Draw" and explain why.

IMPORTANT: Use ONLY the statistics provided above. Do not reference any other data, historical matchups, or external factors.`;

      console.log('Sending prompt to OpenAI:', prompt);

      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "gpt-4",
        temperature: 0.5,
        max_tokens: 1000
      });

      console.log('Received OpenAI response:', completion.choices[0].message.content);

      return NextResponse.json({ 
        summary: completion.choices[0].message.content 
      });
    }

    // For "all categories", create a summary of key findings
    console.log('Processing all categories analysis');
    
    // Extract key statistics for easier reference
    const team1ExtractedStats: ExtractedStats = {
      passingYards: team1Stats.find((s: Stat) => s.name.includes('Passing Yards') || s.name.includes('Net Passing'))?.value || 'N/A',
      rushingYards: team1Stats.find((s: Stat) => s.name.includes('Rushing Yards') || s.name.includes('Rush Yards'))?.value || 'N/A',
      receivingYards: team1Stats.find((s: Stat) => s.name.includes('Receiving Yards') || s.name.includes('Rec Yards'))?.value || 'N/A',
      totalPoints: team1Stats.find((s: Stat) => s.name.includes('Points') || s.name.includes('Total Points'))?.value || 'N/A',
      totalTouchdowns: team1Stats.find((s: Stat) => s.name.includes('Touchdowns') || s.name.includes('Total TD'))?.value || 'N/A',
      sacks: team1Stats.find((s: Stat) => s.name.includes('Sacks') || s.name.includes('Total Sacks'))?.value || 'N/A',
      interceptions: team1Stats.find((s: Stat) => s.name.includes('Interceptions') || s.name.includes('INT'))?.value || 'N/A',
      forcedFumbles: team1Stats.find((s: Stat) => s.name.includes('Fumbles Forced') || s.name.includes('Forced Fumbles'))?.value || 'N/A'
    };

    const team2ExtractedStats: ExtractedStats = {
      passingYards: team2Stats.find((s: Stat) => s.name.includes('Passing Yards') || s.name.includes('Net Passing'))?.value || 'N/A',
      rushingYards: team2Stats.find((s: Stat) => s.name.includes('Rushing Yards') || s.name.includes('Rush Yards'))?.value || 'N/A',
      receivingYards: team2Stats.find((s: Stat) => s.name.includes('Receiving Yards') || s.name.includes('Rec Yards'))?.value || 'N/A',
      totalPoints: team2Stats.find((s: Stat) => s.name.includes('Points') || s.name.includes('Total Points'))?.value || 'N/A',
      totalTouchdowns: team2Stats.find((s: Stat) => s.name.includes('Touchdowns') || s.name.includes('Total TD'))?.value || 'N/A',
      sacks: team2Stats.find((s: Stat) => s.name.includes('Sacks') || s.name.includes('Total Sacks'))?.value || 'N/A',
      interceptions: team2Stats.find((s: Stat) => s.name.includes('Interceptions') || s.name.includes('INT'))?.value || 'N/A',
      forcedFumbles: team2Stats.find((s: Stat) => s.name.includes('Fumbles Forced') || s.name.includes('Forced Fumbles'))?.value || 'N/A'
    };

    const statsComparison = `
OFFENSIVE STATISTICS:
Passing Yards:
- ${team1}: ${team1ExtractedStats.passingYards}
- ${team2}: ${team2ExtractedStats.passingYards}

Rushing Yards:
- ${team1}: ${team1ExtractedStats.rushingYards}
- ${team2}: ${team2ExtractedStats.rushingYards}

Receiving Yards:
- ${team1}: ${team1ExtractedStats.receivingYards}
- ${team2}: ${team2ExtractedStats.receivingYards}

SCORING:
Total Points:
- ${team1}: ${team1ExtractedStats.totalPoints}
- ${team2}: ${team2ExtractedStats.totalPoints}

Total Touchdowns:
- ${team1}: ${team1ExtractedStats.totalTouchdowns}
- ${team2}: ${team2ExtractedStats.totalTouchdowns}

DEFENSIVE STATISTICS:
Sacks:
- ${team1}: ${team1ExtractedStats.sacks}
- ${team2}: ${team2ExtractedStats.sacks}

Interceptions:
- ${team1}: ${team1ExtractedStats.interceptions}
- ${team2}: ${team2ExtractedStats.interceptions}

Forced Fumbles:
- ${team1}: ${team1ExtractedStats.forcedFumbles}
- ${team2}: ${team2ExtractedStats.forcedFumbles}`;
    
    const prompt = `Below are the EXACT statistics for the ${team1} and ${team2}:

${statsComparison}

Based ONLY on these statistics, analyze the matchup. Structure your response as follows:

Offensive Analysis:
Compare the offensive production using the EXACT numbers above. Highlight the differences in passing, rushing, and receiving yards. Calculate and mention the total yardage difference between the teams.

Defensive Analysis:
Compare the defensive performance using the EXACT numbers above for sacks, interceptions, and forced fumbles. Calculate and mention the total turnover potential (interceptions + forced fumbles) for each team.

Statistical Advantages:
List specific statistical advantages for each team with exact numerical differences.

Score Prediction:
1. Calculate the average points per game for each team using their total points and games played (assume 17 games)
2. Factor in the opponent's defensive stats (turnovers forced)
3. Provide a specific score prediction with reasoning based purely on these statistics
4. Explain which key statistical matchup will most influence this outcome

IMPORTANT: Use ONLY the statistics provided above. Do not reference any other data, historical matchups, or external factors. If you mention a statistic, you must include the exact number from above.`;

    console.log('Sending all categories prompt to OpenAI');

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4",
      temperature: 0.5,
      max_tokens: 750
    });

    console.log('Received all categories OpenAI response:', completion.choices[0].message.content);

    return NextResponse.json({ 
      summary: completion.choices[0].message.content 
    });

  } catch (error) {
    console.error('Error analyzing stats:', error);
    return NextResponse.json(
      { error: 'Failed to analyze stats comparison.' },
      { status: 500 }
    );
  }
} 