'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowUp, Loader2 } from 'lucide-react';

interface Stat {
  name: string;
  value: string;
  description: string;
}

interface StatsData {
  [team: string]: Stat[];
}

interface StatsResponse {
  data?: StatsData;
  error?: string;
}

interface AnalysisResponse {
  summary: string;
  error?: string;
}

const TEAMS = {
  texans: { id: '34', name: 'Houston Texans', color: '#03202F' },
  chiefs: { id: '22', name: 'Kansas City Chiefs', color: '#E31837' },
  lions: { id: '16', name: 'Detroit Lions', color: '#0076B6' },
  commanders: { id: '28', name: 'Washington Commanders', color: '#5A1414' },
  rams: { id: '14', name: 'Los Angeles Rams', color: '#003594' },
  eagles: { id: '21', name: 'Philadelphia Eagles', color: '#004C54' },
  ravens: { id: '33', name: 'Baltimore Ravens', color: '#241773' },
  bills: { id: '2', name: 'Buffalo Bills', color: '#00338D' }
} as const;

type TeamKey = keyof typeof TEAMS;

const statCategories = [
  { value: 'passing', label: 'Passing Stats' },
  { value: 'rushing', label: 'Rushing Stats' },
  { value: 'receiving', label: 'Receiving Stats' },
  { value: 'defensive', label: 'Defensive Stats' },
  { value: 'general', label: 'Fumbles Stats' },
  { value: 'defensiveInterceptions', label: 'Interception Stats' },
  { value: 'kicking', label: 'Kicking Stats' },
  { value: 'returning', label: 'Return Stats' },
  { value: 'punting', label: 'Punting Stats' },
  { value: 'scoring', label: 'Scoring Stats' },
  { value: 'miscellaneous', label: 'Miscellaneous Stats' },
  { value: 'all', label: 'All Stats' }
];

const categoryOrder = statCategories
  .filter(cat => cat.value !== 'all')
  .map(cat => cat.value);

// Helper function to determine which value is better
function compareStats(stat1: string, stat2: string): number {
  // Convert string values to numbers, removing any non-numeric characters except decimal points
  const num1 = parseFloat(stat1.replace(/[^\d.-]/g, ''));
  const num2 = parseFloat(stat2.replace(/[^\d.-]/g, ''));
  
  // If we can't parse the numbers, return 0 (equal)
  if (isNaN(num1) || isNaN(num2)) return 0;
  
  // Return the comparison result (higher number wins)
  return num1 - num2;
}

export default function StatGenerator() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(statCategories[0].value);
  const [team1, setTeam1] = useState<TeamKey>('texans');
  const [team2, setTeam2] = useState<TeamKey>('chiefs');

  // Function to handle category change
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    generateStat(category);
  };

  // Updated generateStat to accept category parameter
  const generateStat = async (category?: string) => {
    const categoryToUse = category || selectedCategory;
    try {
      setLoading(true);
      setAnalysisLoading(true);
      setAnalysis(null);
      setStats(null);
      
      if (categoryToUse === 'all') {
        // Fetch all categories
        const allStats = await Promise.all(
          categoryOrder.map(async (category) => {
            const response = await fetch(`/api/stats?category=${category}&team1=${team1}&team2=${team2}`);
            const data = await response.json();
            if (data.error) {
              throw new Error(data.error);
            }
            return { category, data };
          })
        );

        // Combine all stats
        const combinedStats = {
          [team1]: allStats.flatMap(({ data }) => data[team1] || []),
          [team2]: allStats.flatMap(({ data }) => data[team2] || [])
        };

        if (combinedStats[team1].length === 0 || combinedStats[team2].length === 0) {
          throw new Error('No stats available for the selected teams');
        }

        setStats({ data: combinedStats });
        console.log('Combined stats:', combinedStats);

        // Get AI analysis for all stats
        try {
          const analysisResponse = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              category: 'all categories',
              team1Stats: combinedStats[team1],
              team2Stats: combinedStats[team2],
              team1: TEAMS[team1].name,
              team2: TEAMS[team2].name
            }),
          });
          
          if (!analysisResponse.ok) {
            const errorText = await analysisResponse.text();
            console.error('Analysis API error:', errorText);
            throw new Error('Failed to get analysis');
          }
          
          const analysisData: AnalysisResponse = await analysisResponse.json();
          console.log('Analysis data:', analysisData);
          
          if (analysisData.error) {
            console.error('Analysis error:', analysisData.error);
            throw new Error(analysisData.error);
          }
          
          setAnalysis(analysisData.summary || null);
        } finally {
          setAnalysisLoading(false);
        }
      } else {
        // Fetch single category
        const response = await fetch(`/api/stats?category=${categoryToUse}&team1=${team1}&team2=${team2}`);
        const responseData = await response.json();
        
        if (responseData.error) {
          throw new Error(responseData.error);
        }

        if (!responseData[team1] || !responseData[team2] || 
            responseData[team1].length === 0 || responseData[team2].length === 0) {
          throw new Error('No stats available for the selected category');
        }

        setStats({ data: responseData });
        console.log('Single category stats:', responseData);

        try {
          const analysisResponse = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              category: categoryToUse,
              team1Stats: responseData[team1],
              team2Stats: responseData[team2],
              team1: TEAMS[team1].name,
              team2: TEAMS[team2].name
            }),
          });

          if (!analysisResponse.ok) {
            const errorText = await analysisResponse.text();
            console.error('Analysis API error:', errorText);
            throw new Error('Failed to get analysis');
          }

          const analysisData: AnalysisResponse = await analysisResponse.json();
          console.log('Analysis data:', analysisData);
          
          if (analysisData.error) {
            console.error('Analysis error:', analysisData.error);
            throw new Error(analysisData.error);
          }
          
          setAnalysis(analysisData.summary || null);
        } finally {
          setAnalysisLoading(false);
        }
      }
    } catch (error) {
      console.error('Error generating stat:', error);
      setStats({ 
        error: error instanceof Error ? error.message : 'Failed to generate stats. Please try again.' 
      });
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  // Type guard function to check if stats data is valid
  const isValidStatsData = (stats: StatsResponse | null): stats is StatsResponse & { data: StatsData } => {
    return !!stats?.data && 
           !!stats.data[team1]?.length && 
           !!stats.data[team2]?.length;
  };

  return (
    <div className="w-full font-inter">
      <Card className="bg-white/5 backdrop-blur-lg border-white/10 shadow-2xl">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col items-center gap-4 sm:gap-6">
            {/* Team Selection */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full max-w-2xl justify-center items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Select
                value={team1}
                onValueChange={(value: string) => setTeam1(value as TeamKey)}
                disabled={loading}
              >
                <SelectTrigger className="w-full sm:w-64 bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TEAMS).map(([key, { name }]) => (
                    <SelectItem 
                      key={key} 
                      value={key}
                      disabled={key === team2}
                      className="cursor-pointer hover:bg-gray-100"
                    >
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="text-2xl font-bold text-white/80 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                vs
              </div>

              <Select
                value={team2}
                onValueChange={(value: string) => setTeam2(value as TeamKey)}
                disabled={loading}
              >
                <SelectTrigger className="w-full sm:w-64 bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TEAMS).map(([key, { name }]) => (
                    <SelectItem 
                      key={key} 
                      value={key}
                      disabled={key === team1}
                      className="cursor-pointer hover:bg-gray-100"
                    >
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>

            <motion.div
              className="w-full sm:w-72"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Select
                value={selectedCategory}
                onValueChange={(value: string) => handleCategoryChange(value)}
                disabled={loading}
              >
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {statCategories.map((category) => (
                    <SelectItem 
                      key={category.value} 
                      value={category.value}
                      className="cursor-pointer hover:bg-gray-100"
                    >
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-full sm:w-auto"
            >
              <Button
                onClick={() => generateStat()}
                disabled={loading}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Update Stats Comparison'
                )}
              </Button>
            </motion.div>

            <AnimatePresence>
              {loading && (
                <motion.div 
                  className="text-sm text-blue-400 text-center"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  Loading {selectedCategory === 'all' ? 'all categories' : statCategories.find(c => c.value === selectedCategory)?.label.toLowerCase()}...
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            {stats?.error ? (
              <motion.div 
                className="mt-8 bg-red-500/10 border border-red-500/20 rounded-xl p-4 sm:p-6 text-red-400 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {stats.error}
              </motion.div>
            ) : isValidStatsData(stats) ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-8"
              >
                <div className="grid grid-cols-2 gap-4 sm:gap-8">
                  {/* Team Headers */}
                  <div className="text-center">
                    <h3 
                      className="text-xl sm:text-2xl font-bold mb-2" 
                      style={{ color: TEAMS[team1].color }}
                    >
                      {TEAMS[team1].name}
                    </h3>
                  </div>
                  <div className="text-center">
                    <h3 
                      className="text-xl sm:text-2xl font-bold mb-2" 
                      style={{ color: TEAMS[team2].color }}
                    >
                      {TEAMS[team2].name}
                    </h3>
                  </div>

                  {/* AI Analysis */}
                  {analysisLoading && (
                    <Card className="col-span-2 bg-blue-500/10 border-blue-500/20">
                      <CardContent className="p-4 sm:p-6 flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <div className="text-center">
                          <p className="text-lg font-semibold text-blue-400">
                            Analyzing Statistics
                          </p>
                          <p className="text-sm text-blue-300">
                            Our AI is comparing team performances...
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {analysis && (
                    <Card className="col-span-2 bg-white/5 backdrop-blur-lg border-white/10">
                      <CardContent className="p-4 sm:p-6">
                        <div className="whitespace-pre-wrap text-gray-300 text-sm sm:text-base">
                          {analysis}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Stats Grid */}
                  <div className="col-span-2 mt-8">
                    <div className="space-y-4 sm:space-y-6">
                      {stats.data[team1].map((stat, index) => {
                        const team2Stat = stats.data[team2][index];
                        const comparison = compareStats(stat.value, team2Stat.value);
                        const team1Wins = comparison > 0;
                        const team2Wins = comparison < 0;
                        
                        return (
                          <Card key={`stat-${index}`} className="bg-white/5 backdrop-blur-lg border-white/10">
                            <CardHeader className="p-4 sm:p-6">
                              <CardTitle className="text-base sm:text-lg text-white">{stat.name}</CardTitle>
                              <CardDescription className="text-sm text-gray-400">
                                {stat.description}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                              <div className="grid grid-cols-2 gap-4">
                                <div 
                                  className={`p-3 sm:p-4 rounded-lg relative ${
                                    team1Wins ? 'bg-white/10 ring-2' : 'bg-white/5'
                                  }`}
                                  style={{ 
                                    borderColor: team1Wins ? TEAMS[team1].color : 'transparent'
                                  }}
                                >
                                  <div 
                                    className="text-lg sm:text-2xl font-bold text-center"
                                    style={{ 
                                      color: team1Wins ? TEAMS[team1].color : 'rgb(156, 163, 175)'
                                    }}
                                  >
                                    {stat.value}
                                    {team1Wins && (
                                      <ArrowUp className="absolute top-2 right-2 h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                                    )}
                                  </div>
                                </div>
                                <div 
                                  className={`p-3 sm:p-4 rounded-lg relative ${
                                    team2Wins ? 'bg-white/10 ring-2' : 'bg-white/5'
                                  }`}
                                  style={{ 
                                    borderColor: team2Wins ? TEAMS[team2].color : 'transparent'
                                  }}
                                >
                                  <div 
                                    className="text-lg sm:text-2xl font-bold text-center"
                                    style={{ 
                                      color: team2Wins ? TEAMS[team2].color : 'rgb(156, 163, 175)'
                                    }}
                                  >
                                    {team2Stat.value}
                                    {team2Wins && (
                                      <ArrowUp className="absolute top-2 right-2 h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
} 