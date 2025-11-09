import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Trash2, Mic, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { HistoricalDataPoint, ForecastResult, ForecastGranularity } from "@/types/forecasting";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ForecastingDataSupportProps {
  historicalData: HistoricalDataPoint[];
  forecastResults: ForecastResult[];
  selectedProduct: string;
  selectedCustomer: string;
  granularity: ForecastGranularity;
  forecastPeriods: number;
  modelParams: Record<string, any>;
  currentScenario: any;
  outlierAnalysis?: {
    count: number;
    method: string;
    lowerThreshold: number;
    upperThreshold: number;
  };
}

export function ForecastingDataSupport({
  historicalData,
  forecastResults,
  selectedProduct,
  selectedCustomer,
  granularity,
  forecastPeriods,
  modelParams,
  currentScenario,
  outlierAnalysis
}: ForecastingDataSupportProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState("google/gemini-2.5-flash");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (currentScenario?.id) {
      loadMessages();
    }
  }, [currentScenario?.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    if (!currentScenario?.id) return;

    const { data, error } = await (supabase as any)
      .from("data_support_messages")
      .select("*")
      .eq("scenario_id", currentScenario.id)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })));
    }
  };

  const buildComprehensiveContext = () => {
    const uniqueCustomers = Array.from(new Set(historicalData.map(d => d.customer)));
    const uniqueProducts = Array.from(new Set(historicalData.map(d => d.product)));
    
    const dates = historicalData.map(d => d.date).sort((a, b) => a.getTime() - b.getTime());
    const startDate = dates[0]?.toISOString().split('T')[0];
    const endDate = dates[dates.length - 1]?.toISOString().split('T')[0];

    const demandByMonth = new Map<string, number>();
    historicalData.forEach(d => {
      const monthKey = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}`;
      demandByMonth.set(monthKey, (demandByMonth.get(monthKey) || 0) + d.demand);
    });

    const monthlyDemands = Array.from(demandByMonth.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const maxDemandMonth = monthlyDemands.reduce((max, curr) => curr[1] > max[1] ? curr : max, ['', 0]);
    const minDemandMonth = monthlyDemands.reduce((min, curr) => curr[1] < min[1] ? curr : min, ['', Infinity]);

    const productDemand = new Map<string, number>();
    historicalData.forEach(d => {
      productDemand.set(d.product, (productDemand.get(d.product) || 0) + d.demand);
    });

    const totalDemand = historicalData.reduce((sum, d) => sum + d.demand, 0);
    const avgDemand = totalDemand / historicalData.length;

    let context = `# DEMAND FORECASTING DATA CONTEXT\n\n`;
    
    context += `## INPUT DATA SUMMARY\n`;
    context += `- **Total Data Points**: ${historicalData.length}\n`;
    context += `- **Number of Customers**: ${uniqueCustomers.length}\n`;
    context += `- **Number of Products**: ${uniqueProducts.length}\n`;
    context += `- **Date Range**: ${startDate} to ${endDate}\n`;
    context += `- **Total Demand**: ${Math.round(totalDemand)}\n`;
    context += `- **Average Demand per Data Point**: ${Math.round(avgDemand)}\n\n`;

    context += `### Customers:\n${uniqueCustomers.map(c => `- ${c}`).join('\n')}\n\n`;
    context += `### Products:\n${uniqueProducts.map(p => `- ${p}`).join('\n')}\n\n`;

    context += `### Demand by Product:\n`;
    productDemand.forEach((demand, product) => {
      context += `- **${product}**: ${Math.round(demand)} units (${((demand/totalDemand)*100).toFixed(1)}% of total)\n`;
    });

    context += `\n### Monthly Demand Trends:\n`;
    context += `- **Highest Demand Month**: ${maxDemandMonth[0]} with ${Math.round(maxDemandMonth[1])} units\n`;
    context += `- **Lowest Demand Month**: ${minDemandMonth[0]} with ${Math.round(minDemandMonth[1])} units\n\n`;

    if (outlierAnalysis) {
      context += `## OUTLIER ANALYSIS\n`;
      context += `- **Detection Method**: ${outlierAnalysis.method}\n`;
      context += `- **Outliers Detected**: ${outlierAnalysis.count} data points\n`;
      context += `- **Lower Threshold**: ${Math.round(outlierAnalysis.lowerThreshold)}\n`;
      context += `- **Upper Threshold**: ${Math.round(outlierAnalysis.upperThreshold)}\n\n`;
    }

    context += `## CURRENT CONFIGURATION\n`;
    context += `- **Selected Product**: ${selectedProduct || 'Not selected'}\n`;
    context += `- **Selected Customer**: ${selectedCustomer === 'all' ? 'All Customers' : selectedCustomer}\n`;
    context += `- **Forecast Granularity**: ${granularity}\n`;
    context += `- **Forecast Horizon**: ${forecastPeriods} ${granularity === 'daily' ? 'days' : granularity === 'weekly' ? 'weeks' : 'months'}\n\n`;

    if (forecastResults.length > 0) {
      context += `## FORECASTING MODELS & RESULTS\n\n`;
      
      forecastResults.forEach(result => {
        context += `### ${result.modelName}\n`;
        context += `- **Model ID**: ${result.modelId}\n`;
        context += `- **MAPE (Mean Absolute Percentage Error)**: ${result.mape.toFixed(2)}%\n`;
        context += `- **Recommended**: ${result.isRecommended ? 'Yes ⭐' : 'No'}\n`;
        
        const params = modelParams[result.modelId];
        if (params) {
          context += `- **Parameters**:\n`;
          Object.entries(params).forEach(([key, value]) => {
            context += `  - ${key}: ${value}\n`;
          });
        }

        const avgForecast = result.predictions.reduce((sum, p) => sum + p.predicted, 0) / result.predictions.length;
        context += `- **Average Forecast Value**: ${Math.round(avgForecast)}\n`;
        context += `- **First 3 Predictions**: ${result.predictions.slice(0, 3).map(p => Math.round(p.predicted)).join(', ')}\n`;
        context += `- **Last 3 Predictions**: ${result.predictions.slice(-3).map(p => Math.round(p.predicted)).join(', ')}\n\n`;
      });

      const bestModel = forecastResults.reduce((best, curr) => curr.mape < best.mape ? curr : best);
      context += `### Best Model (Lowest MAPE)\n`;
      context += `- **${bestModel.modelName}** with ${bestModel.mape.toFixed(2)}% MAPE\n\n`;
    }

    context += `## AVAILABLE MODELS INFORMATION\n`;
    context += `1. **Moving Average**: Simple average of recent periods. Window parameter controls how many periods to average.\n`;
    context += `2. **Exponential Smoothing**: Weighted average giving more weight to recent observations. Alpha parameter controls smoothing level (0-1).\n`;
    context += `3. **Weighted Moving Average**: Similar to moving average but with different weights for each period.\n`;
    context += `4. **Seasonal Naive**: Uses historical seasonal patterns. Season length parameter defines the seasonality cycle.\n`;
    context += `5. **Holt-Winters**: Advanced method handling trend and seasonality. Alpha, beta, gamma parameters control level, trend, and seasonality smoothing.\n`;
    context += `6. **Random Forest**: Machine learning ensemble method. Number of trees and window size affect prediction accuracy.\n`;
    context += `7. **ARIMA**: Statistical method using AutoRegressive Integrated Moving Average. p, d, q parameters control model complexity.\n\n`;

    return context;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (messages.length >= 100) {
      toast({ title: "Message limit reached", description: "Please clear chat to continue", variant: "destructive" });
      return;
    }

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    const newUserMessage: Message = { role: "user", content: userMessage };
    setMessages(prev => [...prev, newUserMessage]);

    if (currentScenario?.id) {
      await (supabase as any).from("data_support_messages").insert({
        scenario_id: currentScenario.id,
        role: "user",
        content: userMessage
      });
    }

    try {
      const context = buildComprehensiveContext();
      
      const { data, error } = await supabase.functions.invoke('gfa-data-support', {
        body: {
          question: userMessage,
          context: { comprehensiveContext: context },
          model
        }
      });

      if (error) throw error;

      const assistantMessage: Message = { role: "assistant", content: data.answer };
      setMessages(prev => [...prev, assistantMessage]);

      if (currentScenario?.id) {
        await (supabase as any).from("data_support_messages").insert({
          scenario_id: currentScenario.id,
          role: "assistant",
          content: data.answer
        });
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to get response",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (currentScenario?.id) {
      await (supabase as any)
        .from("data_support_messages")
        .delete()
        .eq("scenario_id", currentScenario.id);
    }
    setMessages([]);
    toast({ title: "Chat cleared" });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      };
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        const { data, error } = await supabase.functions.invoke('transcribe-audio', {
          body: { audio: base64Audio }
        });

        if (error) throw error;
        
        setInput(data.text);
        toast({ title: "Transcription complete" });
      };
    } catch (error: any) {
      toast({ title: "Transcription failed", description: error.message, variant: "destructive" });
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">Forecasting Data Assistant</CardTitle>
            <CardDescription>Ask questions about your data, models, and results</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleClearChat}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
                <SelectItem value="openai/gpt-5">GPT-5</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-3 p-4">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask about your data, models, or results..."
            disabled={isLoading || isTranscribing || messages.length >= 100}
            className="flex-1"
          />
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            variant={isRecording ? "destructive" : "outline"}
            size="icon"
            disabled={isLoading || isTranscribing}
            className="relative"
          >
            {isRecording ? (
              <>
                <Square className="h-4 w-4" />
                <div className="absolute inset-0 flex items-end justify-center pb-1">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="w-0.5 bg-white rounded-full animate-pulse"
                        style={{
                          height: `${Math.random() * 8 + 4}px`,
                          animationDelay: `${i * 100}ms`,
                          animationDuration: '0.8s'
                        }}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          <Button onClick={handleSend} disabled={!input.trim() || isLoading || isTranscribing}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
