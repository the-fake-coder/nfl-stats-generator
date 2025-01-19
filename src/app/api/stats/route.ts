import { NextResponse } from 'next/server';

interface Category {
  name: string;
  stats: Array<{
    displayName: string;
    displayValue: string;
    description: string;
  }>;
}

const API_KEY = process.env.RAPIDAPI_KEY;
const API_HOST = 'nfl-api-data.p.rapidapi.com';

if (!API_KEY) {
  throw new Error('RAPIDAPI_KEY environment variable is not set');
}

// Team IDs mapping
const TEAMS = {
  texans: '34', // Houston Texans
  chiefs: '22', // Kansas City Chiefs
  lions: '16',  // Detroit Lions
  commanders: '28', // Washington Commanders
  rams: '14',   // Los Angeles Rams
  eagles: '21',  // Philadelphia Eagles
  ravens: '33',  // Baltimore Ravens
  bills: '2'    // Buffalo Bills
} as const;

type TeamKey = keyof typeof TEAMS;

const options = {
  method: 'GET',
  headers: {
    'X-RapidAPI-Key': API_KEY,
    'X-RapidAPI-Host': API_HOST,
    'Accept': 'application/json'
  }
};

// Function to get random stat type
function getRandomStatType() {
  const statTypes = [
    'passing',
    'rushing',
    'receiving',
    'defense',
    'scoring'
  ];
  return statTypes[Math.floor(Math.random() * statTypes.length)];
}

function findStatValue(category: any, statName: string) {
  if (!category?.stats) return null;
  const stat = category.stats.find((s: any) => s.name === statName);
  return stat?.value ?? null;
}

// Helper function to check if all required stats are present
function areStatsValid(stats: (number | null)[]): boolean {
  return stats.every(stat => stat !== null && stat !== undefined);
}

// Helper function to format stat value
function formatStatValue(displayValue: string, displayName: string) {
  // Handle QB Rating specifically
  if (displayName.toLowerCase().includes('quarterback rating') || 
      displayName.toLowerCase().includes('qb rating') ||
      displayName.toLowerCase().includes('passer rating') ||
      displayName.toLowerCase().includes('espn qb rating')) {
    const numValue = parseFloat(displayValue);
    if (numValue) {
      // If the value is over 158.3 (max possible traditional QB rating),
      // assume it's ESPN's format and divide by 100
      if (numValue > 158.3) {
        return (numValue / 100).toFixed(1);
      }
      return numValue.toFixed(1);
    }
    return displayValue;
  }
  return displayValue;
}

async function fetchTeamStats(teamId: string, year: string): Promise<Category[]> {
  const url = `https://${API_HOST}/nfl-team-statistics?id=${teamId}&year=${year}`;
  console.log('Requesting URL:', url);
  
  // Add retry logic
  let retries = 3;
  while (retries > 0) {
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('API Error Response:', data);
        throw new Error(`Failed to fetch NFL data: ${response.status} ${response.statusText}`);
      }

      // Check if we got an error response
      if (data.error) {
        console.error('API Error:', data.error);
        throw new Error(data.error);
      }

      if (!data?.statistics?.splits?.categories) {
        console.error('Invalid API Response Structure:', data);
        throw new Error('Invalid API response structure');
      }

      return data.statistics.splits.categories;
    } catch (error) {
      retries--;
      if (retries === 0) throw error;
      console.log(`Retrying... ${retries} attempts left`);
      // Wait for a second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error('Failed to fetch team stats after all retries');
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'passing';
    const team1 = (searchParams.get('team1') || 'texans') as TeamKey;
    const team2 = (searchParams.get('team2') || 'chiefs') as TeamKey;
    
    // Validate teams
    if (!TEAMS[team1] || !TEAMS[team2]) {
      return NextResponse.json({ 
        error: 'Invalid team selection. Available teams: ' + Object.keys(TEAMS).join(', ') 
      }, { status: 400 });
    }
    
    // Use 2023 for now since 2024 data isn't available yet
    const year = '2023';
    
    // Fetch stats for both teams
    const [team1Stats, team2Stats] = await Promise.all([
      fetchTeamStats(TEAMS[team1], year),
      fetchTeamStats(TEAMS[team2], year)
    ]);

    // Get the stats for the selected category
    const team1Cat = team1Stats.find((c: Category) => c.name === category);
    const team2Cat = team2Stats.find((c: Category) => c.name === category);

    if (!team1Cat || !team2Cat) {
      console.error('Category not found:', {
        category,
        team1Categories: team1Stats.map((c: Category) => c.name),
        team2Categories: team2Stats.map((c: Category) => c.name)
      });
      return NextResponse.json({ 
        error: `No stats found for category: ${category}. Available categories: ${team1Stats.map((c: Category) => c.name).join(', ')}` 
      }, { status: 404 });
    }

    // Return the formatted stats for both teams
    const response = {
      [team1]: team1Cat.stats.map(stat => ({
        name: stat.displayName,
        value: formatStatValue(stat.displayValue, stat.displayName),
        description: stat.description
      })),
      [team2]: team2Cat.stats.map(stat => ({
        name: stat.displayName,
        value: formatStatValue(stat.displayValue, stat.displayName),
        description: stat.description
      }))
    };

    console.log('Returning stats:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching NFL stats:', error);
    return NextResponse.json(
      { error: 'Failed to generate NFL stat. Please check the API endpoint and key.' },
      { status: 500 }
    );
  }
} 