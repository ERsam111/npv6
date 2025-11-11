import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Factory, Clock, Users, Package, TrendingUp, AlertCircle, CheckCircle2, Sparkles, Brain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const ProductionPlanning = () => {
  const [activeView, setActiveView] = useState<'schedule' | 'capacity' | 'resources'>('schedule');

  const metrics = [
    { label: 'Capacity Utilization', value: '87%', icon: Factory, color: 'text-primary' },
    { label: 'On-Time Delivery', value: '94%', icon: CheckCircle2, color: 'text-green-500' },
    { label: 'Active Orders', value: '23', icon: Package, color: 'text-blue-500' },
    { label: 'Resource Efficiency', value: '91%', icon: Users, color: 'text-purple-500' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Calendar className="h-6 w-6 text-accent" />
                Production Planning
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Optimize production schedules and capacity allocation
              </p>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              AI-Powered Scheduling
            </Badge>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <Card key={index} className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Icon className={`h-5 w-5 ${metric.color}`} />
                    <span className="text-2xl font-bold">{metric.value}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* View Selector */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeView === 'schedule' ? 'default' : 'outline'}
            onClick={() => setActiveView('schedule')}
          >
            <Clock className="h-4 w-4 mr-2" />
            Production Schedule
          </Button>
          <Button
            variant={activeView === 'capacity' ? 'default' : 'outline'}
            onClick={() => setActiveView('capacity')}
          >
            <Factory className="h-4 w-4 mr-2" />
            Capacity Planning
          </Button>
          <Button
            variant={activeView === 'resources' ? 'default' : 'outline'}
            onClick={() => setActiveView('resources')}
          >
            <Users className="h-4 w-4 mr-2" />
            Resource Allocation
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Panel */}
          <div className="lg:col-span-2">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {activeView === 'schedule' && <><Clock className="h-5 w-5" /> Production Schedule</>}
                  {activeView === 'capacity' && <><Factory className="h-5 w-5" /> Capacity Analysis</>}
                  {activeView === 'resources' && <><Users className="h-5 w-5" /> Resource Management</>}
                </CardTitle>
                <CardDescription>
                  {activeView === 'schedule' && 'View and optimize production timelines'}
                  {activeView === 'capacity' && 'Analyze and plan production capacity'}
                  {activeView === 'resources' && 'Allocate and manage production resources'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Sample Schedule Items */}
                  {[
                    { product: 'Product A', status: 'In Progress', progress: 65, due: '2 days' },
                    { product: 'Product B', status: 'Scheduled', progress: 20, due: '5 days' },
                    { product: 'Product C', status: 'Planning', progress: 5, due: '7 days' }
                  ].map((item, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{item.product}</h4>
                          <p className="text-sm text-muted-foreground">Due in {item.due}</p>
                        </div>
                        <Badge
                          variant={item.status === 'In Progress' ? 'default' : 'secondary'}
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <Progress value={item.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">{item.progress}% Complete</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Assistant Card */}
            <Card className="border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-background">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5 text-accent" />
                  AI Assistant
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-card rounded-lg p-3 border">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Optimization Tip</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Shift Product B to Line 3 to improve efficiency by 12%
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-card rounded-lg p-3 border">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Capacity Alert</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Line 2 approaching 95% capacity next week
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Production
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Package className="h-4 w-4 mr-2" />
                  Create Order
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Factory className="h-4 w-4 mr-2" />
                  Manage Lines
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionPlanning;
