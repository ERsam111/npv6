import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MapPin, TrendingUp, Network, Gauge, ArrowRight, CheckCircle2, BarChart3, Zap, Clock, Truck, Target, Users, Shield, Lightbulb, Mail, Linkedin, Twitter, Github, Quote, Sparkles, Brain, MessageSquare, Calendar, Menu, X } from "lucide-react";
import { useState } from "react";

const Index = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const features = [{
    icon: MapPin,
    title: "GFA",
    description: "Green Field Analysis",
    details: "Optimize facility placement with advanced location intelligence and cost-to-serve analysis. Built-in assistant helps you interpret results and make data-driven decisions",
    route: "/gfa",
    color: "primary",
    aiFeature: "Smart recommendations & interactive insights"
  }, {
    icon: TrendingUp,
    title: "Demand Forecasting",
    description: "Predictive Analytics",
    details: "Leverage statistical models and machine learning for accurate demand planning with intelligent pattern recognition",
    route: "/demand-forecasting",
    color: "secondary",
    aiFeature: "Automated anomaly detection"
  }, {
    icon: Network,
    title: "Network Analysis",
    description: "JCG Supply Chain Optimization",
    details: "Visualize and optimize your entire supply network with real-time flow analysis",
    route: "/network",
    color: "accent",
    comingSoon: true,
    aiFeature: "Intelligent optimization"
  }, {
    icon: Gauge,
    title: "Simulation-based Inventory",
    description: "Monte Carlo Optimization",
    details: "Service-level aware inventory policies using advanced stochastic modeling and simulation",
    route: "/inventory-optimization-v2",
    color: "primary",
    aiFeature: "Smart recommendations"
  }, {
    icon: Truck,
    title: "Transportation Optimization",
    description: "Route & Load Planning",
    details: "Optimize transportation with intelligent routing, load optimization, and logistics planning",
    route: "/transportation",
    color: "secondary",
    comingSoon: true,
    aiFeature: "Intelligent route planning"
  }, {
    icon: Calendar,
    title: "Production Planning",
    description: "Capacity & Scheduling",
    details: "Optimize production schedules, capacity planning, and resource allocation with intelligent scheduling algorithms",
    route: "/production-planning",
    color: "accent",
    comingSoon: true,
    aiFeature: "Smart scheduling & capacity optimization"
  }];
  const benefits = ["Multi-echelon optimization", "Real-time insights", "Interactive assistant", "Smart decision support"];
  
  const navItems = [
    { name: "Features", href: "#features" },
    { name: "About Us", href: "#about" },
    { name: "Pricing", href: "#pricing" },
    { name: "Contact", href: "#contact" }
  ];

  return <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gfa-green to-network-blue flex items-center justify-center">
                <Network className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-gfa-green to-network-blue bg-clip-text text-transparent">
                OptimiWare
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.name}
                </a>
              ))}
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
              <Button onClick={() => navigate("/auth")} className="shadow-lg">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background/95 backdrop-blur-lg">
            <div className="px-4 py-4 space-y-3">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="block px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </a>
              ))}
              <div className="pt-3 space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => {
                    navigate("/auth");
                    setMobileMenuOpen(false);
                  }}
                >
                  Sign In
                </Button>
                <Button 
                  className="w-full shadow-lg" 
                  onClick={() => {
                    navigate("/auth");
                    setMobileMenuOpen(false);
                  }}
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="features" className="relative overflow-hidden border-b">
        {/* Animated Mesh Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gfa-green/10 via-forecasting-purple/10 to-network-blue/10" />
        <div className="absolute inset-0 opacity-40" style={{
          background: 'radial-gradient(circle at 20% 50%, hsl(142 70% 45% / 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 30%, hsl(270 65% 55% / 0.15) 0%, transparent 50%), radial-gradient(circle at 40% 80%, hsl(220 85% 55% / 0.15) 0%, transparent 50%)'
        }} />
        
        {/* Floating Orbs */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-br from-gfa-green/30 to-transparent rounded-full blur-3xl animate-orb" />
        <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-br from-forecasting-purple/30 to-transparent rounded-full blur-3xl animate-orb" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-gradient-to-br from-network-blue/30 to-transparent rounded-full blur-3xl animate-orb" style={{ animationDelay: '4s' }} />
        <div className="absolute bottom-40 right-1/4 w-96 h-96 bg-gradient-to-br from-inventory-orange/20 to-transparent rounded-full blur-3xl animate-orb" style={{ animationDelay: '6s' }} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 animate-fade-in">
              <Sparkles className="h-4 w-4" />
              <span>AI-Powered Supply Chain Intelligence</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-fade-in">
              <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                Optimize Your Supply Chain
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-muted-foreground mb-12 leading-relaxed animate-fade-in">
              Advanced analytics platform with intelligent assistant for network design, demand planning, and inventory optimization
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in">
              <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all" onClick={() => navigate("/auth")}>
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
            </div>

            {/* Benefits Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
              {benefits.map((benefit, index) => <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground bg-card/50 backdrop-blur-sm rounded-lg p-3 border">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-left">{benefit}</span>
                </div>)}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Brain className="h-4 w-4" />
            <span>AI-Enhanced Tools</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Integrated Supply Chain Suite</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            End-to-end optimization tools with built-in assistant to guide your analysis
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => {
          const Icon = feature.icon;
          return <Card key={index} className={`group relative overflow-hidden border-2 transition-all duration-300 bg-card/80 backdrop-blur-sm ${feature.comingSoon ? "opacity-75 cursor-not-allowed" : "hover:border-primary/50 hover:shadow-2xl hover:-translate-y-1 cursor-pointer"}`} onClick={() => !feature.comingSoon && navigate("/auth")}>
                {feature.comingSoon && <div className="absolute top-4 right-4 z-10">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-primary">Coming Soon</span>
                    </div>
                  </div>}

                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <CardHeader className="relative pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-4 rounded-xl bg-${feature.color}/10 text-${feature.color} transition-transform duration-300 shadow-sm ${!feature.comingSoon && "group-hover:scale-110"}`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    {!feature.comingSoon && <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />}
                  </div>
                  <CardTitle className="text-2xl mb-1">{feature.title}</CardTitle>
                  <CardDescription className="text-base font-medium text-primary/70">
                    {feature.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="relative">
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{feature.details}</p>
                  <div className="flex items-center gap-2 text-xs text-primary/80 mb-6 bg-primary/5 rounded-lg p-3">
                    
                    <span>{feature.aiFeature}</span>
                  </div>
                  <Button variant="ghost" className={`w-full justify-between ${feature.comingSoon ? "cursor-not-allowed" : "group-hover:bg-primary/10"} transition-colors`} disabled={feature.comingSoon}>
                    {feature.comingSoon ? "Coming Soon" : "Launch Tool"}
                    {!feature.comingSoon && <ArrowRight className="h-4 w-4 ml-2" />}
                  </Button>
                </CardContent>
              </Card>;
        })}
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative border-t overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gfa-green/5 via-forecasting-purple/5 to-network-blue/5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <BarChart3 className="h-8 w-8 mx-auto text-primary mb-3" />
              <div className="text-4xl font-bold text-primary">6</div>
              <div className="text-sm text-muted-foreground">Optimization Modules</div>
            </div>
            <div className="space-y-2">
              <MessageSquare className="h-8 w-8 mx-auto text-secondary mb-3" />
              <div className="text-4xl font-bold text-secondary">Assistant</div>
              <div className="text-sm text-muted-foreground">Interactive Support</div>
            </div>
            <div className="space-y-2">
              <Network className="h-8 w-8 mx-auto text-accent mb-3" />
              <div className="text-4xl font-bold text-accent">Multi-Echelon</div>
              <div className="text-sm text-muted-foreground">Network Analysis</div>
            </div>
            <div className="space-y-2">
              <Gauge className="h-8 w-8 mx-auto text-primary mb-3" />
              <div className="text-4xl font-bold text-primary">Real-Time</div>
              <div className="text-sm text-muted-foreground">Simulation Engine</div>
            </div>
          </div>
        </div>
      </section>


      {/* Value Propositions / About Us */}
      <section id="about" className="relative border-y overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-forecasting-purple/8 via-background to-network-blue/8" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-inventory-orange/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-br from-gfa-green/10 to-transparent rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Why Choose Our Platform</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Intelligent assistant meets enterprise-grade supply chain optimization
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[{
            icon: MessageSquare,
            title: "Interactive Assistant",
            description: "Ask questions in plain English and get instant insights. The assistant understands supply chain context and provides intelligent recommendations",
            color: "primary"
          }, {
            icon: Brain,
            title: "Smart Analysis & Insights",
            description: "Automatically analyzes your data, identifies patterns, and surfaces actionable insights you might miss",
            color: "secondary"
          }, {
            icon: Sparkles,
            title: "Advanced Optimization",
            description: "Sophisticated algorithms work behind the scenes to optimize every aspect of your supply chain operations",
            color: "accent"
          }].map((item, index) => {
            const Icon = item.icon;
            return <Card key={index} className="border-2 hover:border-primary/50 transition-all hover:shadow-xl">
                  <CardHeader>
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 shadow-lg" style={{
                  background: item.color === 'primary' ? 'linear-gradient(to bottom right, hsl(var(--primary)), hsl(var(--primary) / 0.7))' : item.color === 'secondary' ? 'linear-gradient(to bottom right, hsl(var(--secondary)), hsl(var(--secondary) / 0.7))' : 'linear-gradient(to bottom right, hsl(var(--accent)), hsl(var(--accent) / 0.7))'
                }}>
                    <Icon className="h-7 w-7 text-white" />
                    </div>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>;
          })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Success Stories</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See how our platform transforms supply chain decisions
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[{
          quote: "The assistant helped us identify cost savings opportunities we never saw before. Reduced network costs by 23% in the first quarter just by asking the right questions.",
          author: "Sarah Chen",
          role: "Supply Chain Director",
          company: "Global Manufacturing Co."
        }, {
          quote: "Instead of digging through spreadsheets, I just ask questions. The demand forecasting insights have become essential to our planning process.",
          author: "Michael Rodriguez",
          role: "Operations Manager",
          company: "Retail Distribution Inc."
        }, {
          quote: "The interactive assistant makes complex analysis simple. I can ask 'what if' questions and get instant recommendations for inventory policies.",
          author: "Emily Watson",
          role: "Logistics Head",
          company: "E-commerce Solutions Ltd."
        }].map((testimonial, index) => <Card key={index} className="relative border-2 hover:border-primary/30 transition-all">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                <Quote className="h-6 w-6 text-white" />
              </div>
              <CardContent className="pt-8">
                <p className="text-muted-foreground italic mb-6">"{testimonial.quote}"</p>
                <div className="border-t pt-4">
                  <p className="font-semibold">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  <p className="text-sm text-primary">{testimonial.company}</p>
                </div>
              </CardContent>
            </Card>)}
        </div>
      </section>

      {/* FAQ Section / Pricing Info */}
      <section id="pricing" className="relative border-t overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-bl from-transport-indigo/5 via-background to-production-teal/5" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about our platform
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border rounded-lg px-6 bg-card">
              <AccordionTrigger className="text-left font-semibold">
                What types of supply chain problems can this platform solve?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Our platform addresses comprehensive supply chain challenges including facility location optimization (GFA), 
                demand forecasting using advanced statistical models, multi-echelon network design, inventory optimization 
                with Monte Carlo simulations, and transportation routing. Each module is designed to work independently or 
                as part of an integrated solution.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border rounded-lg px-6 bg-card">
              <AccordionTrigger className="text-left font-semibold">
                How does the assistant work?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                The assistant is built into every tool and understands supply chain context. Simply ask questions in plain 
                English like "Which customers are unprofitable?" or "How can I reduce transportation costs?" It analyzes 
                your data in real-time and provides intelligent recommendations, identifies patterns, and helps you make 
                data-driven decisions. No technical expertise required – just have a conversation.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border rounded-lg px-6 bg-card">
              <AccordionTrigger className="text-left font-semibold">
                How do I import my data into the system?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Data import is flexible and straightforward. You can upload Excel/CSV files directly through our interface, 
                use our template files to ensure proper formatting, or connect to your existing ERP/WMS systems via API. 
                The platform automatically validates your data and provides feedback on any formatting issues.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border rounded-lg px-6 bg-card">
              <AccordionTrigger className="text-left font-semibold">
                Is my data secure?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Absolutely. We use enterprise-grade encryption for data at rest and in transit, implement strict access 
                controls, and maintain compliance with industry security standards. Your data is isolated in secure 
                environments, and we never share it with third parties. Regular security audits ensure ongoing protection.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border rounded-lg px-6 bg-card">
              <AccordionTrigger className="text-left font-semibold">
                Can I export the results and recommendations?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes. All analysis results, visualizations, and recommendations can be exported in multiple formats including 
                Excel, PDF reports, and CSV files. You can also save scenarios for future comparison and share interactive 
                dashboards with stakeholders.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="border rounded-lg px-6 bg-card">
              <AccordionTrigger className="text-left font-semibold">
                What kind of support do you provide?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                We offer comprehensive support including detailed documentation, video tutorials, case studies, and email 
                support. Premium plans include dedicated account managers and consultation services to help you maximize 
                the value from our platform.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-gradient-to-br from-primary via-secondary to-primary bg-[#1b9da4]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
            Ready to Optimize Your Supply Chain?
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Join supply chain professionals who are already transforming their operations with data-driven optimization
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" onClick={() => navigate("/auth")} className="text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all bg-[#166ac6]/[0.29]">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="text-lg px-8 py-6 border-2 border-white text-white bg-[#307eac]">
              View Case Studies
            </Button>
          </div>
        </div>
      </section>

      {/* Footer / Contact */}
      <footer id="contact" className="border-t bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">JCG Supply Chain Intelligence</h3>
              <p className="text-sm text-muted-foreground">
                Advanced analytics platform for network design, demand planning, and inventory optimization.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/gfa" className="hover:text-primary transition-colors">GFA</a></li>
                <li><a href="/demand-forecasting" className="hover:text-primary transition-colors">Demand Forecasting</a></li>
                <li><a href="/network" className="hover:text-primary transition-colors">Network Analysis</a></li>
                <li><a href="/inventory-optimization-v2" className="hover:text-primary transition-colors">Inventory Optimization</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Case Studies</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Support</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 JCG Supply Chain Intelligence. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>;
};
export default Index;