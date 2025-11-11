import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { MapPin, TrendingUp, Network, Gauge, Plus, Truck, BookOpen, Sparkles, Bot, Brain, Calendar } from 'lucide-react';
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
}, {
  icon: Calendar,
  title: 'Production Planning',
  description: 'Capacity & Scheduling',
  route: '/production-planning',
  type: 'production' as const,
  color: 'production',
  gradient: 'var(--gradient-production)',
  comingSoon: true,
  aiFeature: 'Smart scheduling & capacity optimization'
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
      <div className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-r from-gfa/5 via-forecasting/5 to-inventory/5" />
        <div className="relative px-4 py-4">
          <div className="max-w-[1600px] mx-auto w-full">
            <div className="flex items-center justify-end gap-8">
              <div className="text-right">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gfa via-forecasting to-inventory bg-clip-text text-transparent">
                  JCG Supply Chain Optimization
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  AI-powered tools for supply chain management
                </p>
              </div>
              <Button 
                onClick={() => setCaseStudiesOpen(true)} 
                size="lg"
                className="hover:border-gfa bg-gradient-to-r from-gfa to-gfa/80 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <BookOpen className="h-5 w-5 mr-2" />
                Guides
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="px-6 py-6 max-w-[1600px] mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {tools.map((tool, index) => {
          const Icon = tool.icon;
          return <Card key={tool.title} className={`group relative overflow-hidden border-2 transition-all duration-300 ${tool.comingSoon ? 'opacity-70 cursor-not-allowed border-muted' : 'hover:shadow-xl hover:-translate-y-1 cursor-pointer border-border'}`} onClick={() => handleToolClick(tool)}>
                {!tool.comingSoon && <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{
              background: `linear-gradient(135deg, hsl(var(--${tool.color}) / 0.15), transparent)`
            }} />}
                
                <CardHeader className="relative z-10 pb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${tool.comingSoon ? 'bg-muted' : 'group-hover:scale-110'} transition-all`} style={!tool.comingSoon ? {
                  background: tool.gradient,
                  opacity: 0.2
                } : undefined}>
                      <Icon className={`h-6 w-6 ${tool.comingSoon ? 'text-muted-foreground' : ''}`} style={!tool.comingSoon ? {
                    color: `hsl(var(--${tool.color}))`
                  } : undefined} />
                    </div>
                    {tool.comingSoon && <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                        Coming Soon
                      </span>}
                  </div>
                  
                  <CardTitle className="text-lg mb-2">
                    {tool.title}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {tool.description}
                  </CardDescription>
                  {tool.aiFeature && <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Sparkles className="h-3 w-3" />
                      <span>{tool.aiFeature}</span>
                    </div>}
                </CardHeader>
                
                <CardContent className="relative z-10 pt-0">
                  <Button variant={tool.comingSoon ? "ghost" : "default"} className={`w-full transition-all ${tool.comingSoon ? '' : 'group-hover:shadow-md'}`} style={!tool.comingSoon ? {
                background: tool.gradient
              } : undefined} disabled={tool.comingSoon}>
                    <Plus className="h-4 w-4 mr-2" />
                    {tool.comingSoon ? 'Coming Soon' : 'Create Project'}
                  </Button>
                </CardContent>

                {!tool.comingSoon && <div className="absolute bottom-0 left-0 right-0 h-1 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" style={{
              background: tool.gradient
            }} />}
              </Card>;
        })}
        </div>

        {/* Bottom CTA Section */}
        <div className="relative mt-6 overflow-hidden rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
          <div className="absolute inset-0 bg-gradient-to-r from-gfa/5 via-forecasting/5 to-inventory/5" />
          <div className="relative px-6 py-4">
            <div className="max-w-3xl mx-auto text-center space-y-3">
              <h2 className="text-xl font-bold bg-gradient-to-r from-gfa via-forecasting to-inventory bg-clip-text text-transparent">
                Ready to Optimize Your Supply Chain?
              </h2>
              <p className="text-sm text-muted-foreground">
                Create your first project and experience AI-powered optimization
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Brain className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-medium">Smart Analysis</div>
                    <div className="text-xs text-muted-foreground">AI insights</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-secondary" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-medium">Interactive Assistant</div>
                    <div className="text-xs text-muted-foreground">Real-time guidance</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-accent" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-medium">Data-Driven</div>
                    <div className="text-xs text-muted-foreground">Optimize operations</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedTool && <CreateProjectDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} toolType={selectedTool.type} toolName={selectedTool.title} redirectTo={selectedTool.route} />}
      
      <CaseStudiesDialog open={caseStudiesOpen} onOpenChange={setCaseStudiesOpen} />
    </div>;
};
export default Dashboard;