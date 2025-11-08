import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2, Trash2, Mic, MicOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Customer, Product, DistributionCenter, OptimizationSettings } from "@/types/gfa";
import { useScenarios } from "@/contexts/ScenarioContext";
import { getSoundEffects } from "@/utils/soundEffects";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface DataSupportPanelProps {
  customers: Customer[];
  products: Product[];
  dcs: DistributionCenter[];
  settings: OptimizationSettings;
  costBreakdown?: {
    totalCost: number;
    transportationCost: number;
    facilityCost: number;
    numSites: number;
  };
}

export function DataSupportPanel({ customers, products, dcs, settings, costBreakdown }: DataSupportPanelProps) {
  const { currentScenario } = useScenarios();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const MAX_MESSAGES = 50; // 10 prompts = 10 user + 10 assistant messages

  // Load messages from database when scenario changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!currentScenario) {
        setMessages([]);
        return;
      }

      const { data, error } = await supabase
        .from("data_support_messages")
        .select("*")
        .eq("scenario_id", currentScenario.id)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(
          data.map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })),
        );
      }
    };

    loadMessages();
  }, [currentScenario]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (!currentScenario) {
      toast.error("Please select a scenario first");
      return;
    }

    if (customers.length === 0) {
      toast.error("Please add customer data first");
      return;
    }

    // Check message limit
    if (messages.length >= MAX_MESSAGES) {
      toast.error("Maximum 50 prompts reached. Clear chat to continue.");
      return;
    }

    // Play sent sound
    try {
      getSoundEffects().playSentSound();
    } catch (error) {
      console.log("Could not play sound:", error);
    }

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Save user message to database
      const { error: saveUserError } = await supabase.from("data_support_messages").insert({
        scenario_id: currentScenario.id,
        role: "user",
        content: userMessage.content,
      });

      if (saveUserError) throw saveUserError;

      const { data, error } = await supabase.functions.invoke("gfa-data-support", {
        body: {
          question: userMessage.content,
          context: {
            customers,
            products,
            dcs,
            settings,
            costBreakdown,
          },
          model: selectedModel,
        },
      });

      // Handle rate limit and payment errors
      if (error) {
        // Check for specific error types from edge function
        if (data?.error) {
          if (data.error.includes("Rate limit exceeded")) {
            toast.error("Rate limit exceeded. Please wait a moment and try again.");
            setMessages((prev) => prev.slice(0, -1));
            setIsLoading(false);
            return;
          }
          if (data.error.includes("Payment required") || data.error.includes("add credits")) {
            toast.error("Lovable AI credits exhausted. Please add credits to your workspace.");
            setMessages((prev) => prev.slice(0, -1));
            setIsLoading(false);
            return;
          }
          if (data.error.includes("Invalid") && data.error.includes("API key")) {
            toast.error("Lovable AI configuration error. Please contact support.");
            setMessages((prev) => prev.slice(0, -1));
            setIsLoading(false);
            return;
          }
        }
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.answer,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Play received sound
      try {
        getSoundEffects().playReceivedSound();
      } catch (error) {
        console.log("Could not play sound:", error);
      }

      // Save assistant message to database
      await supabase.from("data_support_messages").insert({
        scenario_id: currentScenario.id,
        role: "assistant",
        content: assistantMessage.content,
      });
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to get response");
      // Remove the user message if request failed
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = async () => {
    if (!currentScenario) return;

    try {
      // Delete all messages for this scenario
      const { error } = await supabase.from("data_support_messages").delete().eq("scenario_id", currentScenario.id);

      if (error) throw error;

      setMessages([]);
      toast.success("Chat cleared");
    } catch (error) {
      console.error("Error clearing chat:", error);
      toast.error("Failed to clear chat");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Recording started");
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Failed to start recording. Please check microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsTranscribing(true);
      toast.info("Processing audio...");
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        const { data, error } = await supabase.functions.invoke('transcribe-audio', {
          body: { audio: base64Audio }
        });

        setIsTranscribing(false);

        if (error) {
          console.error("Transcription error:", error);
          toast.error("Failed to transcribe audio");
          return;
        }

        if (data?.error) {
          console.error("Transcription error:", data.error);
          toast.error(data.error);
          return;
        }

        if (data?.text) {
          // Play success sound
          try {
            getSoundEffects().playSuccessSound();
          } catch (error) {
            console.log("Could not play sound:", error);
          }

          setInput(data.text);
          toast.success("Sending message...");
          
          // Auto-send the transcribed message after a brief delay
          setTimeout(() => {
            // Simulate button click by calling handleSend
            const sendEvent = new Event('submit');
            handleSendVoiceMessage(data.text);
          }, 500);
        }
      };
    } catch (error) {
      console.error("Error transcribing audio:", error);
      setIsTranscribing(false);
      toast.error("Failed to transcribe audio");
    }
  };

  // Special handler for voice messages that bypasses input field
  const handleSendVoiceMessage = async (transcribedText: string) => {
    if (!transcribedText.trim() || isLoading) return;

    if (!currentScenario) {
      toast.error("Please select a scenario first");
      return;
    }

    if (customers.length === 0) {
      toast.error("Please add customer data first");
      return;
    }

    // Check message limit
    if (messages.length >= MAX_MESSAGES) {
      toast.error("Maximum 50 prompts reached. Clear chat to continue.");
      return;
    }

    // Play sent sound
    try {
      getSoundEffects().playSentSound();
    } catch (error) {
      console.log("Could not play sound:", error);
    }

    const userMessage: Message = { role: "user", content: transcribedText.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput(""); // Clear input
    setIsLoading(true);

    try {
      // Save user message to database
      const { error: saveUserError } = await supabase.from("data_support_messages").insert({
        scenario_id: currentScenario.id,
        role: "user",
        content: userMessage.content,
      });

      if (saveUserError) throw saveUserError;

      const { data, error } = await supabase.functions.invoke("gfa-data-support", {
        body: {
          question: userMessage.content,
          context: {
            customers,
            products,
            dcs,
            settings,
            costBreakdown,
          },
          model: selectedModel,
        },
      });

      // Handle rate limit and payment errors
      if (error) {
        if (data?.error) {
          if (data.error.includes("Rate limit exceeded")) {
            toast.error("Rate limit exceeded. Please wait a moment and try again.");
            setMessages((prev) => prev.slice(0, -1));
            setIsLoading(false);
            return;
          }
          if (data.error.includes("Payment required") || data.error.includes("add credits")) {
            toast.error("Lovable AI credits exhausted. Please add credits to your workspace.");
            setMessages((prev) => prev.slice(0, -1));
            setIsLoading(false);
            return;
          }
          if (data.error.includes("Invalid") && data.error.includes("API key")) {
            toast.error("Lovable AI configuration error. Please contact support.");
            setMessages((prev) => prev.slice(0, -1));
            setIsLoading(false);
            return;
          }
        }
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.answer,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Play received sound
      try {
        getSoundEffects().playReceivedSound();
      } catch (error) {
        console.log("Could not play sound:", error);
      }

      // Save assistant message to database
      await supabase.from("data_support_messages").insert({
        scenario_id: currentScenario.id,
        role: "assistant",
        content: assistantMessage.content,
      });
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to get response");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const promptCount = Math.floor(messages.length / 2);

  return (
    <Card className="h-[calc(100vh-280px)] flex flex-col shadow-lg border-primary/20">
      <CardHeader className="border-b border-border/50 pb-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Bot className="h-5 w-5" />
              Data Support Assistant
            </CardTitle>
            <CardDescription className="mt-1">
              Ask questions about your data, optimization results, and city information
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearChat} className="h-8">
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-[240px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast & Cheap) ⭐</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Legacy Cheap)</SelectItem>
                <SelectItem value="gpt-4o">GPT-4o (Balanced)</SelectItem>
                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                <SelectItem value="gpt-4">GPT-4 (Capable)</SelectItem>
                <SelectItem value="gpt-4.1-2025-04-14">GPT-4.1 (Latest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <Bot className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
              <p className="text-sm text-muted-foreground max-w-md">Ask questions like:</p>
              <ul className="text-sm text-muted-foreground mt-3 space-y-1 max-w-md">
                <li>• How many customers do I have?</li>
                <li>• What's the total demand across all products?</li>
                <li>• Which country has the most customers?</li>
                <li>• Show me the cost breakdown</li>
                <li>• What's the population of [nearest city]?</li>
                <li>• What are the real estate rates in [city]?</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div key={index} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="max-w-[80%] rounded-lg px-4 py-3 bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-border/50 p-4 bg-muted/30 shrink-0">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isTranscribing
                  ? "Transcribing audio..."
                  : promptCount >= 10
                  ? "Maximum prompts reached. Clear chat to continue."
                  : "Ask a question or use voice input..."
              }
              disabled={isLoading || promptCount >= 10 || isTranscribing}
              className="flex-1"
            />
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading || promptCount >= 10 || isTranscribing}
              variant={isRecording ? "destructive" : "outline"}
              className="shrink-0"
              title={isRecording ? "Stop recording" : "Start voice input"}
            >
              {isTranscribing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isRecording ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || promptCount >= 10 || isTranscribing}
              className="shrink-0"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
