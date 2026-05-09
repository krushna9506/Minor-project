import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  LinearProgress,
  CircularProgress,
  Alert,
  Snackbar,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  RadioGroup,
  FormControlLabel,
} from '@mui/material';
import {
  Psychology as AIIcon,
  TrendingUp as OptimizeIcon,
  Analytics as AnalysisIcon,
  Lightbulb as SuggestIcon,
  Chat as QueryIcon,
  CheckCircle as ValidateIcon,
  Speed as EfficiencyIcon,
  School as ComplianceIcon,
  AutoAwesome as MagicIcon,
  ExpandMore as ExpandMoreIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
  PlayArrow as RunIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import timetableService, { type Timetable } from '../../services/timetableService';

// Types for AI features
interface OptimizationResult {
  timetable_id: string;
  optimization_result: string;
  optimized: boolean;
  timestamp: string;
  efficiency_improvement?: number;
  conflicts_resolved?: number;
}

interface Suggestion {
  title: string;
  description: string;
  impact_level: 'high' | 'medium' | 'low';
  implementation_difficulty: 'easy' | 'medium' | 'hard';
  expected_benefit: string;
  category?: string;
}

interface AnalysisResult {
  timetable_id: string;
  analysis_type: string;
  efficiency_score: number;
  analysis_details: string;
  analyzed_at: string;
  metrics?: {
    faculty_workload: number;
    room_utilization: number;
    student_satisfaction: number;
    conflict_count: number;
  };
}

interface ComplianceResult {
  timetable_id: string;
  nep_compliance_score: number;
  compliance_details: string;
  validation_date: string;
  recommendations: string[];
  issues?: Array<{
    category: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
  }>;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`ai-tabpanel-${index}`}
      aria-labelledby={`ai-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AIOptimization: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedTimetable, setSelectedTimetable] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Optimization states
  const [optimizationGoals, setOptimizationGoals] = useState({
    efficiency: true,
    conflicts: true,
    workload: true,
    nep_compliance: true,
  });
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [optimizationProgress, setOptimizationProgress] = useState(0);

  // Suggestions states
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // Analysis states
  const [analysisType, setAnalysisType] = useState('comprehensive');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Natural Language Query states
  const [query, setQuery] = useState('');
  const [queryResponse, setQueryResponse] = useState('');
  const [queryHistory, setQueryHistory] = useState<Array<{ query: string, response: string }>>([]);

  // Compliance states
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);

  // Timetables state
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  
  // Optimized timetable versions
  const [optimizedVersions, setOptimizedVersions] = useState<Timetable[]>([]);
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string>('');

  const loadTimetables = async () => {
    try {
      setLoading(true);
      console.log('🔄 AIOptimization - Loading timetables...');
      const data = await timetableService.getAllTimetables();
      console.log('✅ AIOptimization - Loaded timetables:', data);
      console.log('📊 Total timetables:', data.length);
      
      // Map _id to id if needed (MongoDB returns _id, frontend expects id)
      const mappedData = data.map((tt: any) => ({
        ...tt,
        id: tt.id || tt._id || ''
      }));
      
      // Show all timetables in dropdown (don't filter out optimized ones)
      // Just track optimized versions separately for the versions dialog
      const optimizedTimetables = mappedData.filter((tt: Timetable) => 
        tt.title?.toLowerCase().includes('optimized') || 
        tt.metadata?.generation_method?.includes('optimized')
      );
      
      console.log('📊 Optimized versions:', optimizedTimetables.length);
      console.log('📊 Original timetables:', mappedData.length - optimizedTimetables.length);
      
      setTimetables(mappedData); // Show ALL timetables in dropdown
      setOptimizedVersions(optimizedTimetables);

      // Auto-select first if available and none selected
      if (mappedData.length > 0 && !selectedTimetable) {
        console.log('👉 AIOptimization - Auto-selecting first timetable:', mappedData[0].id);
        setSelectedTimetable(mappedData[0].id);
      } else if (mappedData.length === 0) {
        console.warn('⚠️ AIOptimization - No timetables found.');
        if (selectedTimetable) setSelectedTimetable('');
      }
    } catch (err) {
      console.error('❌ AIOptimization - Failed to load timetables:', err);
      setError('Failed to load available timetables. Make sure you are logged in and the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Load timetables on mount
  useEffect(() => {
    loadTimetables();
  }, []);

  // Focus areas for suggestions
  const availableFocusAreas = [
    'Faculty Workload',
    'Room Utilization',
    'Student Gaps',
    'NEP Compliance',
    'Resource Optimization',
    'Conflict Resolution',
  ];

  // Run optimization
  const runOptimization = async () => {
    if (!selectedTimetable) {
      setError('Please select a timetable to optimize');
      return;
    }

    setLoading(true);
    setOptimizationProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setOptimizationProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 500);

    try {
      const result = await timetableService.getAIOptimization(selectedTimetable);

      // Transform result to match UI state if needed, or stick to backend response structure
      // For now, assuming backend returns data matching OptimizationResult partially
      const transformedResult: OptimizationResult = {
        timetable_id: selectedTimetable,
        optimization_result: JSON.stringify(result, null, 2), // Store full result as string for display
        optimized: true,
        timestamp: new Date().toISOString(),
        efficiency_improvement: result.efficiency_improvement || 15,
        conflicts_resolved: result.conflicts_resolved || 0,
      };

      setOptimizationResult(transformedResult);
      setOptimizationProgress(100);
      setSuccess('Timetable optimization completed successfully!');
    } catch (err) {
      console.error(err);
      setError('Optimization failed. Please try again.');
    } finally {
      setLoading(false);
      clearInterval(progressInterval);
    }
  };

  // Get suggestions
  const getSuggestions = async () => {
    if (!selectedTimetable) {
      setError('Please select a timetable for suggestions');
      return;
    }

    setLoading(true);
    try {
      const result = await timetableService.getAISuggestions(selectedTimetable);
      // Assuming result.suggestions is an array
      setSuggestions(result.suggestions || []);
      setSuccess('AI suggestions generated successfully!');
    } catch (err) {
      console.error(err);
      setError('Failed to generate suggestions');
    } finally {
      setLoading(false);
    }
  };

  // Run analysis
  const runAnalysis = async () => {
    if (!selectedTimetable) {
      setError('Please select a timetable to analyze');
      return;
    }

    setLoading(true);
    try {
      const result = await timetableService.getAIAnalysis(selectedTimetable);

      const mappedResult: AnalysisResult = {
        timetable_id: selectedTimetable,
        analysis_type: analysisType,
        efficiency_score: result.efficiency_score || 0,
        analysis_details: result.analysis_details || "Analysis completed.",
        analyzed_at: new Date().toISOString(),
        metrics: result.metrics || {
          faculty_workload: 0,
          room_utilization: 0,
          student_satisfaction: 0,
          conflict_count: 0,
        }
      };

      setAnalysisResult(mappedResult);
      setSuccess('Analysis completed successfully!');
    } catch (err) {
      console.error(err);
      setError('Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  // Process natural language query with AI ChatBot
  const processQuery = async () => {
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    setLoading(true);
    try {
      // Call the AI Chat API
      const response = await timetableService.queryAI(query, {
        timetable_id: selectedTimetable || undefined,
        active_tab: activeTab,
        optimization_goals: optimizationGoals
      });

      const aiResponse = response.response || 'I apologize, but I could not process your request at this time.';

      setQueryResponse(aiResponse);
      setQueryHistory(prev => [...prev, { query, response: aiResponse }]);
      setQuery('');
      setSuccess('AI response received!');
    } catch (err) {
      console.error('AI Chat error:', err);
      setError('AI chat processing failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Validate NEP compliance
  const validateCompliance = async () => {
    if (!selectedTimetable) {
      setError('Please select a timetable to validate');
      return;
    }

    setLoading(true);
    try {
      // Call the real AI compliance API
      const result = await timetableService.getAICompliance(selectedTimetable);

      const mappedCompliance: ComplianceResult = {
        timetable_id: selectedTimetable,
        nep_compliance_score: result.nep_compliance_score || 0,
        compliance_details: result.compliance_details || "Analysis completed.",
        validation_date: new Date().toISOString(),
        recommendations: result.recommendations || [],
        issues: result.issues || []
      };

      setComplianceResult(mappedCompliance);
      setSuccess('NEP compliance validation completed!');
    } catch (err) {
      console.error('Compliance validation error:', err);
      setError('Compliance validation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getImpactColor = (level: string) => {
    switch (level) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'hard': return 'error';
      case 'medium': return 'warning';
      case 'easy': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AIIcon color="primary" />
          AI Optimization
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Leverage AI to optimize timetables, analyze efficiency, and ensure NEP 2020 compliance
        </Typography>
      </Box>

      {/* Timetable Selection */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1 }}>
            <FormControl sx={{ minWidth: 350, flexGrow: 1 }}>
              <InputLabel id="timetable-select-label">Select Timetable</InputLabel>
              <Select
                labelId="timetable-select-label"
                id="timetable-select"
                value={selectedTimetable || ''}
                label="Select Timetable"
                onChange={(e) => {
                  const value = e.target.value as string;
                  console.log('Timetable selected:', value);
                  setSelectedTimetable(value);
                }}
                disabled={loading}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: 400,
                      zIndex: 9999,
                    }
                  }
                }}
              >
                {timetables.length === 0 ? (
                  <MenuItem disabled value="">
                    <em>No timetables available</em>
                  </MenuItem>
                ) : (
                  timetables.map((tt) => (
                    <MenuItem key={tt.id} value={tt.id}>
                      <Box sx={{ py: 0.5 }}>
                        <Typography variant="body1" fontWeight={500}>
                          {tt.title || `Timetable ${tt.academic_year || ''}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {tt.program_id ? `Program: ${tt.program_id.substring(0, 8)}...` : 'No Program'} • {tt.academic_year || 'N/A'}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            <Button
              startIcon={<RefreshIcon />}
              onClick={loadTimetables}
              variant="outlined"
              size="large"
              sx={{ height: 56 }}
              disabled={loading}
            >
              Refresh
            </Button>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={selectedTimetable ? "Timetable Selected" : "No Timetable Selected"}
              color={selectedTimetable ? "success" : "default"}
              icon={selectedTimetable ? <CheckCircleIcon /> : <InfoIcon />}
            />
            {optimizedVersions.length > 0 && (
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                onClick={() => setShowVersionDialog(true)}
              >
                {optimizedVersions.length} Optimized Version{optimizedVersions.length > 1 ? 's' : ''}
              </Button>
            )}
            {timetables.length === 0 && !loading && (
              <Alert severity="info" sx={{ py: 0, alignItems: 'center' }}>
                No timetables found. Go to "Create Timetable" to create one.
              </Alert>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Main Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<OptimizeIcon />} label="Optimize" />
          <Tab icon={<SuggestIcon />} label="Suggestions" />
          <Tab icon={<AnalysisIcon />} label="Analysis" />
          <Tab icon={<QueryIcon />} label="AI Chat" />
          <Tab icon={<ValidateIcon />} label="NEP Compliance" />
        </Tabs>
      </Paper>

      {/* Optimize Tab */}
      <TabPanel value={activeTab} index={0}>
        <Stack spacing={3}>
          {/* Optimization Goals */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SettingsIcon />
                Optimization Goals
              </Typography>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  {Object.entries(optimizationGoals).map(([key, value]) => (
                    <Chip
                      key={key}
                      label={key.replace('_', ' ').toUpperCase()}
                      color={value ? 'primary' : 'default'}
                      onClick={() => setOptimizationGoals(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                      clickable
                    />
                  ))}
                </Stack>
              </Stack>
            </CardContent>
            <CardActions>
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <RunIcon />}
                onClick={runOptimization}
                disabled={loading || !selectedTimetable}
                size="large"
              >
                {loading ? 'Optimizing...' : 'Run AI Optimization'}
              </Button>
            </CardActions>
          </Card>

          {/* Progress */}
          {loading && optimizationProgress > 0 && (
            <Card>
              <CardContent>
                <Typography variant="body2" gutterBottom>
                  Optimization Progress: {optimizationProgress}%
                </Typography>
                <LinearProgress variant="determinate" value={optimizationProgress} />
              </CardContent>
            </Card>
          )}

          {/* Optimization Results */}
          {optimizationResult && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MagicIcon />
                  Optimization Results
                </Typography>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
                  <Paper sx={{ p: 2, textAlign: 'center', flex: 1 }}>
                    <Typography variant="h3" color="success.main">
                      {optimizationResult.efficiency_improvement}%
                    </Typography>
                    <Typography variant="body2">Efficiency Improvement</Typography>
                  </Paper>
                  <Paper sx={{ p: 2, textAlign: 'center', flex: 1 }}>
                    <Typography variant="h3" color="primary.main">
                      {optimizationResult.conflicts_resolved}
                    </Typography>
                    <Typography variant="body2">Conflicts Resolved</Typography>
                  </Paper>
                </Stack>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Detailed Results</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                      {optimizationResult.optimization_result}
                    </pre>
                  </AccordionDetails>
                </Accordion>
              </CardContent>
              <CardActions>
                <Button startIcon={<DownloadIcon />}>Download Report</Button>
                <Button startIcon={<RefreshIcon />} onClick={runOptimization}>
                  Re-optimize
                </Button>
              </CardActions>
            </Card>
          )}
        </Stack>
      </TabPanel>

      {/* Suggestions Tab */}
      <TabPanel value={activeTab} index={1}>
        <Stack spacing={3}>
          {/* Focus Areas Selection */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Focus Areas</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {availableFocusAreas.map(area => (
                  <Chip
                    key={area}
                    label={area}
                    color={focusAreas.includes(area) ? 'primary' : 'default'}
                    onClick={() => setFocusAreas(prev =>
                      prev.includes(area)
                        ? prev.filter(a => a !== area)
                        : [...prev, area]
                    )}
                    clickable
                  />
                ))}
              </Stack>
            </CardContent>
            <CardActions>
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <SuggestIcon />}
                onClick={getSuggestions}
                disabled={loading || !selectedTimetable}
              >
                {loading ? 'Generating...' : 'Get AI Suggestions'}
              </Button>
            </CardActions>
          </Card>

          {/* Suggestions List */}
          {suggestions.length > 0 && (
            <Stack spacing={2}>
              {suggestions.map((suggestion, index) => (
                <Card key={index}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="start" sx={{ mb: 1 }}>
                      <Typography variant="h6">{suggestion.title}</Typography>
                      <Stack direction="row" spacing={1}>
                        <Chip
                          label={`Impact: ${suggestion.impact_level}`}
                          color={getImpactColor(suggestion.impact_level) as any}
                          size="small"
                        />
                        <Chip
                          label={`Difficulty: ${suggestion.implementation_difficulty}`}
                          color={getDifficultyColor(suggestion.implementation_difficulty) as any}
                          size="small"
                        />
                      </Stack>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {suggestion.description}
                    </Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                      Expected Benefit: {suggestion.expected_benefit}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      </TabPanel>

      {/* Analysis Tab */}
      <TabPanel value={activeTab} index={2}>
        <Stack spacing={3}>
          {/* Analysis Configuration */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Analysis Configuration</Typography>
              <FormControl fullWidth>
                <InputLabel>Analysis Type</InputLabel>
                <Select
                  value={analysisType}
                  label="Analysis Type"
                  onChange={(e) => setAnalysisType(e.target.value)}
                >
                  <MenuItem value="comprehensive">Comprehensive Analysis</MenuItem>
                  <MenuItem value="efficiency">Efficiency Focus</MenuItem>
                  <MenuItem value="compliance">Compliance Focus</MenuItem>
                  <MenuItem value="resource">Resource Utilization</MenuItem>
                </Select>
              </FormControl>
            </CardContent>
            <CardActions>
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <AnalysisIcon />}
                onClick={runAnalysis}
                disabled={loading || !selectedTimetable}
              >
                {loading ? 'Analyzing...' : 'Run Analysis'}
              </Button>
            </CardActions>
          </Card>

          {/* Analysis Results */}
          {analysisResult && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EfficiencyIcon />
                  Analysis Results
                </Typography>

                {/* Score Display */}
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Typography variant="h2" color="primary.main">
                    {analysisResult.efficiency_score}%
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    Overall Efficiency Score
                  </Typography>
                </Box>

                {/* Metrics */}
                {analysisResult.metrics && (
                  <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                    {Object.entries(analysisResult.metrics).map(([key, value]) => (
                      <Paper key={key} sx={{ p: 2, textAlign: 'center', minWidth: 120, flex: 1, backgroundColor: 'background.paper', border: 1, borderColor: 'divider' }}>
                        <Typography variant="h5" color="secondary.main">
                          {key === 'conflict_count' ? value : `${value}%`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {key.replace('_', ' ').toUpperCase()}
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                )}

                <Typography variant="body1">
                  {analysisResult.analysis_details}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Stack>
      </TabPanel>

      {/* AI Chat Tab */}
      <TabPanel value={activeTab} index={3}>
        <Stack spacing={3}>
          {/* Query Input */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <QueryIcon />
                Ask AI Assistant
              </Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  fullWidth
                  placeholder="Ask me about timetable optimization, NEP 2020 compliance, or scheduling best practices..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !loading && processQuery()}
                  multiline
                  rows={3}
                />
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                  onClick={processQuery}
                  disabled={loading || !query.trim()}
                  sx={{ minWidth: 120 }}
                >
                  {loading ? 'Processing...' : 'Send'}
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Current Response */}
          {queryResponse && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>AI Response</Typography>
                <Paper sx={{ p: 2, backgroundColor: 'background.paper', border: 1, borderColor: 'divider' }}>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {queryResponse}
                  </Typography>
                </Paper>
              </CardContent>
            </Card>
          )}

          {/* Query History */}
          {queryHistory.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Recent Conversations</Typography>
                <Stack spacing={2} sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {queryHistory.slice(-5).reverse().map((item, index) => (
                    <Box key={index}>
                      <Paper sx={{ p: 2, backgroundColor: 'primary.main', color: 'primary.contrastText' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          You: {item.query}
                        </Typography>
                      </Paper>
                      <Paper sx={{ p: 2, mt: 1, backgroundColor: 'background.paper', border: 1, borderColor: 'divider' }}>
                        <Typography variant="body2">
                          AI: {item.response}
                        </Typography>
                      </Paper>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      </TabPanel>

      {/* NEP Compliance Tab */}
      <TabPanel value={activeTab} index={4}>
        <Stack spacing={3}>
          {/* Validation Control */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ComplianceIcon />
                NEP 2020 Compliance Validation
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Validate your timetable against National Education Policy 2020 guidelines
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <ValidateIcon />}
                onClick={validateCompliance}
                disabled={loading || !selectedTimetable}
                size="large"
              >
                {loading ? 'Validating...' : 'Validate NEP Compliance'}
              </Button>
            </CardActions>
          </Card>

          {/* Compliance Results */}
          {complianceResult && (
            <Stack spacing={2}>
              {/* Score Card */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Compliance Score</Typography>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h2" color="primary.main">
                      {complianceResult.nep_compliance_score}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      NEP 2020 Compliance Level
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={complianceResult.nep_compliance_score}
                    sx={{ mt: 2 }}
                  />
                </CardContent>
              </Card>

              {/* Issues */}
              {complianceResult.issues && complianceResult.issues.length > 0 && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Compliance Issues</Typography>
                    <List>
                      {complianceResult.issues.map((issue, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            {issue.severity === 'high' ? (
                              <ErrorIcon color="error" />
                            ) : issue.severity === 'medium' ? (
                              <WarningIcon color="warning" />
                            ) : (
                              <InfoIcon color="info" />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={issue.category}
                            secondary={issue.description}
                          />
                          <Chip
                            label={issue.severity.toUpperCase()}
                            color={
                              issue.severity === 'high' ? 'error' :
                                issue.severity === 'medium' ? 'warning' : 'info'
                            }
                            size="small"
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Recommendations</Typography>
                  <List>
                    {complianceResult.recommendations.map((rec, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <SuggestIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText primary={rec} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Stack>
          )}
        </Stack>
      </TabPanel>

      {/* Optimized Versions Selection Dialog */}
      <Dialog
        open={showVersionDialog}
        onClose={() => setShowVersionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Select Optimized Timetable Version</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Multiple optimized versions of this timetable are available. Select which version to use:
          </Typography>
          <RadioGroup
            value={selectedVersion}
            onChange={(e) => setSelectedVersion(e.target.value)}
          >
            {optimizedVersions.length === 0 ? (
              <Alert severity="info">No optimized versions available yet.</Alert>
            ) : (
              optimizedVersions.map((tt, index) => (
                <Paper key={tt.id} sx={{ p: 2, mb: 1, bgcolor: 'background.default' }}>
                  <FormControlLabel 
                    value={tt.id} 
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="subtitle2">
                          {tt.title || `Optimized Version ${index + 1}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Created: {new Date(tt.created_at || '').toLocaleDateString()} • 
                          Score: {tt.optimization_score ? (tt.optimization_score * 100).toFixed(1) : 'N/A'}%
                        </Typography>
                        {tt.metadata?.nep_compliance_score && (
                          <Chip 
                            size="small" 
                            label={`NEP: ${tt.metadata.nep_compliance_score}%`}
                            color="success"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Box>
                    }
                  />
                </Paper>
              ))
            )}
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowVersionDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              if (selectedVersion) {
                setSelectedTimetable(selectedVersion);
                setShowVersionDialog(false);
                setSuccess('Optimized timetable version selected!');
              }
            }}
            disabled={!selectedVersion}
          >
            Select Version
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbars - Positioned to avoid sidebar */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ 
          mt: 8, // Below navbar
          mr: 2,
          '& .MuiSnackbar-root': {
            left: 'auto',
            right: '24px',
          }
        }}
      >
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ 
          mt: 8,
          mr: 2,
          '& .MuiSnackbar-root': {
            left: 'auto',
            right: '24px',
          }
        }}
      >
        <Alert severity="error" onClose={() => setError('')} sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AIOptimization;
