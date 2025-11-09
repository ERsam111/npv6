import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { MapPin, TrendingUp, Network, Gauge, Plus, Truck, BookOpen, Sparkles, Bot, Brain } from 'lucide-react';
import { useProjects } from '@/contexts/ProjectContext';
import { useState } from 'react';
import { CreateProjectDialog } from '@/components/CreateProjectDialog';
import { CaseStudiesDialog } from '@/components/CaseStudiesDialog';
const tools = [{
  icon: MapPin,
  title: 'GFA',
  description: 'Green Field Analysis',
  route: '/gfa',
  type: 'gfa' as const,
  color: 'gfa',
  gradient: 'var(--gradient-gfa)',
  aiFeature: 'Interactive assistant & smart insights'
}, {
  icon: TrendingUp,
  title: 'Demand Forecasting',
  description: 'Predictive Analytics',
  route: '/demand-forecasting',
  type: 'forecasting' as const,
  color: 'forecasting',
  gradient: 'var(--gradient-forecasting)',
  aiFeature: 'Automated forecasting'
}, {
  icon: Network,
  title: 'Network Analysis',
  description: 'JCG Supply Chain Optimization',
  route: '/network',
  type: 'network' as const,
  color: 'network',
  gradient: 'var(--gradient-network)',
  comingSoon: true,
  aiFeature: 'Intelligent optimization'
}, {
  icon: Gauge,
  title: 'Inventory Optimization',
  description: 'Monte Carlo Optimization',
  route: '/inventory-optimization-v2',
  type: 'inventory' as const,
  color: 'inventory',
  gradient: 'var(--gradient-inventory)',
  aiFeature: 'Smart recommendations'
}, {
  icon: Truck,
  title: 'Transportation Optimization',
  description: 'Route & Load Planning',
  route: '/transportation',
  type: 'transportation' as const,
  color: 'transport',
  gradient: 'var(--gradient-transport)',
  comingSoon: true,
  aiFeature: 'Intelligent routing'
}];
const Dashboard = () => {
  const navigate = useNavigate();
  const {
    projects
  } = useProjects();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [caseStudiesOpen, setCaseStudiesOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<typeof tools[0] | null>(null);
  const handleToolClick = (tool: typeof tools[0]) => {
    if (tool.comingSoon) return;
    setSelectedTool(tool);
    setCreateDialogOpen(true);
  };
  return <div className="min-h-full bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gfa/10 via-forecasting/10 to-inventory/10 animate-gradient" />
        <div className="relative px-6 py-8 md:py-10">
          <div className="max-w-4xl mx-auto">
            <div className="text-center space-y-6 animate-fade-in">
              <div className="flex justify-center mb-4 gap-3">
                <Button onClick={() => setCaseStudiesOpen(true)} variant="outline" size="lg" className="group hover:border-gfa hover:bg-gfa/5">
                  <BookOpen className="h-5 w-5 mr-2 text-gfa group-hover:scale-110 transition-transform" />
                  Case Studies & User Guides
                </Button>
              </div>
              
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 animate-fade-in">
                <Sparkles className="h-4 w-4" />
                <span>AI-Powered Platform</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-gfa via-forecasting to-inventory bg-clip-text text-transparent animate-gradient pb-2 leading-tight">
                JCG Supply Chain Optimization
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mt-6">
                Advanced tools with interactive assistant to streamline operations and provide intelligent insights
              </p>
              
              {/* Benefits */}
              <div className="flex flex-wrap justify-center gap-4 mt-8">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border text-sm">
                  <Bot className="h-4 w-4 text-primary" />
                  <span>Interactive Assistant</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border text-sm">
                  <Brain className="h-4 w-4 text-secondary" />
                  <span>Smart Analysis</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border text-sm">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span>Auto Insights</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="px-6 pb-20 max-w-7xl mx-auto">
        <div className="mb-3">

          
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool, index) => {
          const Icon = tool.icon;
          return <Card key={tool.title} className={`group relative overflow-hidden border-2 transition-all duration-300 animate-fade-in ${tool.comingSoon ? 'opacity-75 cursor-not-allowed border-muted' : `hover:shadow-2xl hover:border-${tool.color} hover:-translate-y-1 cursor-pointer border-border`}`} style={{
            animationDelay: `${index * 100}ms`
          }} onClick={() => handleToolClick(tool)}>
                {/* Gradient Overlay */}
                {!tool.comingSoon && <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{
              background: `linear-gradient(135deg, hsl(var(--${tool.color}-teal-light) / 0.3), transparent)`
            }} />}
                
                <CardHeader className="relative z-10 pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`h-14 w-14 rounded-xl flex items-center justify-center transition-all duration-300 ${tool.comingSoon ? 'bg-muted' : `bg-${tool.color}-light group-hover:scale-110 group-hover:shadow-lg`}`} style={!tool.comingSoon ? {
                  background: tool.gradient,
                  opacity: 0.2
                } : undefined}>
                      <Icon className={`h-7 w-7 ${tool.comingSoon ? 'text-muted-foreground' : `text-${tool.color}`}`} style={!tool.comingSoon ? {
                    color: `hsl(var(--${tool.color}))`
                  } : undefined} />
                    </div>
                    {tool.comingSoon && <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                        Coming Soon
                      </span>}
                  </div>
                  
                  <CardTitle className={`text-xl mb-2 transition-colors ${tool.comingSoon ? '' : `group-hover:text-${tool.color}`}`} style={!tool.comingSoon ? {} : undefined}>
                    {tool.title}
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {tool.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="relative z-10 pt-0">
                  {!tool.comingSoon}
                  <Button variant={tool.comingSoon ? "ghost" : "default"} className={`w-full transition-all duration-300 ${tool.comingSoon ? 'cursor-not-allowed' : `group-hover:shadow-md`}`} style={!tool.comingSoon ? {
                background: tool.gradient
              } : undefined} disabled={tool.comingSoon}>
                    <Plus className="h-4 w-4 mr-2" />
                    {tool.comingSoon ? 'Coming Soon' : 'Create Project'}
                  </Button>
                </CardContent>

                {/* Bottom border accent */}
                {!tool.comingSoon && <div className="absolute bottom-0 left-0 right-0 h-1 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" style={{
              background: tool.gradient
            }} />}
              </Card>;
        })}
        </div>
      </div>

      {selectedTool && <CreateProjectDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} toolType={selectedTool.type} toolName={selectedTool.title} redirectTo={selectedTool.route} />}
      
      <CaseStudiesDialog open={caseStudiesOpen} onOpenChange={setCaseStudiesOpen} />
    </div>;
};
export default Dashboard;